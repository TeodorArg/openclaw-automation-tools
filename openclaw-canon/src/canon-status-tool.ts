import { Type } from "@sinclair/typebox";
import { formatJsonContent } from "./runtime/report/json-content.js";
import { loadCanonState, saveCanonState } from "./runtime/state/canon-file.js";
import { updateCanonSummary } from "./runtime/state/canon-state.js";
import { buildStatusSnapshot } from "./runtime/status/status-summary.js";

const CanonStatusSchema = Type.Object(
	{
		mode: Type.Literal("summary"),
		refresh: Type.Optional(
			Type.Union([Type.Literal("none"), Type.Literal("light")]),
		),
	},
	{ additionalProperties: false },
);

type CanonStatusParams = {
	mode: "summary";
	refresh?: "none" | "light";
};

type CanonStatusToolOptions = {
	pluginConfig?: {
		stateFilePath?: unknown;
	};
};

export function createCanonStatusTool(options: CanonStatusToolOptions = {}) {
	return {
		name: "canon_status",
		description:
			"Returns the latest known canon summary snapshot with optional lightweight freshness checks.",
		parameters: CanonStatusSchema,
		async execute(_toolCallId: string, params: CanonStatusParams) {
			if (params.mode !== "summary") {
				throw new Error("canon_status only supports mode=summary.");
			}

			const { state } = await loadCanonState(options.pluginConfig);
			const result = buildStatusSnapshot(state, params.refresh ?? "none");
			const nextState = updateCanonSummary(state, result);
			await saveCanonState(nextState, options.pluginConfig);
			return formatJsonContent(result);
		},
	};
}
