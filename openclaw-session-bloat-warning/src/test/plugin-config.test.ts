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
		expect(config.enableEarlyWarning).toBe(true);
		expect(config.cooldownTurns).toBe(3);
		expect(config.warningCharThreshold).toBe(120000);
		expect(config.warningMessageCountThreshold).toBe(80);
		expect(config.warningInputTokensThreshold).toBe(120000);
		expect(config.elevatedInputTokensThreshold).toBe(145000);
		expect(config.criticalInputTokensThreshold).toBe(170000);
	});

	it("accepts explicit overrides", () => {
		const config = resolvePluginConfig({
			stateFilePath: "./tmp/custom-state.json",
			defaultLanguage: "ru",
			enablePreCompactionWarning: false,
			enablePostCompactionNote: false,
			maxWarningsPerSession: 4,
			enableEarlyWarning: false,
			cooldownTurns: 5,
			warningCharThreshold: 90000,
			warningMessageCountThreshold: 50,
			warningInputTokensThreshold: 100000,
			elevatedInputTokensThreshold: 130000,
			criticalInputTokensThreshold: 160000,
		});

		expect(config.stateFilePath).toContain("tmp/custom-state.json");
		expect(config.defaultLanguage).toBe("ru");
		expect(config.enablePreCompactionWarning).toBe(false);
		expect(config.enablePostCompactionNote).toBe(false);
		expect(config.maxWarningsPerSession).toBe(4);
		expect(config.enableEarlyWarning).toBe(false);
		expect(config.cooldownTurns).toBe(5);
		expect(config.warningCharThreshold).toBe(90000);
		expect(config.warningMessageCountThreshold).toBe(50);
		expect(config.warningInputTokensThreshold).toBe(100000);
		expect(config.elevatedInputTokensThreshold).toBe(130000);
		expect(config.criticalInputTokensThreshold).toBe(160000);
	});
});
