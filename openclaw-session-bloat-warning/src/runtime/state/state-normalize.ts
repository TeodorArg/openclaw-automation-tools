import {
	DEFAULT_SESSION_STATE_KEY,
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
		lastSeverity: readSeverity(record.lastSeverity),
		lastReasonCode:
			typeof record.lastReasonCode === "string"
				? record.lastReasonCode
				: undefined,
		lastRunId:
			typeof record.lastRunId === "string" ? record.lastRunId : undefined,
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

function readSeverity(value: unknown): WarningSeverity | undefined {
	return value === "warning" || value === "elevated" || value === "critical"
		? value
		: undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object"
		? (value as Record<string, unknown>)
		: {};
}
