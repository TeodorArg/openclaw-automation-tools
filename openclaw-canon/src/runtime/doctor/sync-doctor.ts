import { readFile } from "node:fs/promises";
import type { CanonFinding } from "../report/canon-contract.js";
import {
	resolveCiWorkflowPath,
	resolvePackageCanonPath,
	resolvePublishPreflightPath,
	resolveRepoReadmePath,
} from "../state/plugin-paths.js";
import { parsePackageList } from "./package-canon.js";

type CanonPluginConfig = {
	packageCanonPath?: unknown;
	publishPreflightPath?: unknown;
	repoReadmePath?: unknown;
	ciWorkflowPath?: unknown;
};

function buildMissingPackageFinding(
	id: string,
	packageSlug: string,
	documentPath: string,
	sourcePath: string,
): CanonFinding {
	return {
		id,
		kind: "post_pass_gap",
		severity: "warning",
		evidence: [
			{
				kind: "file",
				ref: sourcePath,
				detail: `${packageSlug} is listed in the canonical live package list.`,
			},
			{
				kind: "file",
				ref: documentPath,
				detail: `${packageSlug} is missing from a surface that should stay aligned by policy.`,
			},
		],
		sourceOfTruth: {
			kind: "doc",
			ref: sourcePath,
			note: "Live publishable plugin package list.",
		},
		recommendedAction: `Sync ${documentPath} to enumerate ${packageSlug}.`,
		canAutoFix: false,
		requiresConfirmation: false,
		fixDisposition: "proposal_only",
	};
}

export async function auditCanonSync(
	pluginConfig?: CanonPluginConfig,
): Promise<{ findings: CanonFinding[] }> {
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

	for (const packageSlug of livePackages) {
		if (!publishPreflightMarkdown.includes(packageSlug)) {
			findings.push(
				buildMissingPackageFinding(
					`sync-preflight-${packageSlug}`,
					packageSlug,
					publishPreflightPath,
					packageCanonPath,
				),
			);
		}

		if (!repoReadmeMarkdown.includes(packageSlug)) {
			findings.push(
				buildMissingPackageFinding(
					`sync-readme-${packageSlug}`,
					packageSlug,
					repoReadmePath,
					packageCanonPath,
				),
			);
		}

		if (!ciWorkflowYaml.includes(packageSlug)) {
			findings.push(
				buildMissingPackageFinding(
					`sync-ci-${packageSlug}`,
					packageSlug,
					ciWorkflowPath,
					packageCanonPath,
				),
			);
		}
	}

	return { findings };
}
