import {
	type ContextWindowSource,
	DEFAULT_SESSION_STATE_KEY,
	type DriftStatus,
	type ObservedUsageAvailability,
	type SessionSignalState,
	type SessionWarningState,
	WARNING_STATE_PLUGIN_ID,
	WARNING_STATE_SCHEMA_VERSION,
	type WarningSeverity,
	type WarningState,
} from "./state-types.js";

export function normalizeWarningState(value: unknown): WarningState {
	const record = asRecord(value);
	const sessionsRecord = asRecord(record.sessions);

	return {
		schemaVersion: WARNING_STATE_SCHEMA_VERSION,
		pluginId: WARNING_STATE_PLUGIN_ID,
		updatedAt:
			typeof record.updatedAt === "string" ? record.updatedAt : undefined,
		sessions: Object.fromEntries(
			Object.entries(sessionsRecord).map(([key, sessionValue]) => [
				key,
				normalizeSessionWarningState(sessionValue),
			]),
		),
	};
}

export function getSessionState(
	state: WarningState,
	sessionKey: string | undefined,
): SessionWarningState {
	const key =
		typeof sessionKey === "string" && sessionKey.trim().length > 0
			? sessionKey
			: DEFAULT_SESSION_STATE_KEY;

	state.sessions[key] ??= createEmptySessionWarningState();
	return state.sessions[key];
}

export function createEmptyWarningState(): WarningState {
	return {
		schemaVersion: WARNING_STATE_SCHEMA_VERSION,
		pluginId: WARNING_STATE_PLUGIN_ID,
		sessions: {},
	};
}

function createEmptySessionWarningState(): SessionWarningState {
	return {
		beforeWarnings: 0,
		afterWarnings: 0,
		earlyWarnings: 0,
	};
}

function normalizeSessionWarningState(value: unknown): SessionWarningState {
	const record = asRecord(value);
	const beforeWarnings = readCounter(record.beforeWarnings);
	const afterWarnings = readCounter(record.afterWarnings);
	const earlyWarnings = readCounter(record.earlyWarnings);
	const lastWarnedTurn = readOptionalCounter(record.lastWarnedTurn);
	const cooldownUntilTurn = readOptionalCounter(record.cooldownUntilTurn);
	const turnCount = normalizeTurnCount({
		beforeWarnings,
		afterWarnings,
		earlyWarnings,
		turnCount: readOptionalCounter(record.turnCount),
		lastWarnedTurn,
		cooldownUntilTurn,
	});

	return {
		beforeWarnings,
		afterWarnings,
		earlyWarnings,
		turnCount,
		lastUpdatedAt:
			typeof record.lastUpdatedAt === "string"
				? record.lastUpdatedAt
				: undefined,
		cooldownUntilTurn,
		lastWarnedTurn,
		signals: normalizeSignalState(record.signals),
	};
}

function normalizeTurnCount(params: {
	beforeWarnings: number;
	afterWarnings: number;
	earlyWarnings: number;
	turnCount: number | undefined;
	lastWarnedTurn: number | undefined;
	cooldownUntilTurn: number | undefined;
}) {
	if (params.turnCount !== undefined) {
		return params.turnCount;
	}

	const legacyTurnCount =
		params.beforeWarnings + params.afterWarnings + params.earlyWarnings;
	const cooldownFloor =
		params.cooldownUntilTurn !== undefined
			? Math.max(0, params.cooldownUntilTurn - 1)
			: 0;

	return Math.max(legacyTurnCount, params.lastWarnedTurn ?? 0, cooldownFloor);
}

function normalizeSignalState(value: unknown) {
	const record = asRecord(value);
	const signalState = {
		lastInputChars: readOptionalCounter(record.lastInputChars),
		lastMessageCount: readOptionalCounter(record.lastMessageCount),
		lastInputTokens: readOptionalCounter(record.lastInputTokens),
		lastEstimatedInputTokens: readOptionalCounter(
			record.lastEstimatedInputTokens,
		),
		lastCachedInputTokens: readOptionalCounter(record.lastCachedInputTokens),
		lastCacheWriteTokens: readOptionalCounter(record.lastCacheWriteTokens),
		lastOutputTokens: readOptionalCounter(record.lastOutputTokens),
		lastTotalTokens: readOptionalCounter(record.lastTotalTokens),
		estimateObservedDriftTokens: readOptionalCounter(
			record.estimateObservedDriftTokens,
		),
		estimateObservedDriftRatio: readOptionalNumber(
			record.estimateObservedDriftRatio,
		),
		driftStatus: readDriftStatus(record.driftStatus),
		observedUsageAvailability: readObservedUsageAvailability(
			record.observedUsageAvailability,
		),
		lastSeverity: readSeverity(record.lastSeverity),
		lastReasonCode:
			typeof record.lastReasonCode === "string"
				? record.lastReasonCode
				: undefined,
		lastRunId:
			typeof record.lastRunId === "string" ? record.lastRunId : undefined,
		lastProvider:
			typeof record.lastProvider === "string" ? record.lastProvider : undefined,
		lastModel:
			typeof record.lastModel === "string" ? record.lastModel : undefined,
		lastAuthProfile:
			typeof record.lastAuthProfile === "string"
				? record.lastAuthProfile
				: undefined,
		effectiveContextWindowTokens: readOptionalCounter(
			record.effectiveContextWindowTokens,
		),
		effectiveContextWindowSource: readContextWindowSource(
			record.effectiveContextWindowSource,
		),
		effectiveContextWindowResolvedAt:
			typeof record.effectiveContextWindowResolvedAt === "string"
				? record.effectiveContextWindowResolvedAt
				: undefined,
		providerChainStatus: readProviderChainStatus(record.providerChainStatus),
		resetIntegrityStatus: readResetIntegrityStatus(record.resetIntegrityStatus),
		lastSessionId:
			typeof record.lastSessionId === "string"
				? record.lastSessionId
				: undefined,
		lastSessionIdChangedAt:
			typeof record.lastSessionIdChangedAt === "string"
				? record.lastSessionIdChangedAt
				: undefined,
		lastIdentityChangedAt:
			typeof record.lastIdentityChangedAt === "string"
				? record.lastIdentityChangedAt
				: undefined,
		lastIdentityChangeKind: readIdentityChangeKind(
			record.lastIdentityChangeKind,
		),
		lastResetReason: readResetReason(record.lastResetReason),
		timeoutRiskStreak: readOptionalCounter(record.timeoutRiskStreak),
		lanePressureStreak: readOptionalCounter(record.lanePressureStreak),
		noReplyStreak: readOptionalCounter(record.noReplyStreak),
		lastObservedTimeoutMs: readOptionalCounter(record.lastObservedTimeoutMs),
		lastObservedLaneWaitMs: readOptionalCounter(record.lastObservedLaneWaitMs),
		lastObservedAt:
			typeof record.lastObservedAt === "string"
				? record.lastObservedAt
				: undefined,
	};

	return Object.values(signalState).some((value) => value !== undefined)
		? signalState
		: undefined;
}

function readCounter(value: unknown) {
	return typeof value === "number" && Number.isInteger(value) && value >= 0
		? value
		: 0;
}

function readOptionalCounter(value: unknown) {
	return typeof value === "number" && Number.isInteger(value) && value >= 0
		? value
		: undefined;
}

function readOptionalNumber(value: unknown) {
	return typeof value === "number" && Number.isFinite(value) && value >= 0
		? value
		: undefined;
}

function readSeverity(value: unknown): WarningSeverity | undefined {
	return value === "warning" || value === "elevated" || value === "critical"
		? value
		: undefined;
}

function readDriftStatus(value: unknown): DriftStatus | undefined {
	return value === "observed" || value === "missing" || value === "heuristic"
		? value
		: undefined;
}

function readObservedUsageAvailability(
	value: unknown,
): ObservedUsageAvailability | undefined {
	return value === "present" || value === "missing" ? value : undefined;
}

function readContextWindowSource(
	value: unknown,
): ContextWindowSource | undefined {
	return value === "provider_catalog" ||
		value === "auth_profile" ||
		value === "plugin_fallback" ||
		value === "safe_default"
		? value
		: undefined;
}

function readProviderChainStatus(
	value: unknown,
): SessionSignalState["providerChainStatus"] {
	return value === "fresh" || value === "unknown" ? value : undefined;
}

function readResetIntegrityStatus(
	value: unknown,
): SessionSignalState["resetIntegrityStatus"] {
	return value === "ok" || value === "suspicious" || value === "unknown"
		? value
		: undefined;
}

function readIdentityChangeKind(
	value: unknown,
): SessionSignalState["lastIdentityChangeKind"] {
	return value === "provider" ||
		value === "model" ||
		value === "auth_profile" ||
		value === "session"
		? value
		: undefined;
}

function readResetReason(
	value: unknown,
): SessionSignalState["lastResetReason"] {
	return value === "session_changed" ||
		value === "provider_changed" ||
		value === "model_changed" ||
		value === "auth_profile_changed" ||
		value === "unknown"
		? value
		: undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object"
		? (value as Record<string, unknown>)
		: {};
}
