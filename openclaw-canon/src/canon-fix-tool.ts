import { Type } from "@sinclair/typebox";
import { auditCanonSync } from "./runtime/doctor/sync-doctor.js";
import {
	applyMemoryFixPlan,
	buildMemoryFixPlan,
	createPreviewRecord,
	selectPreviewRecord,
} from "./runtime/fix/memory-fix.js";
import { applySyncFixPlan, buildSyncFixPlan } from "./runtime/fix/sync-fix.js";
import {
	type CanonFixResult,
	normalizeResultInvariants,
} from "./runtime/report/canon-contract.js";
import { formatJsonContent } from "./runtime/report/json-content.js";
import { loadCanonState, saveCanonState } from "./runtime/state/canon-file.js";
import {
	consumePreviewRecord,
	updateCanonSummary,
	upsertPreviewRecord,
} from "./runtime/state/canon-state.js";
import { buildCanonSummary } from "./runtime/status/status-summary.js";

const CanonFixSchema = Type.Object(
	{
		scope: Type.Union([Type.Literal("memory"), Type.Literal("sync")]),
		mode: Type.Union([Type.Literal("preview"), Type.Literal("apply")]),
		targetIds: Type.Optional(Type.Array(Type.String())),
		confirmToken: Type.Optional(Type.String()),
	},
	{ additionalProperties: false },
);

type CanonFixParams = {
	scope: "memory" | "sync";
	mode: "preview" | "apply";
	targetIds?: string[];
	confirmToken?: string;
};

type CanonFixToolOptions = {
	pluginConfig?: {
		stateFilePath?: unknown;
		memoryFilePath?: unknown;
		packageCanonPath?: unknown;
		publishPreflightPath?: unknown;
		repoReadmePath?: unknown;
		ciWorkflowPath?: unknown;
	};
};

export function createCanonFixTool(options: CanonFixToolOptions = {}) {
	return {
		name: "canon_fix",
		description:
			"Preview-first canon fix tool for bounded memory and sync fixes.",
		parameters: CanonFixSchema,
		async execute(_toolCallId: string, params: CanonFixParams) {
			if (params.mode === "apply" && !params.confirmToken) {
				throw new Error("canon_fix apply requires confirmToken from preview.");
			}

			if (params.scope === "memory") {
				if (params.mode === "preview") {
					const generatedAt = new Date().toISOString();
					const plan = await buildMemoryFixPlan(
						options.pluginConfig,
						params.targetIds,
					);
					const status = plan.proposals.length > 0 ? "warning" : "clean";
					const result: CanonFixResult = normalizeResultInvariants({
						status,
						scope: "memory",
						mode: "preview",
						generatedAt,
						changes: plan.changes,
						proposals: plan.proposals.length > 0 ? plan.proposals : undefined,
					});
					const { state } = await loadCanonState(options.pluginConfig);

					if (plan.changes.length === 0) {
						const nextState = updateCanonSummary(state, {
							status,
							generatedAt,
							stale: false,
							summary: buildCanonSummary(
								"No safe memory fixes are pending.",
								[],
								false,
								"Run canon_doctor memory to inspect the file state.",
							),
						});
						await saveCanonState(nextState, options.pluginConfig);
						return formatJsonContent(result);
					}

					const preview = createPreviewRecord(result);
					const resultWithToken: CanonFixResult = {
						...result,
						confirmToken: preview.token,
					};
					const nextState = updateCanonSummary(
						upsertPreviewRecord(state, preview),
						{
							status,
							generatedAt,
							stale: false,
							summary: buildCanonSummary(
								"Memory fix preview is ready for review.",
								[],
								false,
								"Review proposals and re-run canon_fix with mode=apply and the confirmToken.",
							),
						},
					);
					await saveCanonState(nextState, options.pluginConfig);
					return formatJsonContent(resultWithToken);
				}

				const { state } = await loadCanonState(options.pluginConfig);
				const confirmToken = params.confirmToken as string;
				const record = selectPreviewRecord(
					state,
					confirmToken,
					params.targetIds,
				);
				await applyMemoryFixPlan(record, options.pluginConfig);
				const generatedAt = new Date().toISOString();
				const result: CanonFixResult = {
					status: "clean",
					scope: "memory",
					mode: "apply",
					generatedAt,
					changes: record.changes,
					followups: [
						{
							kind: "pointer_rebuild",
							detail:
								"Sync MCP memory and local memory.jsonl together if the accepted canon changed.",
						},
					],
				};
				const nextState = updateCanonSummary(
					consumePreviewRecord(state, confirmToken),
					{
						status: "clean",
						generatedAt,
						stale: false,
						summary: buildCanonSummary(
							"Safe memory fixes were applied successfully.",
							[],
							false,
							"Run canon_doctor memory to verify the file is clean.",
						),
						followups: result.followups,
					},
				);
				await saveCanonState(nextState, options.pluginConfig);
				return formatJsonContent(result);
			}

			const generatedAt = new Date().toISOString();

			if (params.mode === "preview") {
				const audit = await auditCanonSync(options.pluginConfig);
				const plan = await buildSyncFixPlan(
					options.pluginConfig,
					params.targetIds,
				);
				const status =
					plan.proposals.length > 0 || audit.findings.length > 0
						? "warning"
						: "clean";
				const result: CanonFixResult = normalizeResultInvariants({
					status,
					scope: "sync",
					mode: "preview",
					generatedAt,
					changes: plan.changes,
					findings: audit.findings,
					proposals: plan.proposals.length > 0 ? plan.proposals : undefined,
				});
				const { state } = await loadCanonState(options.pluginConfig);

				if (plan.changes.length === 0) {
					const nextState = updateCanonSummary(state, {
						status,
						generatedAt,
						stale: false,
						summary: buildCanonSummary(
							"Sync preview is ready for review.",
							audit.findings,
							false,
							audit.findings.length > 0
								? "Review proposal_only items or preview any mechanical sync rewrites."
								: "No mechanical sync rewrites are pending.",
						),
					});
					await saveCanonState(nextState, options.pluginConfig);
					return formatJsonContent(result);
				}

				const preview = createPreviewRecord(result);
				const resultWithToken: CanonFixResult = {
					...result,
					confirmToken: preview.token,
				};
				const nextState = updateCanonSummary(
					upsertPreviewRecord(state, preview),
					{
						status,
						generatedAt,
						stale: false,
						summary: buildCanonSummary(
							"Sync fix preview is ready for review.",
							audit.findings,
							false,
							"Review proposals and re-run canon_fix with mode=apply and the confirmToken.",
						),
					},
				);
				await saveCanonState(nextState, options.pluginConfig);
				return formatJsonContent(resultWithToken);
			}

			const { state } = await loadCanonState(options.pluginConfig);
			const confirmToken = params.confirmToken as string;
			const record = selectPreviewRecord(state, confirmToken, params.targetIds);
			await applySyncFixPlan(record);
			const result: CanonFixResult = {
				status: "clean",
				scope: "sync",
				mode: "apply",
				generatedAt,
				changes: record.changes,
				followups: [
					{
						kind: "template_sync",
						detail:
							"Re-run canon_doctor sync to verify the live package list is aligned across the allowed surfaces.",
					},
				],
			};
			const nextState = updateCanonSummary(
				consumePreviewRecord(state, confirmToken),
				{
					status: "clean",
					generatedAt,
					stale: false,
					summary: buildCanonSummary(
						"Sync fixes were applied successfully.",
						[],
						false,
						"Run canon_doctor sync to verify the allowed surfaces are aligned.",
					),
					followups: result.followups,
				},
			);
			await saveCanonState(nextState, options.pluginConfig);
			return formatJsonContent(result);
		},
	};
}
