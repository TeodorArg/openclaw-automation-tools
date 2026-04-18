import { Type } from "@sinclair/typebox";
import {
	applyMemoryFixPlan,
	buildMemoryFixPlan,
	createPreviewRecord,
	selectPreviewRecord,
} from "./runtime/fix/memory-fix.js";
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
		scope: Type.Literal("memory"),
		mode: Type.Union([Type.Literal("preview"), Type.Literal("apply")]),
		targetIds: Type.Optional(Type.Array(Type.String())),
		confirmToken: Type.Optional(Type.String()),
	},
	{ additionalProperties: false },
);

type CanonFixParams = {
	scope: "memory";
	mode: "preview" | "apply";
	targetIds?: string[];
	confirmToken?: string;
};

type CanonFixToolOptions = {
	pluginConfig?: {
		stateFilePath?: unknown;
		memoryFilePath?: unknown;
	};
};

export function createCanonFixTool(options: CanonFixToolOptions = {}) {
	return {
		name: "canon_fix",
		description:
			"Preview-first canon fix tool. Initial shipped scope supports safe memory fixes only.",
		parameters: CanonFixSchema,
		async execute(_toolCallId: string, params: CanonFixParams) {
			if (params.scope !== "memory") {
				throw new Error("canon_fix currently supports scope=memory only.");
			}

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

				if (plan.proposals.length === 0) {
					const nextState = updateCanonSummary(state, {
						status: "clean",
						generatedAt,
						stale: false,
						summary: buildCanonSummary(
							"No safe memory fixes are pending.",
							[],
							false,
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

			if (!params.confirmToken) {
				throw new Error("canon_fix apply requires confirmToken from preview.");
			}

			const { state } = await loadCanonState(options.pluginConfig);
			const record = selectPreviewRecord(
				state,
				params.confirmToken,
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
				consumePreviewRecord(state, params.confirmToken),
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
		},
	};
}
