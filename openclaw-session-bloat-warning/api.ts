export type PluginRuntime = unknown;

export type SessionHookEvent = {
	type?: string;
	action?: string;
	sessionKey?: string;
	timestamp?: string;
	messages?: string[];
	context?: Record<string, unknown>;
};

export type OpenClawPluginApi = {
	pluginConfig?: Record<string, unknown>;
	runtime: PluginRuntime;
	registerHook(
		events: string | string[],
		handler: (event: SessionHookEvent) => void | Promise<void>,
		opts?: { priority?: number },
	): void;
};

export { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
