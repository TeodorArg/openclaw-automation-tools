declare module "openclaw/plugin-sdk/plugin-entry" {
	type PluginHookContext = {
		sessionKey?: string;
	};

	type BeforeCompactionHookEvent = {
		messageCount?: number;
		compactingCount?: number;
		tokenCount?: number;
		messages?: string[];
		sessionFile?: string;
	};

	type AfterCompactionHookEvent = {
		messageCount?: number;
		compactedCount?: number;
		tokenCount?: number;
		messages?: string[];
		sessionFile?: string;
	};

	type OpenClawPluginApi = {
		pluginConfig?: Record<string, unknown>;
		runtime: unknown;
		on(
			hookName: "before_compaction" | "after_compaction",
			handler: (
				event: BeforeCompactionHookEvent | AfterCompactionHookEvent,
				ctx: PluginHookContext,
			) => void | Promise<void>,
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
