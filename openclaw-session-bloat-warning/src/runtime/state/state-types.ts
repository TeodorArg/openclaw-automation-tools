export const WARNING_STATE_SCHEMA_VERSION = 1;
export const WARNING_STATE_PLUGIN_ID = "openclaw-session-bloat-warning";
export const DEFAULT_SESSION_STATE_KEY = "__default__";

export type SessionWarningState = {
	beforeWarnings: number;
	afterWarnings: number;
	lastUpdatedAt?: string;
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
