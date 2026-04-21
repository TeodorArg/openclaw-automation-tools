export type AnyAgentTool = unknown;
export type PluginRuntime = unknown;
export type OpenClawPluginToolContext = {
	agentId?: string;
	sessionKey?: string;
};

export type PluginHookContext = {
	sessionKey?: string;
	runId?: string;
};

export type BeforePromptBuildHookEvent = {
	prompt?: string;
	messages?: unknown[];
	systemPrompt?: string;
};

export type BeforeAgentReplyHookEvent = {
	cleanedBody?: string;
};

export type ReplyPayload = {
	text?: string;
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

export type LlmInputHookEvent = {
	runId?: string;
	sessionId?: string;
	provider?: string;
	model?: string;
	systemPrompt?: string;
	prompt?: string;
	historyMessages?: unknown[];
	imagesCount?: number;
};

export type LlmOutputUsage = {
	input?: number;
	output?: number;
	cacheRead?: number;
	cacheWrite?: number;
	total?: number;
};

export type LlmOutputHookEvent = {
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

export type OpenClawPluginApi = {
	pluginConfig?: Record<string, unknown>;
	runtime: PluginRuntime;
	registerTool(
		tool: unknown | ((context: OpenClawPluginToolContext) => unknown),
		opts?: { optional?: boolean },
	): void;
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

export { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
