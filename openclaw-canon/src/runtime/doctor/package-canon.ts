import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type {
	CanonEvidence,
	CanonFinding,
	CanonProposal,
} from "../report/canon-contract.js";
import { tryReadUtf8 } from "../report/file-state.js";
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

const REQUIRED_PACKAGE_FILES_ALLOWLIST = [
	"dist",
	"openclaw.plugin.json",
	"skills",
	"README.md",
	"LICENSE",
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

function buildMissingFileFinding(args: {
	id: string;
	filePath: string;
	detail: string;
	note: string;
	recommendedAction: string;
}): CanonFinding {
	return {
		id: args.id,
		kind: "source_drift",
		severity: "critical",
		evidence: [buildDocEvidence(args.filePath, args.detail)],
		sourceOfTruth: {
			kind: "file",
			ref: args.filePath,
			note: args.note,
		},
		recommendedAction: args.recommendedAction,
		canAutoFix: false,
		requiresConfirmation: false,
		fixDisposition: "manual_only",
	};
}

export async function auditPackageCanon(
	pluginConfig?: CanonPluginConfig,
): Promise<PackageCanonAudit> {
	const packageCanonPath = resolvePackageCanonPath(pluginConfig);
	const publishPreflightPath = resolvePublishPreflightPath(pluginConfig);
	const repoReadmePath = resolveRepoReadmePath(pluginConfig);
	const ciWorkflowPath = resolveCiWorkflowPath(pluginConfig);
	const packageCanonMarkdown = await tryReadUtf8(packageCanonPath);
	const publishPreflightMarkdown = await tryReadUtf8(publishPreflightPath);
	const repoReadmeMarkdown = await tryReadUtf8(repoReadmePath);
	const ciWorkflowYaml = await tryReadUtf8(ciWorkflowPath);
	const findings: CanonFinding[] = [];
	const proposals: CanonProposal[] = [];

	if (typeof packageCanonMarkdown !== "string") {
		findings.push(
			buildMissingFileFinding({
				id: "source-package-canon-missing",
				filePath: packageCanonPath,
				detail:
					"docs/PLUGIN_PACKAGE_CANON.md is missing, so source canon cannot be audited.",
				note: "docs/PLUGIN_PACKAGE_CANON.md is the authority side for live plugin package canon.",
				recommendedAction:
					"Point packageCanonPath at the canonical docs/PLUGIN_PACKAGE_CANON.md file or run canon source checks in the tools repo.",
			}),
		);
	}

	if (typeof publishPreflightMarkdown !== "string") {
		findings.push(
			buildMissingFileFinding({
				id: "source-publish-preflight-missing",
				filePath: publishPreflightPath,
				detail:
					"docs/CLAWHUB_PUBLISH_PREFLIGHT.md is missing, so source cross-checks are incomplete.",
				note: "Publish preflight stays in sync with the live package canon.",
				recommendedAction:
					"Point publishPreflightPath at the canonical preflight doc or restore that file in the target repo.",
			}),
		);
	}

	if (typeof repoReadmeMarkdown !== "string") {
		findings.push(
			buildMissingFileFinding({
				id: "source-repo-readme-missing",
				filePath: repoReadmePath,
				detail: "README.md is missing, so repo fact checks are incomplete.",
				note: "The repo README is part of the bounded sync surface.",
				recommendedAction:
					"Point repoReadmePath at the canonical repo README.md or restore that file in the target repo.",
			}),
		);
	}

	if (typeof ciWorkflowYaml !== "string") {
		findings.push(
			buildMissingFileFinding({
				id: "source-ci-workflow-missing",
				filePath: ciWorkflowPath,
				detail:
					".github/workflows/ci.yml is missing, so CI canon checks are incomplete.",
				note: "The CI workflow is part of the bounded sync surface.",
				recommendedAction:
					"Point ciWorkflowPath at the canonical CI workflow or restore that file in the target repo.",
			}),
		);
	}

	if (typeof packageCanonMarkdown !== "string") {
		return { findings, proposals };
	}

	const livePackages = parsePackageList(packageCanonMarkdown);

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
							"docs/PLUGIN_PACKAGE_CANON.md allows package-local .npmignore as supplemental packaging control when present.",
						),
						buildDocEvidence(
							npmignorePath,
							`${packageSlug} is missing one or more required shipped-artifact allowlist entries.`,
						),
					],
					sourceOfTruth: {
						kind: "doc",
						ref: packageCanonPath,
						note: "Package-local .npmignore allowlist policy when that file is used.",
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
				files?: unknown;
				openclaw?: {
					extensions?: unknown;
				};
			};
			const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
				id?: string;
				version?: string;
				skills?: unknown;
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

			if (packageJson.name !== `@openclaw/${packageSlug}`) {
				findings.push({
					id: `source-package-name-mismatch-${packageSlug}`,
					kind: "source_drift",
					severity: "warning",
					evidence: [
						buildDocEvidence(
							packageJsonPath,
							`package.json name is ${packageJson.name ?? "missing"}, expected @openclaw/${packageSlug}.`,
						),
					],
					sourceOfTruth: {
						kind: "file",
						ref: packageJsonPath,
					},
					recommendedAction: `Align package.json name with @openclaw/${packageSlug}.`,
					canAutoFix: false,
					requiresConfirmation: false,
					fixDisposition: "manual_only",
				});
			}

			const packageFiles = Array.isArray(packageJson.files)
				? packageJson.files
				: [];
			const missingPackedArtifacts = REQUIRED_PACKAGE_FILES_ALLOWLIST.filter(
				(entry) => !packageFiles.includes(entry),
			);

			if (missingPackedArtifacts.length > 0) {
				findings.push({
					id: `source-files-allowlist-${packageSlug}`,
					kind: "source_drift",
					severity: "critical",
					evidence: [
						buildDocEvidence(
							packageCanonPath,
							"docs/PLUGIN_PACKAGE_CANON.md requires package files allowlists to preserve dist and shipped runtime artifacts.",
						),
						buildDocEvidence(
							packageJsonPath,
							`${packageSlug} package.json files is missing ${missingPackedArtifacts.join(", ")}.`,
						),
					],
					sourceOfTruth: {
						kind: "doc",
						ref: packageCanonPath,
						note: "Publishable packages must keep the shipped runtime surface in package files.",
					},
					recommendedAction: `Restore the shipped artifact allowlist in ${packageSlug}/package.json files.`,
					canAutoFix: false,
					requiresConfirmation: false,
					fixDisposition: "manual_only",
				});
			}

			if (
				!Array.isArray(packageJson.openclaw?.extensions) ||
				!packageJson.openclaw.extensions.includes("./dist/index.js")
			) {
				findings.push({
					id: `source-runtime-entry-${packageSlug}`,
					kind: "source_drift",
					severity: "critical",
					evidence: [
						buildDocEvidence(
							packageJsonPath,
							`${packageSlug} package.json openclaw.extensions must include ./dist/index.js.`,
						),
					],
					sourceOfTruth: {
						kind: "file",
						ref: packageJsonPath,
						note: "Runtime extension entry must match the shipped dist entrypoint.",
					},
					recommendedAction: `Restore ./dist/index.js in ${packageSlug}/package.json openclaw.extensions.`,
					canAutoFix: false,
					requiresConfirmation: false,
					fixDisposition: "manual_only",
				});
			}

			if (
				!Array.isArray(manifest.skills) ||
				!manifest.skills.includes("./skills")
			) {
				findings.push({
					id: `source-manifest-skills-${packageSlug}`,
					kind: "source_drift",
					severity: "warning",
					evidence: [
						buildDocEvidence(
							manifestPath,
							`${packageSlug} openclaw.plugin.json should declare ./skills for bundled skill discovery.`,
						),
					],
					sourceOfTruth: {
						kind: "file",
						ref: manifestPath,
						note: "Plugin manifest skills should point at the bundled skills directory.",
					},
					recommendedAction: `Restore ./skills in ${packageSlug}/openclaw.plugin.json skills.`,
					canAutoFix: false,
					requiresConfirmation: false,
					fixDisposition: "manual_only",
				});
			}
		}
	}

	if (
		typeof ciWorkflowYaml === "string" &&
		!hasRequiredCiCommandSet(ciWorkflowYaml)
	) {
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
			if (typeof document.content !== "string") {
				continue;
			}

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
