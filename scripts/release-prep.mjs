#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));

if (args.help) {
	printHelp();
	process.exit(0);
}

const pkgSlug = requireArg(args, "package");
const summary = requireArg(args, "summary");
const releaseDate = requireArg(args, "date");
const dryRun = Boolean(args["dry-run"]);
const publishFlow = args["publish-flow"] ?? "github release";

if (!/^\d{4}-\d{2}-\d{2}$/u.test(releaseDate)) {
	fail("--date must be in YYYY-MM-DD format.");
}

const canonPackages = readCanonPackageSlugs();
if (!canonPackages.includes(pkgSlug)) {
	fail(`Package slug "${pkgSlug}" is not in docs/PLUGIN_PACKAGE_CANON.md.`);
}

const packageDir = resolve(root, pkgSlug);
const packageJsonPath = resolve(packageDir, "package.json");
const pluginJsonPath = resolve(packageDir, "openclaw.plugin.json");

if (!existsSync(packageJsonPath) || !existsSync(pluginJsonPath)) {
	fail(`Missing manifest files for package "${pkgSlug}".`);
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const pluginJson = JSON.parse(readFileSync(pluginJsonPath, "utf8"));
const currentVersion = packageJson.version;

if (typeof currentVersion !== "string" || typeof pluginJson.version !== "string") {
	fail("Missing string version fields in package.json or openclaw.plugin.json.");
}

const targetVersion = resolveTargetVersion(currentVersion, args.version, args.bump);
const releaseDir = resolve(root, "docs", "releases", pkgSlug);
const releasePath = resolve(releaseDir, `v${targetVersion}.md`);
if (existsSync(releasePath)) {
	fail(`Release note file already exists: ${releasePath}`);
}

const tagName = args.tag ?? `${pkgSlug}/v${targetVersion}`;
const sourceCommit = args["source-commit"] ?? "";
const prRef = args.pr ?? "";
const packageName = typeof packageJson.name === "string" ? packageJson.name : "";

if (!packageName) {
	fail(`Missing package.json name for package "${pkgSlug}".`);
}

const releaseBody = buildReleaseNote({
	packageName,
	pkgSlug,
	targetVersion,
	releaseDate,
	tagName,
	publishFlow,
	sourceCommit,
	prRef,
	summary,
});

const updatesVersionFiles = targetVersion !== currentVersion;
const changedFiles = updatesVersionFiles
	? [packageJsonPath, pluginJsonPath, releasePath]
	: [releasePath];

if (dryRun) {
	printSummary({
		pkgSlug,
		currentVersion,
		targetVersion,
		releasePath,
		changedFiles,
		dryRun,
	});
	process.exit(0);
}

mkdirSync(releaseDir, { recursive: true });
if (updatesVersionFiles) {
	packageJson.version = targetVersion;
	pluginJson.version = targetVersion;
	writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, "\t")}\n`);
	writeFileSync(pluginJsonPath, `${JSON.stringify(pluginJson, null, "\t")}\n`);
}
writeFileSync(releasePath, releaseBody);

printSummary({
	pkgSlug,
	currentVersion,
	targetVersion,
	releasePath,
	changedFiles,
	dryRun,
});

function parseArgs(argv) {
	const parsed = {};
	for (let index = 0; index < argv.length; index += 1) {
		const entry = argv[index];
		if (!entry.startsWith("--")) {
			fail(`Unexpected argument: ${entry}`);
		}
		const key = entry.slice(2);
		if (key === "dry-run" || key === "help") {
			parsed[key] = true;
			continue;
		}
		const value = argv[index + 1];
		if (!value || value.startsWith("--")) {
			fail(`Missing value for --${key}`);
		}
		parsed[key] = value;
		index += 1;
	}
	return parsed;
}

function requireArg(parsed, key) {
	const value = parsed[key];
	if (typeof value !== "string" || value.length === 0) {
		fail(`Missing required --${key}`);
	}
	return value;
}

function readCanonPackageSlugs() {
	const canonPath = resolve(root, "docs", "PLUGIN_PACKAGE_CANON.md");
	const contents = readFileSync(canonPath, "utf8");
	return Array.from(contents.matchAll(/- `([^`/]+)\/`/gu), (match) => match[1]);
}

function resolveTargetVersion(currentVersion, explicitVersion, bumpType) {
	if (explicitVersion && bumpType) {
		fail("Use either --version or --bump, not both.");
	}
	if (explicitVersion) {
		validateSemver(explicitVersion);
		return explicitVersion;
	}
	if (!bumpType) {
		fail("Missing --version or --bump.");
	}
	validateSemver(currentVersion);
	const [major, minor, patch] = currentVersion.split(".").map(Number);
	switch (bumpType) {
		case "patch":
			return `${major}.${minor}.${patch + 1}`;
		case "minor":
			return `${major}.${minor + 1}.0`;
		case "major":
			return `${major + 1}.0.0`;
		default:
			fail(`Unsupported --bump value "${bumpType}". Use patch, minor, or major.`);
	}
}

function validateSemver(version) {
	if (!/^\d+\.\d+\.\d+$/u.test(version)) {
		fail(`Version "${version}" must be simple semver in X.Y.Z form.`);
	}
}

function buildReleaseNote({
	packageName,
	pkgSlug,
	targetVersion,
	releaseDate,
	tagName,
	publishFlow,
	sourceCommit,
	prRef,
	summary,
}) {
	const needsClawHubWorksheet = /clawhub/iu.test(publishFlow);
	const verificationLines = ["- `pnpm check`"];
	if (needsClawHubWorksheet) {
		verificationLines.push(`- \`clawhub package publish ./${pkgSlug} --dry-run\``);
	}
	const operatorCopyTarget = needsClawHubWorksheet
		? "GitHub Release or ClawHub"
		: "GitHub Release";
	const publishResultClawHub = needsClawHubWorksheet
		? "- ClawHub publish status:"
		: "- ClawHub publish status: not requested";

	return `# ${pkgSlug} v${targetVersion}

- Package: \`${packageName}\`
- Slug: \`${pkgSlug}\`
- Version: \`${targetVersion}\`
- Release date: \`${releaseDate}\`
- Tag: \`${tagName}\`
- Tag commit:
- GitHub Release URL:
- GitHub notes mode: \`tracked file only\`
- Publish flow: \`${publishFlow}\`
- ClawHub worksheet: ${needsClawHubWorksheet ? "" : "not requested"}
- Source commit: ${sourceCommit}
- PR: ${prRef}

## Summary

- ${summary}

## Verification

${verificationLines.join("\n")}

## Operator Copy

Short release note text for ${operatorCopyTarget}:

\`\`\`text
${pkgSlug} v${targetVersion}

- ${summary}
\`\`\`

## Publish Result

- GitHub Release status:
${publishResultClawHub}
- Operator notes:
`;
}

function printSummary({ pkgSlug, currentVersion, targetVersion, releasePath, changedFiles, dryRun }) {
	const prefix = dryRun ? "DRY RUN" : "UPDATED";
	console.log(`${prefix}: ${pkgSlug}`);
	console.log(`Version: ${currentVersion} -> ${targetVersion}`);
	console.log(`Release note: ${releasePath}`);
	console.log("Files:");
	for (const file of changedFiles) {
		console.log(`- ${file}`);
	}
}

function printHelp() {
	console.log(`Usage:
  node scripts/release-prep.mjs --package <slug> (--version <x.y.z> | --bump <patch|minor|major>) --date <yyyy-mm-dd> --summary "<text>" [--publish-flow <flow>] [--source-commit <sha>] [--pr <ref>] [--tag <name>] [--dry-run]
`);
	console.log("Default publish flow: github release");
}

function fail(message) {
	console.error(`release-prep: ${message}`);
	process.exit(1);
}
