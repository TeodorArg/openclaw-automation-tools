import {
	DEFAULT_SESSION_STATE_KEY,
	type SessionWarningState,
	WARNING_STATE_PLUGIN_ID,
	WARNING_STATE_SCHEMA_VERSION,
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
	};
}

function normalizeSessionWarningState(value: unknown): SessionWarningState {
	const record = asRecord(value);

	return {
		beforeWarnings: readCounter(record.beforeWarnings),
		afterWarnings: readCounter(record.afterWarnings),
		lastUpdatedAt:
			typeof record.lastUpdatedAt === "string"
				? record.lastUpdatedAt
				: undefined,
	};
}

function readCounter(value: unknown) {
	return typeof value === "number" && Number.isInteger(value) && value >= 0
		? value
		: 0;
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object"
		? (value as Record<string, unknown>)
		: {};
}
