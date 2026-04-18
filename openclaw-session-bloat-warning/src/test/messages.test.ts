import { describe, expect, it } from "vitest";

import {
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
});
