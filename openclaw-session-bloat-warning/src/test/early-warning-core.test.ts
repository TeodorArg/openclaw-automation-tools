import { describe, expect, it } from "vitest";

import { resolvePluginConfig } from "../runtime/config/plugin-config.js";
import {
	computeObservedDrift,
	createEarlyWarningDecision,
	readObservedUsage,
} from "../runtime/core/early-warning-core.js";

describe("early warning token thresholds", () => {
	it("uses ratio-derived critical threshold for 258k fallback context by default", () => {
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

	it("prefers effective runtime context window tokens over config fallback", () => {
		const config = resolvePluginConfig({
			contextWindowTokens: 200000,
			warningInputTokensThreshold: 300000,
			elevatedInputTokensThreshold: 300000,
			criticalInputTokensThreshold: 300000,
			warningInputTokensRatio: 0.6,
			elevatedInputTokensRatio: 0.725,
			criticalInputTokensRatio: 0.85,
		});
		const decision = createEarlyWarningDecision(
			{
				inputChars: 0,
				messageCount: 0,
				inputTokens: 149000,
				effectiveContextWindowTokens: 258000,
			},
			config,
		);

		expect(decision).toBeUndefined();
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

	it("reads observed provider usage including cached tokens", () => {
		const usage = readObservedUsage({
			usage: {
				input: 123456,
				cacheRead: 42000,
				output: 789,
				total: 166245,
			},
		});

		expect(usage.inputTokens).toBe(123456);
		expect(usage.cachedInputTokens).toBe(42000);
		expect(usage.outputTokens).toBe(789);
		expect(usage.cacheWriteTokens).toBeUndefined();
		expect(usage.totalTokens).toBe(166245);
		expect(usage.availability).toBe("present");
	});

	it("treats cache-write-only observed usage as present", () => {
		const usage = readObservedUsage({
			usage: {
				cacheWrite: 2048,
			},
		});

		expect(usage.cacheWriteTokens).toBe(2048);
		expect(usage.availability).toBe("present");
	});

	it("computes observed drift tokens and ratio when estimate and observed usage both exist", () => {
		const drift = computeObservedDrift({
			estimatedInputTokens: 100000,
			observedInputTokens: 130000,
		});

		expect(drift.driftTokens).toBe(30000);
		expect(drift.driftRatio).toBeCloseTo(30000 / 130000);
		expect(drift.status).toBe("observed");
	});

	it("does not emit a visible warning only because provider usage is missing", () => {
		const config = resolvePluginConfig(undefined);
		const decision = createEarlyWarningDecision(
			{
				inputChars: 40000,
				messageCount: 5,
				estimatedInputTokens: 10000,
				driftStatus: "missing",
			},
			config,
		);

		expect(decision).toBeUndefined();
	});

	it("does not emit a visible warning only because estimate-observed drift is large", () => {
		const config = resolvePluginConfig(undefined);
		const decision = createEarlyWarningDecision(
			{
				inputChars: 40000,
				messageCount: 5,
				estimatedInputTokens: 90000,
				estimateObservedDriftTokens: 40000,
				estimateObservedDriftRatio: 40000 / 130000,
				driftStatus: "observed",
			},
			config,
		);

		expect(decision).toBeUndefined();
	});

	it("keeps history heuristics support-only when any observed usage is present", () => {
		const config = resolvePluginConfig(undefined);
		const decision = createEarlyWarningDecision(
			{
				inputChars: 130000,
				messageCount: 90,
				estimatedInputTokens: 32500,
				observedUsageAvailability: "present",
				lastCachedInputTokens: 321152,
				lastTotalTokens: 34160,
			},
			config,
		);

		expect(decision).toBeUndefined();
	});
});
