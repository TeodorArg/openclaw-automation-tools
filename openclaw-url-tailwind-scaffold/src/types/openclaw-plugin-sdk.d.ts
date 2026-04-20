declare module "openclaw/plugin-sdk/plugin-entry" {
	type OpenClawPluginApi = {
		pluginConfig?: Record<string, unknown>;
		runtime: unknown;
		registerTool(
			tool:
				| unknown
				| ((context: { agentId?: string; sessionKey?: string }) => unknown),
			opts?: { optional?: boolean },
		): void;
	};

	export function definePluginEntry(entry: {
		id: string;
		name: string;
		description: string;
		register(api: OpenClawPluginApi): void;
	}): unknown;
}
