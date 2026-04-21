import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { SessionBloatWarningConfig } from "../runtime/config/plugin-config.js";
import { getEarlyWarningMessage } from "../runtime/core/early-warning-core.js";
import { createEarlyWarningDeliveryHooks } from "../runtime/hooks/early-warning-delivery-hooks.js";
import {
	buildOperatorContextSyncBlock,
	createOperatorDiagnosticsHooks,
} from "../runtime/hooks/operator-diagnostics-hooks.js";
import { createCompactionWarningHooks } from "../runtime/hooks/session-compact-hooks.js";
import {
	WARNING_STATE_PLUGIN_ID,
	WARNING_STATE_SCHEMA_VERSION,
} from "../runtime/state/state-types.js";

describe("session compact hooks", () => {
	it("adds a pre-compaction warning and persists state", async () => {
		const fixture = await createFixture();
		const hooks = createCompactionWarningHooks(fixture.config);
		const event = {
			messages: [] as string[],
		};

		await hooks.beforeCompaction(event, {
			sessionKey: "agent:main:main",
		});

		expect(event.messages).toHaveLength(1);
		const state = JSON.parse(
			await readFile(fixture.config.stateFilePath, "utf8"),
		) as {
			sessions: Record<
				string,
				{ beforeWarnings: number; afterWarnings: number }
			>;
		};
		expect(state.schemaVersion).toBe(WARNING_STATE_SCHEMA_VERSION);
		expect(state.pluginId).toBe(WARNING_STATE_PLUGIN_ID);
		expect(state.sessions["agent:main:main"]?.beforeWarnings).toBe(1);
	});

	it("does not emit duplicate post-compaction notes beyond the configured ceiling", async () => {
		const fixture = await createFixture();
		const hooks = createCompactionWarningHooks({
			...fixture.config,
			enablePreCompactionWarning: false,
			maxWarningsPerSession: 1,
		});
		const firstEvent = {
			sessionKey: "agent:main:main",
			messages: [] as string[],
		};
		const secondEvent = {
			messages: [] as string[],
		};

		await hooks.afterCompaction(firstEvent, {
			sessionKey: "agent:main:main",
		});
		await hooks.afterCompaction(secondEvent, {
			sessionKey: "agent:main:main",
		});

		expect(firstEvent.messages).toHaveLength(1);
		expect(secondEvent.messages).toHaveLength(0);
	});

	it("uses the default bucket when the hook context has no sessionKey", async () => {
		const fixture = await createFixture();
		const hooks = createCompactionWarningHooks(fixture.config);
		const event = {
			messages: [] as string[],
		};

		await hooks.beforeCompaction(event, {});

		const state = JSON.parse(
			await readFile(fixture.config.stateFilePath, "utf8"),
		) as {
			sessions: Record<string, { beforeWarnings: number }>;
		};
		expect(state.sessions.__default__?.beforeWarnings).toBe(1);
	});

	it("does not append or persist when the hook event has no writable messages", async () => {
		const fixture = await createFixture();
		const hooks = createCompactionWarningHooks(fixture.config);

		await hooks.beforeCompaction(
			{},
			{
				sessionKey: "agent:main:main",
			},
		);

		await expect(
			readFile(fixture.config.stateFilePath, "utf8"),
		).rejects.toMatchObject({
			code: "ENOENT",
		});
	});

	it("gates post-compaction notes against prior pre-compaction warnings", async () => {
		const fixture = await createFixture();
		const hooks = createCompactionWarningHooks(fixture.config);
		const event = {
			messages: [] as string[],
		};

		await hooks.afterCompaction(event, {
			sessionKey: "agent:main:main",
		});

		expect(event.messages).toHaveLength(0);
	});

	it("tracks early-warning signal state on llm_input without delivering yet", async () => {
		const fixture = await createFixture();
		const hooks = createCompactionWarningHooks(fixture.config);

		await hooks.llmInput(
			{
				runId: "run-1",
				systemPrompt: "a".repeat(50000),
				prompt: "b".repeat(80000),
				historyMessages: [{ role: "user", content: "hello" }],
			},
			{ sessionKey: "agent:main:main" },
		);

		const state = JSON.parse(
			await readFile(fixture.config.stateFilePath, "utf8"),
		) as {
			sessions: Record<
				string,
				{ earlyWarnings: number; signals?: { lastReasonCode?: string } }
			>;
		};
		expect(state.sessions["agent:main:main"]?.earlyWarnings).toBe(0);
		expect(state.sessions["agent:main:main"]?.signals?.lastReasonCode).toBe(
			"history_chars",
		);
	});

	it("stores observed llm_output runtime truth and usage details", async () => {
		const fixture = await createFixture();
		const hooks = createCompactionWarningHooks(fixture.config);

		await hooks.llmOutput(
			{
				runId: "run-2",
				sessionId: "session-2",
				provider: "openai-codex",
				model: "gpt-5.4",
				usage: {
					input: 130432,
					cacheRead: 41000,
					output: 901,
					total: 172333,
				},
			},
			{
				sessionKey: "agent:main:main",
				authProfileOverride: "openai-codex:teodorph2025@gmail.com",
			} as never,
		);

		const state = JSON.parse(
			await readFile(fixture.config.stateFilePath, "utf8"),
		) as {
			sessions: Record<
				string,
				{
					signals?: {
						lastInputTokens?: number;
						lastEstimatedInputTokens?: number;
						lastCachedInputTokens?: number;
						lastOutputTokens?: number;
						lastCacheWriteTokens?: number;
						lastTotalTokens?: number;
						estimateObservedDriftTokens?: number;
						estimateObservedDriftRatio?: number;
						driftStatus?: string;
						observedUsageAvailability?: string;
						lastRunId?: string;
						lastProvider?: string;
						lastModel?: string;
						lastAuthProfile?: string;
						effectiveContextWindowTokens?: number;
						effectiveContextWindowSource?: string;
					};
				}
			>;
		};
		const signals = state.sessions["agent:main:main"]?.signals;
		expect(signals?.lastInputTokens).toBe(130432);
		expect(signals?.lastEstimatedInputTokens).toBeUndefined();
		expect(signals?.lastCachedInputTokens).toBe(41000);
		expect(signals?.lastCacheWriteTokens).toBeUndefined();
		expect(signals?.lastOutputTokens).toBe(901);
		expect(signals?.lastTotalTokens).toBe(172333);
		expect(signals?.observedUsageAvailability).toBe("present");
		expect(signals?.lastRunId).toBe("run-2");
		expect(signals?.lastProvider).toBe("openai-codex");
		expect(signals?.lastModel).toBe("gpt-5.4");
		expect(signals?.lastAuthProfile).toBe(
			"openai-codex:teodorph2025@gmail.com",
		);
		expect(signals?.effectiveContextWindowTokens).toBe(272000);
		expect(signals?.effectiveContextWindowSource).toBe("provider_catalog");
	});

	it("computes and persists drift fields on llm_input when observed provider usage already exists", async () => {
		const fixture = await createFixture();
		const hooks = createCompactionWarningHooks(fixture.config);

		await hooks.llmOutput(
			{
				runId: "run-drift",
				usage: {
					input: 130000,
					cacheRead: 40000,
					output: 1000,
					total: 171000,
				},
			},
			{ sessionKey: "agent:main:main", runId: "run-drift" },
		);

		await hooks.llmInput(
			{
				runId: "run-drift",
				systemPrompt: "a".repeat(100000),
				prompt: "b".repeat(60000),
				historyMessages: [{ role: "user", content: "short" }],
			},
			{ sessionKey: "agent:main:main", runId: "run-drift" },
		);

		const state = JSON.parse(
			await readFile(fixture.config.stateFilePath, "utf8"),
		) as {
			sessions: Record<
				string,
				{
					signals?: {
						lastEstimatedInputTokens?: number;
						estimateObservedDriftTokens?: number;
						estimateObservedDriftRatio?: number;
						driftStatus?: string;
					};
				}
			>;
		};
		const signals = state.sessions["agent:main:main"]?.signals;
		expect(signals?.lastEstimatedInputTokens).toBeGreaterThan(0);
		expect(signals?.estimateObservedDriftTokens).toBeGreaterThan(0);
		expect(signals?.estimateObservedDriftRatio).toBeGreaterThan(0);
		expect(signals?.driftStatus).toBe("observed");
	});

	it("does not track llm_input or llm_output when early warnings are disabled", async () => {
		const fixture = await createFixture();
		const hooks = createCompactionWarningHooks({
			...fixture.config,
			enableEarlyWarning: false,
		});

		await hooks.llmInput(
			{
				runId: "run-disabled",
				systemPrompt: "a".repeat(50000),
				prompt: "b".repeat(80000),
				historyMessages: [{ role: "user", content: "hello" }],
			},
			{ sessionKey: "agent:main:main", runId: "run-disabled" },
		);
		await hooks.llmOutput(
			{
				runId: "run-disabled",
				assistantTexts: ["No reply from agent"],
			},
			{ sessionKey: "agent:main:main", runId: "run-disabled" },
		);

		await expect(
			readFile(fixture.config.stateFilePath, "utf8"),
		).rejects.toMatchObject({
			code: "ENOENT",
		});
	});

	it("builds an early warning message when heuristics cross threshold", async () => {
		const fixture = await createFixture();

		const message = getEarlyWarningMessage({
			event: {
				systemPrompt: "a".repeat(50000),
				prompt: "b".repeat(80000),
				historyMessages: [],
			},
			ctx: {},
			config: fixture.config,
			session: {
				turnCount: 0,
			},
		});

		expect(message).toContain("fresh session");
	});

	it("warns earlier on message-count growth before the older elevated threshold", async () => {
		const fixture = await createFixture();

		const message = getEarlyWarningMessage({
			event: {
				systemPrompt: "small",
				prompt: "small",
				historyMessages: Array.from({ length: 60 }, (_, index) => ({
					role: "user",
					content: `m-${index}`,
				})),
			},
			ctx: {},
			config: fixture.config,
			session: {
				turnCount: 0,
			},
		});

		expect(message).toContain("fresh session");
	});

	it("uses configured elevated thresholds without hidden multipliers", async () => {
		const fixture = await createFixture();

		const message = getEarlyWarningMessage({
			event: {
				systemPrompt: "a".repeat(fixture.config.warningCharThreshold),
				prompt: "",
				historyMessages: Array.from(
					{ length: fixture.config.warningMessageCountThreshold },
					(_, index) => ({
						role: "user",
						content: `m-${index}`,
					}),
				),
			},
			ctx: {},
			config: fixture.config,
			session: {
				turnCount: 0,
			},
		});

		expect(message).toContain("already heavy enough");
	});

	it("delivers early warning through before_agent_reply as a synthetic visible reply", async () => {
		const fixture = await createFixture();
		const compactionHooks = createCompactionWarningHooks(fixture.config);
		const deliveryHooks = createEarlyWarningDeliveryHooks(fixture.config);

		await compactionHooks.llmInput(
			{
				runId: "run-3",
				systemPrompt: "a".repeat(50000),
				prompt: "b".repeat(80000),
				historyMessages: [{ role: "user", content: "hello" }],
			},
			{ sessionKey: "agent:main:main", runId: "run-3" },
		);

		const result = await deliveryHooks.beforeAgentReply(
			{ cleanedBody: "hello" },
			{ sessionKey: "agent:main:main", runId: "run-3" },
		);

		expect(result?.handled).toBe(true);
		expect(result?.reply?.text).toContain("fresh session");
		expect(result?.reason).toBe("session-bloat-early-warning");

		const state = JSON.parse(
			await readFile(fixture.config.stateFilePath, "utf8"),
		) as {
			sessions: Record<
				string,
				{
					earlyWarnings: number;
					turnCount?: number;
					cooldownUntilTurn?: number;
					signals?: { lastReasonCode?: string; lastRunId?: string };
				}
			>;
		};
		expect(state.sessions["agent:main:main"]?.earlyWarnings).toBe(1);
		expect(state.sessions["agent:main:main"]?.turnCount).toBe(1);
		expect(state.sessions["agent:main:main"]?.cooldownUntilTurn).toBe(4);
		expect(state.sessions["agent:main:main"]?.signals?.lastReasonCode).toBe(
			"history_chars",
		);
		expect(state.sessions["agent:main:main"]?.signals?.lastRunId).toBe("run-3");
	});

	it("does not redeliver early warning during cooldown on before_agent_reply", async () => {
		const fixture = await createFixture();
		const compactionHooks = createCompactionWarningHooks(fixture.config);
		const deliveryHooks = createEarlyWarningDeliveryHooks(fixture.config);

		await compactionHooks.llmInput(
			{
				runId: "run-3",
				systemPrompt: "a".repeat(50000),
				prompt: "b".repeat(80000),
				historyMessages: [{ role: "user", content: "hello" }],
			},
			{ sessionKey: "agent:main:main", runId: "run-3" },
		);
		await deliveryHooks.beforeAgentReply(
			{ cleanedBody: "hello" },
			{ sessionKey: "agent:main:main", runId: "run-3" },
		);

		const second = await deliveryHooks.beforeAgentReply(
			{ cleanedBody: "hello again" },
			{ sessionKey: "agent:main:main", runId: "run-4" },
		);

		expect(second).toBeUndefined();
	});

	it("redelivers early warning after enough subsequent real turns advance past cooldown", async () => {
		const fixture = await createFixture();
		const compactionHooks = createCompactionWarningHooks(fixture.config);
		const deliveryHooks = createEarlyWarningDeliveryHooks(fixture.config);

		await compactionHooks.llmInput(
			{
				runId: "run-1",
				systemPrompt: "a".repeat(50000),
				prompt: "b".repeat(80000),
				historyMessages: [{ role: "user", content: "hello" }],
			},
			{ sessionKey: "agent:main:main", runId: "run-1" },
		);
		const first = await deliveryHooks.beforeAgentReply(
			{ cleanedBody: "hello" },
			{ sessionKey: "agent:main:main", runId: "run-1" },
		);

		expect(first?.handled).toBe(true);

		await compactionHooks.llmInput(
			{
				runId: "run-2",
				systemPrompt: "a".repeat(50000),
				prompt: "b".repeat(80000),
				historyMessages: [{ role: "user", content: "turn 2" }],
			},
			{ sessionKey: "agent:main:main", runId: "run-2" },
		);
		await compactionHooks.llmInput(
			{
				runId: "run-3",
				systemPrompt: "a".repeat(50000),
				prompt: "b".repeat(80000),
				historyMessages: [{ role: "user", content: "turn 3" }],
			},
			{ sessionKey: "agent:main:main", runId: "run-3" },
		);
		await compactionHooks.llmInput(
			{
				runId: "run-4",
				systemPrompt: "a".repeat(50000),
				prompt: "b".repeat(80000),
				historyMessages: [{ role: "user", content: "turn 4" }],
			},
			{ sessionKey: "agent:main:main", runId: "run-4" },
		);

		const recovered = await deliveryHooks.beforeAgentReply(
			{ cleanedBody: "hello again" },
			{ sessionKey: "agent:main:main", runId: "run-4" },
		);

		expect(recovered?.handled).toBe(true);
		expect(recovered?.reason).toBe("session-bloat-early-warning");
	});

	it("does not replay a stored early-warning signal onto a different run", async () => {
		const fixture = await createFixture();
		const compactionHooks = createCompactionWarningHooks(fixture.config);
		const deliveryHooks = createEarlyWarningDeliveryHooks(fixture.config);

		await compactionHooks.llmInput(
			{
				runId: "run-stored",
				systemPrompt: "a".repeat(50000),
				prompt: "b".repeat(80000),
				historyMessages: [{ role: "user", content: "hello" }],
			},
			{ sessionKey: "agent:main:main", runId: "run-stored" },
		);

		const result = await deliveryHooks.beforeAgentReply(
			{ cleanedBody: "assistant reply" },
			{ sessionKey: "agent:main:main", runId: "run-later" },
		);

		expect(result).toBeUndefined();
	});

	it("replays a stored early-warning signal later in the same run", async () => {
		const fixture = await createFixture();
		const compactionHooks = createCompactionWarningHooks(fixture.config);
		const deliveryHooks = createEarlyWarningDeliveryHooks(fixture.config);

		await compactionHooks.llmInput(
			{
				runId: "run-stored",
				systemPrompt: "a".repeat(50000),
				prompt: "b".repeat(80000),
				historyMessages: [{ role: "user", content: "hello" }],
			},
			{ sessionKey: "agent:main:main", runId: "run-stored" },
		);

		const result = await deliveryHooks.beforeAgentReply(
			{ cleanedBody: "assistant reply" },
			{ sessionKey: "agent:main:main", runId: "run-stored" },
		);

		expect(result?.handled).toBe(true);
		expect(result?.reply?.text).toBeDefined();
		expect(result?.reply?.text).toContain("context-sync:");
		expect(result?.reply?.text).toContain("local estimate:");
	});

	it("prefers stored token signals over char heuristics when building delivery copy", async () => {
		const fixture = await createFixture();
		const compactionHooks = createCompactionWarningHooks(fixture.config);
		const deliveryHooks = createEarlyWarningDeliveryHooks({
			...fixture.config,
			contextWindowTokens: 200000,
			warningInputTokensRatio: 0.6,
			elevatedInputTokensRatio: 0.725,
			criticalInputTokensRatio: 0.85,
			maxWarningsPerSession: 3,
		});

		await compactionHooks.llmOutput(
			{
				runId: "run-tokens",
				usage: {
					input: 171000,
				},
			},
			{ sessionKey: "agent:main:main", runId: "run-tokens" },
		);

		await compactionHooks.llmInput(
			{
				runId: "run-tokens",
				systemPrompt: "small prompt",
				prompt: "small user message",
				historyMessages: [{ role: "user", content: "short" }],
			},
			{ sessionKey: "agent:main:main", runId: "run-tokens" },
		);

		const result = await deliveryHooks.beforeAgentReply(
			{ cleanedBody: "assistant reply" },
			{ sessionKey: "agent:main:main", runId: "run-tokens" },
		);

		expect(result?.handled).toBe(true);
		expect(result?.reply?.text).toContain("input is already very large");
	});

	it("captures repeated gateway timeout risk from observed output text", async () => {
		const fixture = await createFixture();
		const compactionHooks = createCompactionWarningHooks(fixture.config);
		const deliveryHooks = createEarlyWarningDeliveryHooks(fixture.config);

		await compactionHooks.llmOutput(
			{
				runId: "run-timeout-1",
				assistantTexts: [
					"Subagent announce completion direct announce agent call transient failure: gateway timeout after 120000ms",
				],
			},
			{ sessionKey: "agent:main:main", runId: "run-timeout-1" },
		);
		await compactionHooks.llmOutput(
			{
				runId: "run-timeout-2",
				assistantTexts: [
					"Subagent announce completion direct announce agent call transient failure: gateway timeout after 120000ms",
				],
			},
			{ sessionKey: "agent:main:main", runId: "run-timeout-2" },
		);
		await compactionHooks.llmInput(
			{
				runId: "run-timeout-2",
				systemPrompt: "small prompt",
				prompt: "small user message",
				historyMessages: [{ role: "user", content: "short" }],
			},
			{ sessionKey: "agent:main:main", runId: "run-timeout-2" },
		);

		const result = await deliveryHooks.beforeAgentReply(
			{ cleanedBody: "assistant reply" },
			{ sessionKey: "agent:main:main", runId: "run-timeout-2" },
		);

		expect(result?.handled).toBe(true);
		expect(result?.reply?.text).toContain("120s");
		expect(result?.reply?.text).toContain("gateway timeouts");
	});

	it("captures lane pressure from observed lane wait diagnostics", async () => {
		const fixture = await createFixture();
		const compactionHooks = createCompactionWarningHooks(fixture.config);
		const deliveryHooks = createEarlyWarningDeliveryHooks(fixture.config);

		await compactionHooks.llmOutput(
			{
				runId: "run-lane",
				assistantTexts: [
					"[diagnostic] lane wait exceeded: lane=session:agent:main:main waitedMs=30024 queueAhead=1",
				],
			},
			{ sessionKey: "agent:main:main", runId: "run-lane" },
		);
		await compactionHooks.llmInput(
			{
				runId: "run-lane",
				systemPrompt: "small prompt",
				prompt: "small user message",
				historyMessages: [{ role: "user", content: "short" }],
			},
			{ sessionKey: "agent:main:main", runId: "run-lane" },
		);

		const result = await deliveryHooks.beforeAgentReply(
			{ cleanedBody: "assistant reply" },
			{ sessionKey: "agent:main:main", runId: "run-lane" },
		);

		expect(result?.handled).toBe(true);
		expect(result?.reply?.text).toContain("30s");
		expect(result?.reply?.text).toContain("lane");
	});

	it("captures no_reply_streak output signals and delivers the matching warning", async () => {
		const fixture = await createFixture();
		const compactionHooks = createCompactionWarningHooks(fixture.config);
		const deliveryHooks = createEarlyWarningDeliveryHooks(fixture.config);

		await compactionHooks.llmOutput(
			{
				runId: "run-no-reply",
				assistantTexts: ["No reply from agent"],
			},
			{ sessionKey: "agent:main:main", runId: "run-no-reply" },
		);
		await compactionHooks.llmOutput(
			{
				runId: "run-no-reply",
				assistantTexts: ["No reply from agent"],
			},
			{ sessionKey: "agent:main:main", runId: "run-no-reply" },
		);
		await compactionHooks.llmInput(
			{
				runId: "run-no-reply",
				systemPrompt: "small prompt",
				prompt: "small user message",
				historyMessages: [{ role: "user", content: "short" }],
			},
			{ sessionKey: "agent:main:main", runId: "run-no-reply" },
		);

		const result = await deliveryHooks.beforeAgentReply(
			{ cleanedBody: "assistant reply" },
			{ sessionKey: "agent:main:main", runId: "run-no-reply" },
		);

		expect(result?.handled).toBe(true);
		expect(result?.reply?.text).toContain(
			"failed to reply in time multiple times",
		);

		const state = JSON.parse(
			await readFile(fixture.config.stateFilePath, "utf8"),
		) as {
			sessions: Record<
				string,
				{ signals?: { noReplyStreak?: number; lastReasonCode?: string } }
			>;
		};
		expect(state.sessions["agent:main:main"]?.signals?.noReplyStreak).toBe(2);
		expect(state.sessions["agent:main:main"]?.signals?.lastReasonCode).toBe(
			"no_reply_streak",
		);
	});

	it("adds an operator-facing context-sync diagnostics block on before_prompt_build", async () => {
		const fixture = await createFixture();
		const compactionHooks = createCompactionWarningHooks(fixture.config);
		const diagnosticsHooks = createOperatorDiagnosticsHooks(fixture.config);

		await compactionHooks.llmOutput(
			{
				runId: "run-diag",
				sessionId: "session-diag",
				provider: "openai-codex",
				model: "gpt-5.4",
				usage: {
					input: 130000,
					cacheRead: 40000,
					output: 1200,
					total: 172000,
				},
			},
			{
				sessionKey: "agent:main:main",
				runId: "run-diag",
				authProfileOverride: "openai-codex:test-profile",
			} as never,
		);

		await compactionHooks.llmInput(
			{
				runId: "run-diag",
				sessionId: "session-diag",
				provider: "openai-codex",
				model: "gpt-5.4",
				systemPrompt: "a".repeat(100000),
				prompt: "b".repeat(60000),
				historyMessages: [{ role: "user", content: "short" }],
			},
			{
				sessionKey: "agent:main:main",
				runId: "run-diag",
				authProfileOverride: "openai-codex:test-profile",
			} as never,
		);

		const result = await diagnosticsHooks.beforePromptBuild({}, {
			sessionKey: "agent:main:main",
			runId: "run-diag",
			authProfileOverride: "openai-codex:test-profile",
		} as never);

		expect(result?.appendSystemContext).toContain(
			"[operator diagnostics][context-sync]",
		);
		expect(result?.appendSystemContext).toContain("local estimate:");
		expect(result?.appendSystemContext).toContain(
			"observed provider input: 130000 (observed)",
		);
		expect(result?.appendSystemContext).toContain(
			"cached input: 40000 (observed)",
		);
		expect(result?.appendSystemContext).toContain(
			"observed output: 1200 (observed)",
		);
		expect(result?.appendSystemContext).toContain(
			"total observed usage: 172000 (observed)",
		);
		expect(result?.appendSystemContext).toContain("drift:");
		expect(result?.appendSystemContext).toContain(
			"effective context window: 272000 (provider_catalog)",
		);
		expect(result?.appendSystemContext).toContain(
			"reset / chain status: chain=unknown, reset=unknown",
		);
		expect(result?.appendSystemContext).toContain(
			"provider / model / auth profile: openai-codex / gpt-5.4 / openai-codex:test-profile",
		);
	});

	it("can build the operator-facing diagnostics block directly with honest missing labels", () => {
		const text = buildOperatorContextSyncBlock(
			{
				lastEstimatedInputTokens: 90000,
				driftStatus: "missing",
				providerChainStatus: "unknown",
				resetIntegrityStatus: "suspicious",
				effectiveContextWindowTokens: 200000,
				effectiveContextWindowSource: "plugin_fallback",
				lastProvider: "openai-codex",
				lastModel: "gpt-5.4",
				lastAuthProfile: "profile-a",
			},
			{},
		);

		expect(text).toContain("local estimate: 90000 (heuristic)");
		expect(text).toContain("observed provider input: missing");
		expect(text).toContain("cached input: missing");
		expect(text).toContain("observed output: missing");
		expect(text).toContain("total observed usage: missing");
		expect(text).toContain("drift: missing");
		expect(text).toContain(
			"effective context window: 200000 (plugin_fallback)",
		);
		expect(text).toContain(
			"reset / chain status: chain=unknown, reset=suspicious",
		);
		expect(text).toContain(
			"provider / model / auth profile: openai-codex / gpt-5.4 / profile-a",
		);
	});

	it("returns only synthetic visible reply payload semantics on before_agent_reply delivery", async () => {
		const fixture = await createFixture();
		const compactionHooks = createCompactionWarningHooks(fixture.config);
		const deliveryHooks = createEarlyWarningDeliveryHooks(fixture.config);

		await compactionHooks.llmInput(
			{
				runId: "run-shape",
				systemPrompt: "a".repeat(50000),
				prompt: "b".repeat(80000),
				historyMessages: [{ role: "user", content: "hello" }],
			},
			{ sessionKey: "agent:main:main", runId: "run-shape" },
		);

		const result = await deliveryHooks.beforeAgentReply(
			{ cleanedBody: "assistant reply" },
			{ sessionKey: "agent:main:main", runId: "run-shape" },
		);

		expect(result).toEqual({
			handled: true,
			reply: {
				text: expect.any(String),
			},
			reason: "session-bloat-early-warning",
		});
		expect(Object.keys(result ?? {})).toEqual(["handled", "reply", "reason"]);
	});
});

async function createFixture() {
	const dir = await mkdtemp(join(tmpdir(), "session-bloat-warning-"));
	const config: SessionBloatWarningConfig = {
		stateFilePath: join(dir, "state.json"),
		defaultLanguage: "en",
		enablePreCompactionWarning: true,
		enablePostCompactionNote: true,
		maxWarningsPerSession: 2,
		enableEarlyWarning: true,
		cooldownTurns: 3,
		warningCharThreshold: 120000,
		warningMessageCountThreshold: 80,
		earlyWarningCharThreshold: 90000,
		earlyWarningMessageCountThreshold: 60,
		warningInputTokensThreshold: 120000,
		elevatedInputTokensThreshold: 145000,
		criticalInputTokensThreshold: 170000,
		contextWindowTokens: 200000,
		warningInputTokensRatio: 0.6,
		elevatedInputTokensRatio: 0.725,
		criticalInputTokensRatio: 0.85,
		timeoutRiskStreakThreshold: 2,
		lanePressureStreakThreshold: 1,
		noReplyStreakThreshold: 2,
		timeoutRiskMsThreshold: 45000,
		lanePressureMsThreshold: 10000,
	};

	return {
		config,
	};
}
