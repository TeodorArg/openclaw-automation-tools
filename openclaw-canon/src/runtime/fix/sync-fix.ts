import { readFile, writeFile } from "node:fs/promises";
import { parsePackageList } from "../doctor/package-canon.js";
import type {
	CanonChange,
	CanonFinding,
	CanonProposal,
} from "../report/canon-contract.js";
import { tryReadUtf8 } from "../report/file-state.js";
import type { CanonPreviewRecord } from "../state/canon-state.js";
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

type SyncFixPlan = {
	changes: CanonChange[];
	proposals: CanonProposal[];
};

type BlockMatch = {
	startLine: number;
	endLine: number;
};

const PREFLIGHT_HEADING =
	"Plugin packages listed there and currently expected here in lockstep:";
const README_FACT_PREFIX = "- The repo currently ships ";

function splitLines(raw: string): string[] {
	return raw.split("\n");
}

function leadingWhitespace(line: string): string {
	const match = line.match(/^\s*/);
	return match ? match[0] : "";
}

function formatPackageSentence(packageSlugs: string[]): string {
	const packageRefs = packageSlugs.map((packageSlug) => `\`${packageSlug}/\``);

	if (packageRefs.length === 1) {
		return packageRefs[0];
	}

	if (packageRefs.length === 2) {
		return `${packageRefs[0]} and ${packageRefs[1]}`;
	}

	return `${packageRefs.slice(0, -1).join(", ")}, and ${packageRefs.at(-1)}`;
}

function buildCanonicalPreflightList(packageSlugs: string[]): string {
	return packageSlugs.map((packageSlug) => `- \`${packageSlug}/\``).join("\n");
}

function buildCanonicalCiList(packageSlugs: string[], indent: string): string {
	return packageSlugs
		.map((packageSlug) => `${indent}- ${packageSlug}`)
		.join("\n");
}

function buildCanonicalReadmeFact(packageSlugs: string[]): string {
	return `${README_FACT_PREFIX}${packageSlugs.length} publishable plugin packages: ${formatPackageSentence(packageSlugs)}.`;
}

function findPublishPreflightBlock(lines: string[]): BlockMatch | null {
	const anchorIndex = lines.findIndex(
		(line) => line.trim() === PREFLIGHT_HEADING,
	);

	if (anchorIndex < 0) {
		return null;
	}

	let firstBulletIndex = -1;
	let lastBulletIndex = -1;

	for (let index = anchorIndex + 1; index < lines.length; index += 1) {
		const trimmed = lines[index].trim();

		if (trimmed.length === 0) {
			if (firstBulletIndex >= 0) {
				break;
			}
			continue;
		}

		if (!trimmed.startsWith("- `") || !trimmed.endsWith("/`")) {
			if (firstBulletIndex < 0) {
				return null;
			}
			break;
		}

		if (firstBulletIndex < 0) {
			firstBulletIndex = index;
		}

		lastBulletIndex = index;
	}

	if (firstBulletIndex < 0 || lastBulletIndex < 0) {
		return null;
	}

	return {
		startLine: firstBulletIndex + 1,
		endLine: lastBulletIndex + 1,
	};
}

function findCiBlock(
	lines: string[],
): (BlockMatch & { indent: string }) | null {
	const packageIndex = lines.findIndex((line) => line.trim() === "package:");

	if (packageIndex < 0) {
		return null;
	}

	let firstItemIndex = -1;
	let lastItemIndex = -1;
	let indent = "";

	for (let index = packageIndex + 1; index < lines.length; index += 1) {
		const trimmed = lines[index].trim();

		if (trimmed.length === 0) {
			if (firstItemIndex >= 0) {
				break;
			}
			continue;
		}

		if (!trimmed.startsWith("- ")) {
			if (firstItemIndex < 0) {
				return null;
			}
			break;
		}

		if (firstItemIndex < 0) {
			firstItemIndex = index;
			indent = leadingWhitespace(lines[index]);
		}

		lastItemIndex = index;
	}

	if (firstItemIndex < 0 || lastItemIndex < 0) {
		return null;
	}

	return {
		startLine: firstItemIndex + 1,
		endLine: lastItemIndex + 1,
		indent,
	};
}

function findReadmeFactLine(lines: string[]): BlockMatch | null {
	const lineIndex = lines.findIndex(
		(line) =>
			line.startsWith(README_FACT_PREFIX) &&
			line.includes("publishable plugin packages:"),
	);

	if (lineIndex < 0) {
		return null;
	}

	return {
		startLine: lineIndex + 1,
		endLine: lineIndex + 1,
	};
}

function buildProposal(
	targetId: string,
	filePath: string,
	summary: string,
	fixDisposition: "safe_apply" | "proposal_only",
	canAutoFix: boolean,
): CanonProposal {
	return {
		id: `proposal-${targetId}`,
		title: summary,
		summary,
		targetIds: [targetId],
		requiresConfirmation: canAutoFix,
		canAutoFix,
		fixDisposition,
		confidence: "high",
		evidence: [
			{
				kind: "file",
				ref: filePath,
				detail: summary,
			},
		],
	};
}

function buildRewriteChange(
	targetId: string,
	filePath: string,
	block: BlockMatch,
	detail: string,
	content: string,
	expectedText: string,
): CanonChange {
	return {
		kind: "rewrite_block",
		targetId,
		ref: `${filePath}:${block.startLine}-${block.endLine}`,
		detail,
		content,
		expectedText,
	};
}

function planTargetRewrite(args: {
	targetId: string;
	filePath: string;
	block: BlockMatch | null;
	currentText?: string;
	desiredText: string;
	proposalSummary: string;
	missingSummary: string;
}): SyncFixPlan {
	if (!args.block || typeof args.currentText !== "string") {
		return {
			changes: [],
			proposals: [
				buildProposal(
					args.targetId,
					args.filePath,
					args.missingSummary,
					"proposal_only",
					false,
				),
			],
		};
	}

	if (args.currentText === args.desiredText) {
		return {
			changes: [],
			proposals: [],
		};
	}

	return {
		changes: [
			buildRewriteChange(
				args.targetId,
				args.filePath,
				args.block,
				args.proposalSummary,
				args.desiredText,
				args.currentText,
			),
		],
		proposals: [
			buildProposal(
				args.targetId,
				args.filePath,
				args.proposalSummary,
				"safe_apply",
				true,
			),
		],
	};
}

export async function buildSyncFixPlan(
	pluginConfig?: CanonPluginConfig,
	targetIds?: string[],
): Promise<SyncFixPlan> {
	const packageCanonPath = resolvePackageCanonPath(pluginConfig);
	const packageCanonMarkdown = await tryReadUtf8(packageCanonPath);

	if (typeof packageCanonMarkdown !== "string") {
		return {
			changes: [],
			proposals: [],
		};
	}

	const livePackages = parsePackageList(packageCanonMarkdown);

	const publishPreflightPath = resolvePublishPreflightPath(pluginConfig);
	const publishPreflightRaw = await tryReadUtf8(publishPreflightPath);
	const publishPreflightLines = splitLines(publishPreflightRaw ?? "");
	const ciWorkflowPath = resolveCiWorkflowPath(pluginConfig);
	const ciWorkflowRaw = await tryReadUtf8(ciWorkflowPath);
	const ciWorkflowLines = splitLines(ciWorkflowRaw ?? "");
	const repoReadmePath = resolveRepoReadmePath(pluginConfig);
	const repoReadmeRaw = await tryReadUtf8(repoReadmePath);
	const repoReadmeLines = splitLines(repoReadmeRaw ?? "");

	const changes: CanonChange[] = [];
	const proposals: CanonProposal[] = [];

	const preflightBlock = findPublishPreflightBlock(publishPreflightLines);
	const preflightTargetId = "sync-preflight-live-package-list";
	if (!targetIds || targetIds.includes(preflightTargetId)) {
		const plan = planTargetRewrite({
			targetId: preflightTargetId,
			filePath: publishPreflightPath,
			block: typeof publishPreflightRaw === "string" ? preflightBlock : null,
			currentText: preflightBlock
				? publishPreflightLines
						.slice(preflightBlock.startLine - 1, preflightBlock.endLine)
						.join("\n")
				: undefined,
			desiredText: buildCanonicalPreflightList(livePackages),
			proposalSummary:
				"Rewrite the bounded publish preflight package list from docs/PLUGIN_PACKAGE_CANON.md.",
			missingSummary:
				"The publish preflight package list block could not be identified mechanically, so it stays proposal_only.",
		});
		changes.push(...plan.changes);
		proposals.push(...plan.proposals);
	}

	const ciBlock = findCiBlock(ciWorkflowLines);
	const ciTargetId = "sync-ci-package-matrix";
	if (!targetIds || targetIds.includes(ciTargetId)) {
		const plan = planTargetRewrite({
			targetId: ciTargetId,
			filePath: ciWorkflowPath,
			block: typeof ciWorkflowRaw === "string" ? ciBlock : null,
			currentText: ciBlock
				? ciWorkflowLines
						.slice(ciBlock.startLine - 1, ciBlock.endLine)
						.join("\n")
				: undefined,
			desiredText: buildCanonicalCiList(
				ciBlock ? livePackages : livePackages,
				ciBlock?.indent ?? "          ",
			),
			proposalSummary:
				"Rewrite the bounded CI package matrix from docs/PLUGIN_PACKAGE_CANON.md.",
			missingSummary:
				"The CI package matrix block could not be identified mechanically, so it stays proposal_only.",
		});
		changes.push(...plan.changes);
		proposals.push(...plan.proposals);
	}

	const readmeBlock = findReadmeFactLine(repoReadmeLines);
	const readmeTargetId = "sync-readme-live-package-fact";
	if (!targetIds || targetIds.includes(readmeTargetId)) {
		const plan = planTargetRewrite({
			targetId: readmeTargetId,
			filePath: repoReadmePath,
			block: typeof repoReadmeRaw === "string" ? readmeBlock : null,
			currentText: readmeBlock
				? repoReadmeLines
						.slice(readmeBlock.startLine - 1, readmeBlock.endLine)
						.join("\n")
				: undefined,
			desiredText: buildCanonicalReadmeFact(livePackages),
			proposalSummary:
				"Rewrite the bounded README live package fact from docs/PLUGIN_PACKAGE_CANON.md.",
			missingSummary:
				"The README live package fact could not be identified mechanically, so it stays proposal_only.",
		});
		changes.push(...plan.changes);
		proposals.push(...plan.proposals);
	}

	return {
		changes,
		proposals,
	};
}

export async function buildSyncDoctorFindings(
	pluginConfig?: CanonPluginConfig,
): Promise<CanonFinding[]> {
	const packageCanonPath = resolvePackageCanonPath(pluginConfig);
	const packageCanonMarkdown = await tryReadUtf8(packageCanonPath);

	if (typeof packageCanonMarkdown !== "string") {
		return [
			{
				id: "sync-package-canon-missing",
				kind: "post_pass_gap",
				severity: "critical",
				evidence: [
					{
						kind: "file",
						ref: packageCanonPath,
						detail:
							"docs/PLUGIN_PACKAGE_CANON.md is missing, so sync scope cannot compute the live package list.",
					},
				],
				sourceOfTruth: {
					kind: "doc",
					ref: packageCanonPath,
					note: "docs/PLUGIN_PACKAGE_CANON.md is the authority side for the live publishable plugin package list.",
				},
				recommendedAction:
					"Point packageCanonPath at the canonical docs/PLUGIN_PACKAGE_CANON.md file or run canon sync in the tools repo.",
				canAutoFix: false,
				requiresConfirmation: false,
				fixDisposition: "manual_only",
			},
		];
	}

	const plan = await buildSyncFixPlan(pluginConfig);

	return plan.proposals.map((proposal) => {
		const targetId = proposal.targetIds[0] ?? proposal.id;
		const change = plan.changes.find((item) => item.targetId === targetId);
		const targetRef =
			change?.ref?.replace(/:\d+-\d+$/, "") ??
			proposal.evidence[0]?.ref ??
			packageCanonPath;

		return {
			id: targetId,
			kind: "post_pass_gap",
			severity: "warning",
			evidence: [
				{
					kind: "file",
					ref: packageCanonPath,
					detail:
						"docs/PLUGIN_PACKAGE_CANON.md is the authority side for the live publishable plugin package list.",
				},
				{
					kind: "file",
					ref: targetRef,
					detail: proposal.summary,
				},
			],
			sourceOfTruth: {
				kind: "doc",
				ref: packageCanonPath,
				note: "Live publishable plugin package list.",
			},
			recommendedAction: proposal.canAutoFix
				? `Preview canon_fix with scope=sync targetIds=["${targetId}"] and apply it with confirmToken after review.`
				: `Review ${targetRef} manually because the bounded sync section for ${targetId} is missing or ambiguous.`,
			canAutoFix: proposal.canAutoFix,
			requiresConfirmation: proposal.requiresConfirmation,
			fixDisposition: proposal.fixDisposition,
		};
	});
}

function parseBlockReference(ref: string): {
	filePath: string;
	startLine: number;
	endLine: number;
} | null {
	const match = ref.match(/^(.*):(\d+)-(\d+)$/);

	if (!match) {
		return null;
	}

	return {
		filePath: match[1],
		startLine: Number.parseInt(match[2], 10),
		endLine: Number.parseInt(match[3], 10),
	};
}

export async function applySyncFixPlan(
	record: CanonPreviewRecord,
): Promise<void> {
	const patchesByFile = new Map<
		string,
		Array<{
			startLine: number;
			endLine: number;
			content: string;
			expectedText?: string;
		}>
	>();

	for (const change of record.changes ?? []) {
		if (change.kind !== "rewrite_block" || !change.ref) {
			continue;
		}

		const parsed = parseBlockReference(change.ref);

		if (!parsed) {
			continue;
		}

		const patches = patchesByFile.get(parsed.filePath) ?? [];
		patches.push({
			startLine: parsed.startLine,
			endLine: parsed.endLine,
			content: change.content,
			expectedText: change.expectedText,
		});
		patchesByFile.set(parsed.filePath, patches);
	}

	for (const [filePath, patches] of patchesByFile.entries()) {
		const raw = await readFile(filePath, "utf8");
		const lines = splitLines(raw);

		patches.sort((left, right) => right.startLine - left.startLine);

		for (const patch of patches) {
			if (
				patch.startLine < 1 ||
				patch.endLine < patch.startLine ||
				patch.endLine > lines.length
			) {
				throw new Error(`Invalid sync fix block range for ${filePath}.`);
			}

			if (typeof patch.expectedText === "string") {
				const currentText = lines
					.slice(patch.startLine - 1, patch.endLine)
					.join("\n");

				if (currentText !== patch.expectedText) {
					throw new Error(
						`Sync preview no longer matches ${filePath}; the target block changed after preview. Run preview again.`,
					);
				}
			}

			lines.splice(
				patch.startLine - 1,
				patch.endLine - patch.startLine + 1,
				...splitLines(patch.content),
			);
		}

		await writeFile(filePath, lines.join("\n"), "utf8");
	}
}
