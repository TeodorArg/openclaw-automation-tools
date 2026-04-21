import { describe, expect, it } from "vitest";

import { resolvePluginConfig } from "../runtime/config/plugin-config.js";
import { createEarlyWarningDecision } from "../runtime/core/early-warning-core.js";

describe("early warning token thresholds", () => {
	it("uses ratio-derived critical threshold for 200k context by default", () => {
		const config = resolvePluginConfig(undefined);
		const decision = createEarlyWarningDecision(
			{
				inputChars: 0,
				messageCount: 0,
				inputTokens: 170000,
			},
			config,
		);

		expect(decision?.severity).toBe("critical");
		expect(decision?.reasonCode).toBe("input_tokens");
	});

	it("respects a smaller context window via ratios", () => {
		const config = resolvePluginConfig({
			contextWindowTokens: 128000,
			warningInputTokensRatio: 0.6,
			elevatedInputTokensRatio: 0.725,
			criticalInputTokensRatio: 0.85,
		});
		const elevated = createEarlyWarningDecision(
			{
				inputChars: 0,
				messageCount: 0,
				inputTokens: 93000,
			},
			config,
		);
		const critical = createEarlyWarningDecision(
			{
				inputChars: 0,
				messageCount: 0,
				inputTokens: 109000,
			},
			config,
		);

		expect(elevated?.severity).toBe("elevated");
		expect(critical?.severity).toBe("critical");
	});

	it("classifies the no_reply_streak heuristic when the streak persists", () => {
		const config = resolvePluginConfig(undefined);
		const decision = createEarlyWarningDecision(
			{
				inputChars: 0,
				messageCount: 0,
				noReplyStreak: 2,
				lastObservedTimeoutMs: 45000,
			},
			config,
		);

		expect(decision?.severity).toBe("critical");
		expect(decision?.reasonCode).toBe("no_reply_streak");
	});
});
