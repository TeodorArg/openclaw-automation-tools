export const WARNING_STATE_SCHEMA_VERSION = 1;
export const WARNING_STATE_PLUGIN_ID = "openclaw-session-bloat-warning";
export const DEFAULT_SESSION_STATE_KEY = "__default__";

export type WarningSeverity = "warning" | "elevated" | "critical";

export type ContextWindowSource =
	| "provider_catalog"
	| "auth_profile"
	| "plugin_fallback"
	| "safe_default";

export type ObservedUsageAvailability = "present" | "missing";

export type DriftStatus = "observed" | "missing" | "heuristic";

export type SessionSignalState = {
	lastInputChars?: number;
	lastMessageCount?: number;
	lastInputTokens?: number;
	lastEstimatedInputTokens?: number;
	lastCachedInputTokens?: number;
	lastCacheWriteTokens?: number;
	lastOutputTokens?: number;
	lastTotalTokens?: number;
	estimateObservedDriftTokens?: number;
	estimateObservedDriftRatio?: number;
	driftStatus?: DriftStatus;
	observedUsageAvailability?: ObservedUsageAvailability;
	lastSeverity?: WarningSeverity;
	lastReasonCode?: string;
	lastRunId?: string;
	lastProvider?: string;
	lastModel?: string;
	lastAuthProfile?: string;
	effectiveContextWindowTokens?: number;
	effectiveContextWindowSource?: ContextWindowSource;
	effectiveContextWindowResolvedAt?: string;
	providerChainStatus?: "fresh" | "unknown";
	resetIntegrityStatus?: "ok" | "suspicious" | "unknown";
	lastSessionId?: string;
	lastSessionIdChangedAt?: string;
	lastIdentityChangedAt?: string;
	lastIdentityChangeKind?: "provider" | "model" | "auth_profile" | "session";
	lastResetReason?:
		| "session_changed"
		| "provider_changed"
		| "model_changed"
		| "auth_profile_changed"
		| "unknown";
	timeoutRiskStreak?: number;
	lanePressureStreak?: number;
	noReplyStreak?: number;
	lastObservedTimeoutMs?: number;
	lastObservedLaneWaitMs?: number;
	lastObservedAt?: string;
};

export type SessionWarningState = {
	beforeWarnings: number;
	afterWarnings: number;
	earlyWarnings: number;
	turnCount?: number;
	lastUpdatedAt?: string;
	cooldownUntilTurn?: number;
	lastWarnedTurn?: number;
	signals?: SessionSignalState;
};

export type WarningStateV1 = {
	schemaVersion: 1;
	pluginId: typeof WARNING_STATE_PLUGIN_ID;
	updatedAt?: string;
	sessions: Record<string, SessionWarningState>;
};

export type LegacyWarningState = {
	sessions?: Record<string, unknown>;
};

export type WarningState = WarningStateV1;
