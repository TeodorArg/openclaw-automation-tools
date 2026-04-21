import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { resolvePluginConfig } from "../runtime/config/plugin-config.js";

vi.mock("openclaw/plugin-sdk/plugin-entry", () => ({
	definePluginEntry(entry: unknown) {
		return entry;
	},
}));

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
		expect(config.earlyWarningCharThreshold).toBe(90000);
		expect(config.earlyWarningMessageCountThreshold).toBe(60);
		expect(config.timeoutRiskStreakThreshold).toBe(2);
		expect(config.lanePressureStreakThreshold).toBe(1);
		expect(config.noReplyStreakThreshold).toBe(2);
		expect(config.timeoutRiskMsThreshold).toBe(45000);
		expect(config.lanePressureMsThreshold).toBe(10000);
		expect(config.contextWindowTokens).toBe(200000);
		expect(config.warningInputTokensRatio).toBe(0.6);
		expect(config.elevatedInputTokensRatio).toBe(0.725);
		expect(config.criticalInputTokensRatio).toBe(0.85);
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
			earlyWarningCharThreshold: 70000,
			earlyWarningMessageCountThreshold: 45,
			timeoutRiskStreakThreshold: 3,
			lanePressureStreakThreshold: 2,
			noReplyStreakThreshold: 4,
			timeoutRiskMsThreshold: 30000,
			lanePressureMsThreshold: 8000,
			contextWindowTokens: 128000,
			warningInputTokensRatio: 0.55,
			elevatedInputTokensRatio: 0.7,
			criticalInputTokensRatio: 0.82,
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
		expect(config.earlyWarningCharThreshold).toBe(70000);
		expect(config.earlyWarningMessageCountThreshold).toBe(45);
		expect(config.timeoutRiskStreakThreshold).toBe(3);
		expect(config.lanePressureStreakThreshold).toBe(2);
		expect(config.noReplyStreakThreshold).toBe(4);
		expect(config.timeoutRiskMsThreshold).toBe(30000);
		expect(config.lanePressureMsThreshold).toBe(8000);
		expect(config.contextWindowTokens).toBe(128000);
		expect(config.warningInputTokensRatio).toBe(0.55);
		expect(config.elevatedInputTokensRatio).toBe(0.7);
		expect(config.criticalInputTokensRatio).toBe(0.82);
	});

	it("keeps manifest config keys aligned with runtime defaults", () => {
		const config = resolvePluginConfig(undefined);
		const manifest = JSON.parse(
			readFileSync(resolve(process.cwd(), "openclaw.plugin.json"), "utf8"),
		) as {
			configSchema: {
				properties: Record<string, { enum?: string[]; description?: string }>;
			};
		};

		expect(Object.keys(manifest.configSchema.properties).sort()).toEqual(
			Object.keys(config).sort(),
		);
		expect(manifest.configSchema.properties.defaultLanguage?.enum).toEqual([
			"en",
			"ru",
		]);
		expect(
			manifest.configSchema.properties.cooldownTurns?.description,
		).toContain("Defaults to 3.");
		expect(
			manifest.configSchema.properties.criticalInputTokensThreshold
				?.description,
		).toContain("Defaults to 170000.");
		expect(
			manifest.configSchema.properties.timeoutRiskMsThreshold?.description,
		).toContain("Defaults to 45000.");
		expect(
			manifest.configSchema.properties.criticalInputTokensRatio?.description,
		).toContain("Defaults to 0.85.");
	});

	it("keeps package, manifest, and entry descriptions aligned", async () => {
		const packageJson = JSON.parse(
			readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
		) as { description: string };
		const manifest = JSON.parse(
			readFileSync(resolve(process.cwd(), "openclaw.plugin.json"), "utf8"),
		) as { description: string };
		const pluginModule = (await import("../index.js")) as {
			default: { description: string };
		};

		expect(packageJson.description).toBe(manifest.description);
		expect(pluginModule.default.description).toBe(manifest.description);
	});
});
