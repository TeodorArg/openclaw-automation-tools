import type {
	BeforePromptBuildHookEvent,
	PluginHookContext,
} from "../../../api.js";
import type { SessionBloatWarningConfig } from "../config/plugin-config.js";
import { loadWarningState } from "../state/plugin-state.js";
import { getSessionState } from "../state/state-normalize.js";
import type {
	ContextWindowSource,
	DriftStatus,
	SessionSignalState,
} from "../state/state-types.js";

type OperatorDiagnosticsHooks = {
	beforePromptBuild: (
		event: BeforePromptBuildHookEvent,
		ctx: PluginHookContext,
	) => Promise<
		| {
				appendSystemContext: string;
		  }
		| undefined
	>;
};

export function createOperatorDiagnosticsHooks(
	config: SessionBloatWarningConfig,
): OperatorDiagnosticsHooks {
	return {
		beforePromptBuild: async (_event, ctx) => {
			if (!config.enableEarlyWarning) {
				return undefined;
			}

			const state = await loadWarningState(config.stateFilePath);
			const session = getSessionState(state, ctx.sessionKey);
			const block = buildOperatorContextSyncBlock(session.signals, ctx);
			if (!block) {
				return undefined;
			}

			return {
				appendSystemContext: block,
			};
		},
	};
}

export function buildOperatorContextSyncBlock(
	signals: SessionSignalState | undefined,
	ctx: PluginHookContext,
) {
	if (!signals) {
		return undefined;
	}

	const lines: string[] = [];
	pushLine(
		lines,
		"local estimate",
		formatMetric(signals.lastEstimatedInputTokens, "heuristic"),
	);
	pushLine(
		lines,
		"observed provider input",
		formatMetric(signals.lastInputTokens, "observed"),
	);
	pushLine(
		lines,
		"cached input",
		formatMetric(signals.lastCachedInputTokens, "observed"),
	);
	pushLine(
		lines,
		"observed output",
		formatMetric(signals.lastOutputTokens, "observed"),
	);
	pushLine(
		lines,
		"total observed usage",
		formatMetric(signals.lastTotalTokens, "observed"),
	);
	pushLine(lines, "drift", formatDrift(signals));
	pushLine(
		lines,
		"effective context window",
		formatEffectiveContextWindow(signals),
	);
	pushLine(lines, "reset / chain status", formatResetChain(signals));
	pushLine(
		lines,
		"provider / model / auth profile",
		formatIdentity(signals, ctx),
	);

	if (lines.length === 0) {
		return undefined;
	}

	return [
		"[operator diagnostics][context-sync]",
		...lines.map((line) => `- ${line}`),
	].join("\n");
}

function pushLine(lines: string[], label: string, value: string | undefined) {
	if (value) {
		lines.push(`${label}: ${value}`);
	}
}

function formatMetric(value: number | undefined, status: DriftStatus) {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return status === "observed" ? "missing" : status;
	}
	return `${Math.round(value)} (${status})`;
}

function formatDrift(signals: SessionSignalState) {
	const parts: string[] = [];
	if (typeof signals.estimateObservedDriftTokens === "number") {
		parts.push(`${Math.round(signals.estimateObservedDriftTokens)}`);
	}
	if (typeof signals.estimateObservedDriftRatio === "number") {
		parts.push(`${Math.round(signals.estimateObservedDriftRatio * 100)}%`);
	}
	if (parts.length === 0) {
		return signals.driftStatus ?? "missing";
	}
	return `${parts.join(", ")} (${signals.driftStatus ?? "observed"})`;
}

function formatEffectiveContextWindow(signals: SessionSignalState) {
	if (
		typeof signals.effectiveContextWindowTokens !== "number" ||
		!Number.isFinite(signals.effectiveContextWindowTokens)
	) {
		return "missing";
	}
	const source = formatContextWindowSource(
		signals.effectiveContextWindowSource,
	);
	return `${Math.round(signals.effectiveContextWindowTokens)} (${source})`;
}

function formatContextWindowSource(source: ContextWindowSource | undefined) {
	return source ?? "missing";
}

function formatResetChain(signals: SessionSignalState) {
	const parts: string[] = [];
	parts.push(`chain=${signals.providerChainStatus ?? "unknown"}`);
	parts.push(
		`reset=${signals.resetIntegrityStatus === "ok" ? "observed" : (signals.resetIntegrityStatus ?? "unknown")}`,
	);
	if (signals.lastResetReason) {
		parts.push(`reason=${signals.lastResetReason}`);
	}
	return parts.join(", ");
}

function formatIdentity(signals: SessionSignalState, ctx: PluginHookContext) {
	const provider = signals.lastProvider ?? "missing";
	const model = signals.lastModel ?? "missing";
	const authProfile =
		signals.lastAuthProfile ??
		(typeof (ctx as Record<string, unknown>).authProfileOverride === "string"
			? ((ctx as Record<string, unknown>).authProfileOverride as string)
			: "missing");
	return `${provider} / ${model} / ${authProfile}`;
}
