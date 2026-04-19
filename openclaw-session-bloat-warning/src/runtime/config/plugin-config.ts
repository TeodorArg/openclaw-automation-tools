import { resolve } from "node:path";

export type SessionWarningLanguage = "en" | "ru";
export type WarningSeverity = "warning" | "elevated" | "critical";

export type SessionBloatWarningConfig = {
	stateFilePath: string;
	defaultLanguage: SessionWarningLanguage;
	enablePreCompactionWarning: boolean;
	enablePostCompactionNote: boolean;
	maxWarningsPerSession: number;
	enableEarlyWarning: boolean;
	cooldownTurns: number;
	warningCharThreshold: number;
	warningMessageCountThreshold: number;
	warningInputTokensThreshold: number;
	elevatedInputTokensThreshold: number;
	criticalInputTokensThreshold: number;
};

const DEFAULT_STATE_FILE = ".openclaw-session-bloat-warning-state.json";

export function resolvePluginConfig(
	input: Record<string, unknown> | undefined,
): SessionBloatWarningConfig {
	return {
		stateFilePath: resolveStateFilePath(input?.stateFilePath),
		defaultLanguage: readLanguage(input?.defaultLanguage),
		enablePreCompactionWarning: readBoolean(
			input?.enablePreCompactionWarning,
			true,
		),
		enablePostCompactionNote: readBoolean(
			input?.enablePostCompactionNote,
			true,
		),
		maxWarningsPerSession: readPositiveInteger(input?.maxWarningsPerSession, 2),
		enableEarlyWarning: readBoolean(input?.enableEarlyWarning, true),
		cooldownTurns: readPositiveInteger(input?.cooldownTurns, 3),
		warningCharThreshold: readPositiveInteger(
			input?.warningCharThreshold,
			120000,
		),
		warningMessageCountThreshold: readPositiveInteger(
			input?.warningMessageCountThreshold,
			80,
		),
		warningInputTokensThreshold: readPositiveInteger(
			input?.warningInputTokensThreshold,
			120000,
		),
		elevatedInputTokensThreshold: readPositiveInteger(
			input?.elevatedInputTokensThreshold,
			145000,
		),
		criticalInputTokensThreshold: readPositiveInteger(
			input?.criticalInputTokensThreshold,
			170000,
		),
	};
}

function resolveStateFilePath(value: unknown) {
	if (typeof value !== "string" || value.trim().length === 0) {
		return resolve(process.cwd(), DEFAULT_STATE_FILE);
	}

	return resolve(process.cwd(), value.trim());
}

function readLanguage(value: unknown): SessionWarningLanguage {
	return value === "ru" ? "ru" : "en";
}

function readBoolean(value: unknown, fallback: boolean) {
	return typeof value === "boolean" ? value : fallback;
}

function readPositiveInteger(value: unknown, fallback: number) {
	return typeof value === "number" && Number.isInteger(value) && value > 0
		? value
		: fallback;
}
