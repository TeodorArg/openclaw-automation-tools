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

	return {
		beforeWarnings: readCounter(record.beforeWarnings),
		afterWarnings: readCounter(record.afterWarnings),
		earlyWarnings: readCounter(record.earlyWarnings),
		turnCount: readOptionalCounter(record.turnCount),
		lastUpdatedAt:
			typeof record.lastUpdatedAt === "string"
				? record.lastUpdatedAt
				: undefined,
		cooldownUntilTurn: readOptionalCounter(record.cooldownUntilTurn),
		lastWarnedTurn: readOptionalCounter(record.lastWarnedTurn),
		signals: normalizeSignalState(record.signals),
	};
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
