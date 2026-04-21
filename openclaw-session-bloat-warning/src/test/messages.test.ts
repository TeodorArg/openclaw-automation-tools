import { describe, expect, it } from "vitest";

import {
	buildEarlyWarning,
	buildPostCompactionNote,
	buildPreCompactionWarning,
} from "../runtime/text/messages.js";

describe("session bloat warning messages", () => {
	it("returns English pre-compaction copy", () => {
		expect(
			buildPreCompactionWarning({
				language: "en",
			}),
		).toContain("Save a handoff first");
	});

	it("returns Russian post-compaction copy", () => {
		expect(
			buildPostCompactionNote({
				language: "ru",
			}),
		).toContain("Compaction завершён");
	});

	it("returns severity-aware early warning copy", () => {
		expect(
			buildEarlyWarning({
				language: "en",
				severity: "critical",
				reasonCode: "input_tokens",
			}),
		).toContain("close to overload");
	});

	it("renders timeout-risk reason with human-readable seconds", () => {
		expect(
			buildEarlyWarning({
				language: "en",
				severity: "critical",
				reasonCode: "timeout_risk",
				observedTimeoutMs: 45000,
			}),
		).toContain("45s");
	});

	it("renders no_reply_streak reason text", () => {
		expect(
			buildEarlyWarning({
				language: "en",
				severity: "critical",
				reasonCode: "no_reply_streak",
			}),
		).toContain("failed to reply in time multiple times");
	});

	it("renders estimate-observed drift reason with breakdown", () => {
		expect(
			buildEarlyWarning({
				language: "en",
				severity: "elevated",
				reasonCode: "estimate_observed_drift",
				estimatedInputTokens: 90000,
				observedInputTokens: 130000,
				cachedInputTokens: 40000,
				outputTokens: 1200,
				totalTokens: 172000,
				estimateObservedDriftTokens: 40000,
				estimateObservedDriftRatio: 40000 / 130000,
			}),
		).toContain("observed usage is drifting materially");
	});

	it("adds compact context-sync surfacing with honest labels", () => {
		const text = buildEarlyWarning({
			language: "en",
			severity: "elevated",
			reasonCode: "estimate_observed_drift",
			estimatedInputTokens: 90000,
			observedInputTokens: 130000,
			cachedInputTokens: 40000,
			outputTokens: 1200,
			totalTokens: 172000,
			estimateObservedDriftTokens: 40000,
			estimateObservedDriftRatio: 40000 / 130000,
			driftStatus: "observed",
			providerChainStatus: "unknown",
			resetIntegrityStatus: "suspicious",
		});

		expect(text).toContain("context-sync:");
		expect(text).toContain("local estimate: 90000 (heuristic)");
		expect(text).toContain("observed provider input: 130000 (observed)");
		expect(text).toContain("cached input: 40000 (observed)");
		expect(text).toContain("total observed usage: 172000 (observed)");
		expect(text).toContain("drift: 40000, 31% (observed)");
		expect(text).toContain(
			"reset / chain status: chain=unknown, reset=suspicious",
		);
	});
});
