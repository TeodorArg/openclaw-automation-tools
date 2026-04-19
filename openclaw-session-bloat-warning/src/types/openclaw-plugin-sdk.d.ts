declare module "openclaw/plugin-sdk/plugin-entry" {
	type PluginHookContext = {
		sessionKey?: string;
		runId?: string;
	};

	type BeforePromptBuildHookEvent = {
		prompt?: string;
		messages?: unknown[];
		systemPrompt?: string;
	};

	type BeforeAgentReplyHookEvent = {
		cleanedBody?: string;
	};

	type ReplyPayload = {
		text?: string;
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

	type LlmInputHookEvent = {
		runId?: string;
		sessionId?: string;
		provider?: string;
		model?: string;
		systemPrompt?: string;
		prompt?: string;
		historyMessages?: unknown[];
		imagesCount?: number;
	};

	type LlmOutputUsage = {
		input?: number;
		output?: number;
		cacheRead?: number;
		cacheWrite?: number;
		total?: number;
	};

	type LlmOutputHookEvent = {
		runId?: string;
		sessionId?: string;
		provider?: string;
		model?: string;
		assistantTexts?: string[];
		lastAssistant?: {
			stopReason?: string;
			errorMessage?: string;
			provider?: string;
			model?: string;
		};
		usage?: LlmOutputUsage;
	};

	type OpenClawPluginApi = {
		pluginConfig?: Record<string, unknown>;
		runtime: unknown;
		on(
			hookName: "before_compaction",
			handler: (
				event: BeforeCompactionHookEvent,
				ctx: PluginHookContext,
			) => void | Promise<void>,
			opts?: { priority?: number },
		): void;
		on(
			hookName: "after_compaction",
			handler: (
				event: AfterCompactionHookEvent,
				ctx: PluginHookContext,
			) => void | Promise<void>,
			opts?: { priority?: number },
		): void;
		on(
			hookName: "before_prompt_build",
			handler: (
				event: BeforePromptBuildHookEvent,
				ctx: PluginHookContext,
			) =>
				| {
						prependSystemContext?: string;
						appendSystemContext?: string;
						prependContext?: string;
						systemPrompt?: string;
				  }
				| undefined
				| Promise<
						| {
								prependSystemContext?: string;
								appendSystemContext?: string;
								prependContext?: string;
								systemPrompt?: string;
						  }
						| undefined
				  >,
			opts?: { priority?: number },
		): void;
		on(
			hookName: "before_agent_reply",
			handler: (
				event: BeforeAgentReplyHookEvent,
				ctx: PluginHookContext,
			) =>
				| { handled: boolean; reply?: ReplyPayload; reason?: string }
				| undefined
				| Promise<
						| { handled: boolean; reply?: ReplyPayload; reason?: string }
						| undefined
				  >,
			opts?: { priority?: number },
		): void;
		on(
			hookName: "llm_input",
			handler: (
				event: LlmInputHookEvent,
				ctx: PluginHookContext,
			) => void | Promise<void>,
			opts?: { priority?: number },
		): void;
		on(
			hookName: "llm_output",
			handler: (
				event: LlmOutputHookEvent,
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
