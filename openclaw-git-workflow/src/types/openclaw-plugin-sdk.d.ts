declare module "@openclaw/plugin-sdk" {
	export type AnyAgentTool = unknown;
	export type OpenClawPluginApi = {
		registerTool(tool: unknown, opts?: { optional?: boolean }): void;
	};
}

declare module "openclaw/plugin-sdk/plugin-entry" {
	export function definePluginEntry(entry: {
		id: string;
		name: string;
		description: string;
		register(api: import("@openclaw/plugin-sdk").OpenClawPluginApi): void;
	}): unknown;
}
