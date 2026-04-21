#!/usr/bin/env node

import { execFileSync } from "node:child_process";
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
const releaseDir = resolve(root, "docs", "releases", pkgSlug);
const releaseIndexPath = resolve(releaseDir, "README.md");

if (!existsSync(packageJsonPath) || !existsSync(pluginJsonPath)) {
	fail(`Missing manifest files for package "${pkgSlug}".`);
}

if (!existsSync(releaseIndexPath)) {
	fail(`Missing release ledger README for package "${pkgSlug}".`);
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const pluginJson = JSON.parse(readFileSync(pluginJsonPath, "utf8"));
const currentVersion = packageJson.version;

if (typeof currentVersion !== "string" || typeof pluginJson.version !== "string") {
	fail("Missing string version fields in package.json or openclaw.plugin.json.");
}

const targetVersion = resolveTargetVersion(currentVersion, args.version, args.bump);
const releasePath = resolve(releaseDir, `v${targetVersion}.md`);
if (existsSync(releasePath)) {
	fail(`Release note file already exists: ${releasePath}`);
}

const tagName = args.tag ?? `${pkgSlug}/v${targetVersion}`;
const sourceCommit = args["source-commit"] ?? "";
const prRef = args.pr ?? "";
const packageName = typeof packageJson.name === "string" ? packageJson.name : "";
const displayName = typeof pluginJson.name === "string" ? pluginJson.name : packageName;
const sourceRepo = resolveSourceRepo(packageJson.repository);
const usesClawHubCliPublish = /clawhub package publish/iu.test(publishFlow);
const ownerOrPublisher = resolveOwnerOrPublisher(packageJson.author, sourceRepo);
const tarballFile = buildTarballFileName(packageName, targetVersion);
const archiveRelativePath = `${pkgSlug}/${tarballFile}`;
const archivePath = resolve(root, archiveRelativePath);
const worksheetRelativePath = `docs/releases/${pkgSlug}/v${targetVersion}.clawhub.md`;
const clawhubWorksheetPath = resolve(releaseDir, `v${targetVersion}.clawhub.md`);

if (!packageName) {
	fail(`Missing package.json name for package "${pkgSlug}".`);
}

if (existsSync(clawhubWorksheetPath)) {
	fail(`ClawHub worksheet file already exists: ${clawhubWorksheetPath}`);
}

if (existsSync(archivePath)) {
	fail(`Archive file already exists: ${archivePath}`);
}

const releaseBody = buildReleaseNote({
	packageName,
	pkgSlug,
	targetVersion,
	releaseDate,
	tagName,
	publishFlow,
	usesClawHubCliPublish,
	worksheetPath: worksheetRelativePath,
	archivePath: archiveRelativePath,
	sourceCommit,
	prRef,
	summary,
});
const clawhubWorksheetBody = buildClawHubWorksheet({
	packageName,
	displayName,
	pkgSlug,
	targetVersion,
	tagName,
	publishFlow,
	tarballFile: archiveRelativePath,
	sourceCommit,
	sourceRepo,
	ownerOrPublisher,
	summary,
});

const updatesVersionFiles = targetVersion !== currentVersion;
const changedFiles = updatesVersionFiles
	? [
			packageJsonPath,
			pluginJsonPath,
			releasePath,
			clawhubWorksheetPath,
			archivePath,
		]
	: [releasePath, clawhubWorksheetPath, archivePath];

if (dryRun) {
	printSummary({
		pkgSlug,
		currentVersion,
		targetVersion,
		releasePath,
		archiveRelativePath,
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
packReleaseArchive({ packageDir, archivePath, expectedTarballFile: tarballFile });
writeFileSync(releasePath, releaseBody);
writeFileSync(clawhubWorksheetPath, clawhubWorksheetBody);

printSummary({
	pkgSlug,
	currentVersion,
	targetVersion,
	releasePath,
	archiveRelativePath,
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
	usesClawHubCliPublish,
	worksheetPath,
	archivePath,
	sourceCommit,
	prRef,
	summary,
}) {
	const verificationLines = ["- `pnpm check`"];
	if (usesClawHubCliPublish) {
		verificationLines.push(`- \`clawhub package publish ./${pkgSlug} --dry-run\``);
	}
	const operatorCopyTarget = "GitHub Release or ClawHub";

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
- Companion worksheet path: \`${worksheetPath}\`
- Archive path: \`${archivePath}\`
- Marketing description review:
- Changelog quality review:
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
- ClawHub publish status:
- Operator notes:
`;
}

function buildClawHubWorksheet({
	packageName,
	displayName,
	pkgSlug,
	targetVersion,
	tagName,
	publishFlow,
	tarballFile,
	sourceCommit,
	sourceRepo,
	ownerOrPublisher,
	summary,
}) {
	return `# ${pkgSlug} v${targetVersion} ClawHub Worksheet

- Package: \`${packageName}\`
- Slug: \`${pkgSlug}\`
- Version: \`${targetVersion}\`
- Package type: \`Code plugin\`
- Publish flow: \`${publishFlow}\`
- Tarball file: \`${tarballFile}\`
- Source repo: \`${sourceRepo}\`
- Source commit: ${sourceCommit}
- Source ref: \`${tagName}\`
- Source path: \`${pkgSlug}\`
- Owner / publisher: \`${ownerOrPublisher}\`
- Package name: \`${packageName}\`
- Display name: \`${displayName}\`
- Changelog text: \`${summary}\`

## Release Summary

- ${summary}

## UI Fields

- Package type: \`Code plugin\`
- Name: \`${packageName}\`
- Display name: \`${displayName}\`
- Version: \`${targetVersion}\`
- Changelog:

\`\`\`text
${summary}
\`\`\`

- Source repo: \`${sourceRepo}\`
- Source commit: ${sourceCommit}
- Source ref: \`${tagName}\`
- Source path: \`${pkgSlug}\`

## Operator Notes

- Keep the tarball in \`${pkgSlug}/\` as the canonical handoff location for this release.
- Record the final GitHub Release URL and ClawHub publish result back in \`v${targetVersion}.md\`.
`;
}

function buildTarballFileName(packageName, version) {
	return `${packageName.replace(/^@/u, "").replace(/\//gu, "-")}-${version}.tgz`;
}

function packReleaseArchive({ packageDir, archivePath, expectedTarballFile }) {
	const output = execFileSync("npm", ["pack"], {
		cwd: packageDir,
		encoding: "utf8",
		env: {
			...process.env,
			npm_config_cache: "/tmp/npm-cache",
		},
	});
	const packedFile = output
		.trim()
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.at(-1);

	if (packedFile !== expectedTarballFile) {
		fail(`npm pack returned "${packedFile ?? "<empty>"}", expected "${expectedTarballFile}".`);
	}

	if (!existsSync(archivePath)) {
		fail(`Expected archive file was not created: ${archivePath}`);
	}
}

function printSummary({ pkgSlug, currentVersion, targetVersion, releasePath, archiveRelativePath, changedFiles, dryRun }) {
	const prefix = dryRun ? "DRY RUN" : "UPDATED";
	console.log(`${prefix}: ${pkgSlug}`);
	console.log(`Version: ${currentVersion} -> ${targetVersion}`);
	console.log(`Release note: ${releasePath}`);
	console.log(`Archive: ${archiveRelativePath}`);
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

function resolveSourceRepo(repository) {
	if (repository && typeof repository === "object" && typeof repository.url === "string") {
		const match = repository.url.match(/github\.com[/:]([^/]+\/[^/.]+)(?:\.git)?$/u);
		if (match) {
			return match[1];
		}
	}
	return "TeodorArg/openclaw-automation-tools";
}

function resolveOwnerOrPublisher(author, sourceRepo) {
	if (typeof author === "string" && author.trim().length > 0) {
		return author.trim();
	}
	const [owner] = sourceRepo.split("/");
	return owner || "TeodorArg";
}

function fail(message) {
	console.error(`release-prep: ${message}`);
	process.exit(1);
}
