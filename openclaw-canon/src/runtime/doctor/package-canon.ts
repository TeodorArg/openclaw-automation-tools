import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type {
	CanonEvidence,
	CanonFinding,
	CanonProposal,
} from "../report/canon-contract.js";
import {
	resolveCiWorkflowPath,
	resolvePackageCanonPath,
	resolvePublishPreflightPath,
	resolveRepoReadmePath,
} from "../state/plugin-paths.js";

type CanonPluginConfig = {
	packageCanonPath?: unknown;
	publishPreflightPath?: unknown;
	repoReadmePath?: unknown;
	ciWorkflowPath?: unknown;
};

type PackageCanonAudit = {
	findings: CanonFinding[];
	proposals: CanonProposal[];
};

const REQUIRED_PACKAGE_PATHS = [
	"src/runtime",
	"src/test",
	"src/types",
	"skills",
	"README.md",
	"LICENSE",
	".npmignore",
	"openclaw.plugin.json",
	"package.json",
	"tsconfig.json",
	"tsconfig.build.json",
] as const;

const REQUIRED_NPMIGNORE_ALLOWLIST = [
	"!dist/**",
	"!openclaw.plugin.json",
	"!skills/**",
	"!README.md",
	"!LICENSE",
	"!package.json",
] as const;

const REQUIRED_CI_COMMANDS = [
	"pnpm lint",
	"pnpm typecheck",
	"pnpm build",
	"pnpm test",
	"pnpm pack:smoke",
] as const;

async function pathExists(targetPath: string): Promise<boolean> {
	try {
		await access(targetPath, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

export function parsePackageList(markdown: string): string[] {
	return markdown
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.startsWith("- `") && line.endsWith("/`"))
		.map((line) => line.replace(/^- `/, "").replace(/\/`$/, ""))
		.filter((entry) => entry.startsWith("openclaw-"));
}

function hasRequiredNpmignoreAllowlist(content: string): boolean {
	return REQUIRED_NPMIGNORE_ALLOWLIST.every((entry) => content.includes(entry));
}

function hasRequiredCiCommandSet(content: string): boolean {
	return REQUIRED_CI_COMMANDS.every((command) =>
		content.includes(`- run: ${command}`),
	);
}

function buildDocEvidence(ref: string, detail: string): CanonEvidence {
	return {
		kind: "file",
		ref,
		detail,
	};
}

export async function auditPackageCanon(
	pluginConfig?: CanonPluginConfig,
): Promise<PackageCanonAudit> {
	const packageCanonPath = resolvePackageCanonPath(pluginConfig);
	const packageCanonMarkdown = await readFile(packageCanonPath, "utf8");
	const publishPreflightPath = resolvePublishPreflightPath(pluginConfig);
	const publishPreflightMarkdown = await readFile(publishPreflightPath, "utf8");
	const repoReadmePath = resolveRepoReadmePath(pluginConfig);
	const repoReadmeMarkdown = await readFile(repoReadmePath, "utf8");
	const ciWorkflowPath = resolveCiWorkflowPath(pluginConfig);
	const ciWorkflowYaml = await readFile(ciWorkflowPath, "utf8");

	const livePackages = parsePackageList(packageCanonMarkdown);
	const findings: CanonFinding[] = [];
	const proposals: CanonProposal[] = [];

	for (const packageSlug of livePackages) {
		const packageRoot = resolve(dirname(packageCanonPath), "..", packageSlug);

		for (const requiredPath of REQUIRED_PACKAGE_PATHS) {
			const absoluteRequiredPath = resolve(packageRoot, requiredPath);
			if (!(await pathExists(absoluteRequiredPath))) {
				findings.push({
					id: `template-missing-${packageSlug}-${requiredPath}`,
					kind: "template_drift",
					severity: "critical",
					evidence: [
						buildDocEvidence(
							packageCanonPath,
							`docs/PLUGIN_PACKAGE_CANON.md requires ${requiredPath} for live plugin packages.`,
						),
						buildDocEvidence(
							absoluteRequiredPath,
							`Required package path is missing for ${packageSlug}.`,
						),
					],
					sourceOfTruth: {
						kind: "doc",
						ref: packageCanonPath,
						note: "Required package shape for live publishable plugins.",
					},
					recommendedAction: `Restore ${requiredPath} inside ${packageSlug}.`,
					canAutoFix: false,
					requiresConfirmation: false,
					fixDisposition: "manual_only",
				});
			}
		}

		const npmignorePath = resolve(packageRoot, ".npmignore");
		if (await pathExists(npmignorePath)) {
			const npmignoreContent = await readFile(npmignorePath, "utf8");
			if (!hasRequiredNpmignoreAllowlist(npmignoreContent)) {
				findings.push({
					id: `template-npmignore-policy-${packageSlug}`,
					kind: "template_drift",
					severity: "warning",
					evidence: [
						buildDocEvidence(
							packageCanonPath,
							"docs/PLUGIN_PACKAGE_CANON.md requires package-local .npmignore to allow the shipped dist output and other packed artifacts.",
						),
						buildDocEvidence(
							npmignorePath,
							`${packageSlug} is missing one or more required shipped-artifact allowlist entries.`,
						),
					],
					sourceOfTruth: {
						kind: "doc",
						ref: packageCanonPath,
						note: "Package-local .npmignore policy for live publishable plugins.",
					},
					recommendedAction: `Restore the required shipped-artifact allowlist in ${packageSlug}/.npmignore.`,
					canAutoFix: false,
					requiresConfirmation: false,
					fixDisposition: "manual_only",
				});
			}
		}

		const packageJsonPath = resolve(packageRoot, "package.json");
		const manifestPath = resolve(packageRoot, "openclaw.plugin.json");

		if (
			(await pathExists(packageJsonPath)) &&
			(await pathExists(manifestPath))
		) {
			const packageJson = JSON.parse(
				await readFile(packageJsonPath, "utf8"),
			) as {
				version?: string;
				name?: string;
			};
			const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
				id?: string;
				version?: string;
				entry?: string;
			};

			if (manifest.id !== packageSlug) {
				findings.push({
					id: `source-id-mismatch-${packageSlug}`,
					kind: "source_drift",
					severity: "warning",
					evidence: [
						buildDocEvidence(
							manifestPath,
							`Manifest id is ${manifest.id ?? "missing"}, expected ${packageSlug}.`,
						),
					],
					sourceOfTruth: {
						kind: "file",
						ref: manifestPath,
					},
					recommendedAction: `Align openclaw.plugin.json id with ${packageSlug}.`,
					canAutoFix: false,
					requiresConfirmation: false,
					fixDisposition: "manual_only",
				});
			}

			if (
				typeof packageJson.version === "string" &&
				typeof manifest.version === "string" &&
				packageJson.version !== manifest.version
			) {
				findings.push({
					id: `source-version-mismatch-${packageSlug}`,
					kind: "source_drift",
					severity: "warning",
					evidence: [
						buildDocEvidence(
							packageJsonPath,
							`package.json version is ${packageJson.version}.`,
						),
						buildDocEvidence(
							manifestPath,
							`openclaw.plugin.json version is ${manifest.version}.`,
						),
					],
					sourceOfTruth: {
						kind: "file",
						ref: packageJsonPath,
					},
					recommendedAction: `Keep package.json and openclaw.plugin.json versions aligned for ${packageSlug}.`,
					canAutoFix: false,
					requiresConfirmation: false,
					fixDisposition: "manual_only",
				});
			}
		}
	}

	if (!hasRequiredCiCommandSet(ciWorkflowYaml)) {
		findings.push({
			id: "source-ci-verification-minimum",
			kind: "source_drift",
			severity: "critical",
			evidence: [
				buildDocEvidence(
					packageCanonPath,
					"docs/PLUGIN_PACKAGE_CANON.md requires CI to run the full plugin verification minimum for each live publishable package.",
				),
				buildDocEvidence(
					ciWorkflowPath,
					"CI is missing one or more required verification commands for the live plugin package job.",
				),
			],
			sourceOfTruth: {
				kind: "doc",
				ref: packageCanonPath,
				note: "CI must cover pnpm lint, pnpm typecheck, pnpm build, pnpm test, and pnpm pack:smoke.",
			},
			recommendedAction:
				"Restore pnpm lint, pnpm typecheck, pnpm build, pnpm test, and pnpm pack:smoke in the plugin package CI job.",
			canAutoFix: false,
			requiresConfirmation: false,
			fixDisposition: "manual_only",
		});
	}

	const linkedDocuments = [
		{
			id: "publish-preflight",
			path: publishPreflightPath,
			content: publishPreflightMarkdown,
		},
		{
			id: "repo-readme",
			path: repoReadmePath,
			content: repoReadmeMarkdown,
		},
		{
			id: "ci-workflow",
			path: ciWorkflowPath,
			content: ciWorkflowYaml,
		},
	];

	for (const packageSlug of livePackages) {
		for (const document of linkedDocuments) {
			if (!document.content.includes(packageSlug)) {
				findings.push({
					id: `source-live-package-missing-${document.id}-${packageSlug}`,
					kind: "source_drift",
					severity: "warning",
					evidence: [
						buildDocEvidence(
							packageCanonPath,
							`${packageSlug} is listed as a live publishable package.`,
						),
						buildDocEvidence(
							document.path,
							`${packageSlug} is missing from a linked canon surface.`,
						),
					],
					sourceOfTruth: {
						kind: "doc",
						ref: packageCanonPath,
					},
					recommendedAction: `Sync ${document.path} with the live package list from docs/PLUGIN_PACKAGE_CANON.md.`,
					canAutoFix: false,
					requiresConfirmation: false,
					fixDisposition: "proposal_only",
				});
			}
		}
	}

	if (findings.length > 0) {
		proposals.push({
			id: "source-sync-proposal",
			title: "Review canon-owned source drift against the live package list",
			summary:
				"Source and template findings were detected across package shape or linked canon surfaces.",
			targetIds: findings.map((finding) => finding.id),
			requiresConfirmation: false,
			canAutoFix: false,
			fixDisposition: "proposal_only",
			confidence: "high",
			evidence: findings.flatMap((finding) => finding.evidence).slice(0, 10),
		});
	}

	return {
		findings,
		proposals,
	};
}
