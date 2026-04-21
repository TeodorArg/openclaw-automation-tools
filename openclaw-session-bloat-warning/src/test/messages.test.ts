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
});
