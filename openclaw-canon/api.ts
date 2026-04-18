export type AnyAgentTool = unknown;
export type PluginRuntime = unknown;
export type OpenClawPluginToolContext = {
	agentId?: string;
	sessionKey?: string;
};
export type OpenClawPluginApi = {
	pluginConfig?: Record<string, unknown>;
	runtime: PluginRuntime;
	registerTool(
		tool: unknown | ((context: OpenClawPluginToolContext) => unknown),
		opts?: { optional?: boolean },
	): void;
};
export { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
