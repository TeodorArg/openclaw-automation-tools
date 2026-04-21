import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { SessionBloatWarningConfig } from "../runtime/config/plugin-config.js";
import { createCompactionWarningHooks } from "../runtime/hooks/session-compact-hooks.js";
import {
	buildSessionBloatStatusSnapshot,
	createSessionBloatStatusTool,
} from "../status-tool.js";

describe("session_bloat_status tool", () => {
	it("returns compact operator-facing context-sync snapshot from stored runtime truth", async () => {
		const fixture = await createFixture();
		const hooks = createCompactionWarningHooks(fixture.config);
		const tool = createSessionBloatStatusTool({
			pluginConfig: fixture.config,
		});

		await hooks.llmOutput(
			{
				runId: "run-status",
				sessionId: "session-status",
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
				runId: "run-status",
				authProfileOverride: "openai-codex:test-profile",
			} as never,
		);

		await hooks.llmInput(
			{
				runId: "run-status",
				sessionId: "session-status",
				provider: "openai-codex",
				model: "gpt-5.4",
				systemPrompt: "a".repeat(100000),
				prompt: "b".repeat(60000),
				historyMessages: [{ role: "user", content: "short" }],
			},
			{
				sessionKey: "agent:main:main",
				runId: "run-status",
				authProfileOverride: "openai-codex:test-profile",
			} as never,
		);

		const result = await tool.execute("call-1", {
			sessionKey: "agent:main:main",
		});
		const payload = JSON.parse(result.content[0].text);

		expect(payload.sessionKey).toBe("agent:main:main");
		expect(payload.contextSync.localEstimate.status).toBe("heuristic");
		expect(payload.contextSync.observedProviderInput).toEqual({
			value: 130000,
			status: "observed",
		});
		expect(payload.contextSync.cachedInput).toEqual({
			value: 40000,
			status: "observed",
		});
		expect(payload.contextSync.observedOutput).toEqual({
			value: 1200,
			status: "observed",
		});
		expect(payload.contextSync.totalObservedUsage).toEqual({
			value: 172000,
			status: "observed",
		});
		expect(payload.contextSync.drift.status).toBe("observed");
		expect(payload.contextSync.effectiveContextWindow).toEqual({
			tokens: 272000,
			source: "provider_catalog",
		});
		expect(payload.contextSync.resetChainStatus.providerChainStatus).toBe(
			"unknown",
		);
		expect(payload.contextSync.identity).toEqual({
			provider: "openai-codex",
			model: "gpt-5.4",
			authProfile: "openai-codex:test-profile",
		});
	});

	it("keeps honest missing and suspicious labels in the snapshot shape", () => {
		const payload = buildSessionBloatStatusSnapshot({
			sessionKey: "agent:main:main",
			signals: {
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
		});

		expect(payload.contextSync.localEstimate).toEqual({
			value: 90000,
			status: "heuristic",
		});
		expect(payload.contextSync.observedProviderInput.status).toBe("missing");
		expect(payload.contextSync.cachedInput.status).toBe("missing");
		expect(payload.contextSync.observedOutput.status).toBe("missing");
		expect(payload.contextSync.totalObservedUsage.status).toBe("missing");
		expect(payload.contextSync.drift).toEqual({
			tokens: undefined,
			ratio: undefined,
			status: "missing",
		});
		expect(payload.contextSync.effectiveContextWindow).toEqual({
			tokens: 200000,
			source: "plugin_fallback",
		});
		expect(payload.contextSync.resetChainStatus.resetIntegrityStatus).toBe(
			"suspicious",
		);
	});
});

async function createFixture() {
	const dir = await mkdtemp(join(tmpdir(), "session-bloat-status-"));
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
