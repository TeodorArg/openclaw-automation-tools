import { describe, expect, it } from "vitest";

import { resolvePluginConfig } from "../runtime/config/plugin-config.js";

describe("plugin config", () => {
	it("applies documented defaults", () => {
		const config = resolvePluginConfig(undefined);

		expect(config.stateFilePath).toContain(
			".openclaw-session-bloat-warning-state.json",
		);
		expect(config.defaultLanguage).toBe("en");
		expect(config.enablePreCompactionWarning).toBe(true);
		expect(config.enablePostCompactionNote).toBe(true);
		expect(config.maxWarningsPerSession).toBe(2);
	});

	it("accepts explicit overrides", () => {
		const config = resolvePluginConfig({
			stateFilePath: "./tmp/custom-state.json",
			defaultLanguage: "ru",
			enablePreCompactionWarning: false,
			enablePostCompactionNote: false,
			maxWarningsPerSession: 4,
		});

		expect(config.stateFilePath).toContain("tmp/custom-state.json");
		expect(config.defaultLanguage).toBe("ru");
		expect(config.enablePreCompactionWarning).toBe(false);
		expect(config.enablePostCompactionNote).toBe(false);
		expect(config.maxWarningsPerSession).toBe(4);
	});
});
