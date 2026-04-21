import { formatJsonContent } from "./runtime/report/json-content.js";
import { loadWarningState } from "./runtime/state/plugin-state.js";
import { getSessionState } from "./runtime/state/state-normalize.js";
import type {
	ContextWindowSource,
	SessionSignalState,
} from "./runtime/state/state-types.js";

const SessionBloatStatusSchema = {
	type: "object",
	additionalProperties: false,
	properties: {
		sessionKey: {
			type: "string",
			minLength: 1,
		},
	},
} as const;

type SessionBloatStatusParams = {
	sessionKey?: string;
};

type SessionBloatStatusToolOptions = {
	pluginConfig?: {
		stateFilePath?: unknown;
	};
};

export function createSessionBloatStatusTool(
	options: SessionBloatStatusToolOptions = {},
) {
	return {
		name: "session_bloat_status",
		description:
			"Returns compact operator-facing session context-sync and diagnostics status from plugin runtime truth.",
		parameters: SessionBloatStatusSchema,
		async execute(_toolCallId: string, params: SessionBloatStatusParams) {
			const state = await loadWarningState(
				typeof options.pluginConfig?.stateFilePath === "string"
					? options.pluginConfig.stateFilePath
					: ".openclaw-session-bloat-warning-state.json",
			);
			const session = getSessionState(state, params.sessionKey);
			const payload = buildSessionBloatStatusSnapshot({
				sessionKey: params.sessionKey,
				signals: session.signals,
				updatedAt: session.lastUpdatedAt ?? state.updatedAt,
			});
			return formatJsonContent(payload);
		},
	};
}

export function buildSessionBloatStatusSnapshot(params: {
	sessionKey?: string;
	signals?: SessionSignalState;
	updatedAt?: string;
}) {
	return {
		sessionKey: params.sessionKey ?? "__default__",
		updatedAt: params.updatedAt,
		contextSync: {
			localEstimate: formatMetric(
				params.signals?.lastEstimatedInputTokens,
				"heuristic",
			),
			observedProviderInput: formatMetric(
				params.signals?.lastInputTokens,
				"observed",
			),
			cachedInput: formatMetric(
				params.signals?.lastCachedInputTokens,
				"observed",
			),
			observedOutput: formatMetric(
				params.signals?.lastOutputTokens,
				"observed",
			),
			totalObservedUsage: formatMetric(
				params.signals?.lastTotalTokens,
				"observed",
			),
			drift: formatDrift(params.signals),
			effectiveContextWindow: formatEffectiveContextWindow(params.signals),
			resetChainStatus: {
				providerChainStatus: params.signals?.providerChainStatus ?? "unknown",
				resetIntegrityStatus:
					params.signals?.resetIntegrityStatus === "ok"
						? "observed"
						: (params.signals?.resetIntegrityStatus ?? "unknown"),
				lastResetReason: params.signals?.lastResetReason ?? "unknown",
			},
			identity: {
				provider: params.signals?.lastProvider ?? "missing",
				model: params.signals?.lastModel ?? "missing",
				authProfile: params.signals?.lastAuthProfile ?? "missing",
			},
		},
	};
}

function formatMetric(
	value: number | undefined,
	status: "observed" | "heuristic",
) {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return {
			value: undefined,
			status: status === "observed" ? "missing" : status,
		};
	}
	return {
		value: Math.round(value),
		status,
	};
}

function formatDrift(signals: SessionSignalState | undefined) {
	return {
		tokens:
			typeof signals?.estimateObservedDriftTokens === "number"
				? Math.round(signals.estimateObservedDriftTokens)
				: undefined,
		ratio:
			typeof signals?.estimateObservedDriftRatio === "number"
				? Math.round(signals.estimateObservedDriftRatio * 1000) / 1000
				: undefined,
		status: signals?.driftStatus ?? "missing",
	};
}

function formatEffectiveContextWindow(signals: SessionSignalState | undefined) {
	if (
		typeof signals?.effectiveContextWindowTokens !== "number" ||
		!Number.isFinite(signals.effectiveContextWindowTokens)
	) {
		return {
			tokens: undefined,
			source: "missing",
		};
	}
	return {
		tokens: Math.round(signals.effectiveContextWindowTokens),
		source: (signals.effectiveContextWindowSource ?? "missing") as
			| ContextWindowSource
			| "missing",
	};
}
