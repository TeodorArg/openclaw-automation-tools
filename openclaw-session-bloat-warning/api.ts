export type PluginRuntime = unknown;

export type PluginHookContext = {
	sessionKey?: string;
};

export type BeforeCompactionHookEvent = {
	messageCount?: number;
	compactingCount?: number;
	tokenCount?: number;
	messages?: string[];
	sessionFile?: string;
};

export type AfterCompactionHookEvent = {
	messageCount?: number;
	compactedCount?: number;
	tokenCount?: number;
	messages?: string[];
	sessionFile?: string;
};

export type OpenClawPluginApi = {
	pluginConfig?: Record<string, unknown>;
	runtime: PluginRuntime;
	on(
		hookName: "before_compaction" | "after_compaction",
		handler: (
			event: BeforeCompactionHookEvent | AfterCompactionHookEvent,
			ctx: PluginHookContext,
		) => void | Promise<void>,
		opts?: { priority?: number },
	): void;
};

export { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
