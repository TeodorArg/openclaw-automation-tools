declare module "openclaw/plugin-sdk/plugin-entry" {
	type SessionHookEvent = {
		type?: string;
		action?: string;
		sessionKey?: string;
		timestamp?: string;
		messages?: string[];
		context?: Record<string, unknown>;
	};

	type OpenClawPluginApi = {
		pluginConfig?: Record<string, unknown>;
		runtime: unknown;
		registerHook(
			events: string | string[],
			handler: (event: SessionHookEvent) => void | Promise<void>,
			opts?: { priority?: number },
		): void;
	};

	export function definePluginEntry(entry: {
		id: string;
		name: string;
		description: string;
		register(api: OpenClawPluginApi): void;
	}): unknown;
}
