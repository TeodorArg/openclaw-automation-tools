import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { SessionBloatWarningConfig } from "../runtime/config/plugin-config.js";
import {
	buildStoredEarlyWarningMessage,
	getEarlyWarningMessage,
} from "../runtime/core/early-warning-core.js";
import { createEarlyWarningDeliveryHooks } from "../runtime/hooks/early-warning-delivery-hooks.js";
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

	it("stores observed llm_output input token usage", async () => {
		const fixture = await createFixture();
		const hooks = createCompactionWarningHooks(fixture.config);

		await hooks.llmOutput(
			{
				runId: "run-2",
				usage: {
					input: 130432,
				},
			},
			{ sessionKey: "agent:main:main" },
		);

		const state = JSON.parse(
			await readFile(fixture.config.stateFilePath, "utf8"),
		) as {
			sessions: Record<
				string,
				{ signals?: { lastInputTokens?: number; lastRunId?: string } }
			>;
		};
		expect(state.sessions["agent:main:main"]?.signals?.lastInputTokens).toBe(
			130432,
		);
		expect(state.sessions["agent:main:main"]?.signals?.lastRunId).toBe("run-2");
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
		expect(result?.reply).toEqual({
			text: buildStoredEarlyWarningMessage({
				config: fixture.config,
				signals: {
					lastSeverity: "elevated",
					lastReasonCode: "history_chars",
				},
			}),
		});
	});

	it("prefers stored token signals over char heuristics when building delivery copy", async () => {
		const fixture = await createFixture();
		const compactionHooks = createCompactionWarningHooks(fixture.config);
		const deliveryHooks = createEarlyWarningDeliveryHooks(fixture.config);

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
