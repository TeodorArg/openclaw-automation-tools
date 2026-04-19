import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { SessionBloatWarningConfig } from "../runtime/config/plugin-config.js";
import { getEarlyWarningMessage } from "../runtime/core/early-warning-core.js";
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
				beforeWarnings: 0,
				afterWarnings: 0,
				earlyWarnings: 0,
			},
		});

		expect(message).toContain("fresh session");
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
					cooldownUntilTurn?: number;
					signals?: { lastReasonCode?: string; lastRunId?: string };
				}
			>;
		};
		expect(state.sessions["agent:main:main"]?.earlyWarnings).toBe(1);
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
		warningInputTokensThreshold: 120000,
		elevatedInputTokensThreshold: 145000,
		criticalInputTokensThreshold: 170000,
	};

	return {
		config,
	};
}
