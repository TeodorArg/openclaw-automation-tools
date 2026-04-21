import type {
	SessionWarningLanguage,
	WarningSeverity,
} from "../config/plugin-config.js";

type MessageArgs = {
	language: SessionWarningLanguage;
};

type EarlyWarningArgs = {
	language: SessionWarningLanguage;
	severity: WarningSeverity;
	reasonCode: string;
	observedTimeoutMs?: number;
	observedLaneWaitMs?: number;
	observedInputTokens?: number;
	estimatedInputTokens?: number;
	cachedInputTokens?: number;
	outputTokens?: number;
	totalTokens?: number;
	estimateObservedDriftTokens?: number;
	estimateObservedDriftRatio?: number;
	driftStatus?: "observed" | "missing" | "heuristic" | "suspicious";
	providerChainStatus?: "fresh" | "continued" | "unknown";
	resetIntegrityStatus?: "ok" | "suspicious" | "unknown";
};

const ENGLISH_MESSAGES = {
	before:
		"This session is already heavy for another large phase. Save a handoff first, then continue the next heavy step in a fresh session.",
	after:
		"Compaction finished. If the next step is another large phase, continue it in a fresh session instead of expanding this thread further.",
	early: {
		warning:
			"This session is getting heavy before the next large pass. Capture a quick handoff and consider continuing the next heavy step in a fresh session.",
		elevated:
			"This session is already heavy enough that another large pass is risky. Save a handoff now, then continue the next heavy step in a fresh session.",
		critical:
			"This session is close to overload for another large pass. Stop expanding this thread, save a handoff, and continue the next heavy step in a fresh session.",
	},
};

const RUSSIAN_MESSAGES = {
	before:
		"Эта сессия уже тяжёлая для ещё одной большой фазы. Сначала зафиксируй handoff, потом продолжай следующий тяжёлый шаг в новой сессии.",
	after:
		"Compaction завершён. Если дальше идёт ещё одна большая фаза, безопаснее продолжить её в новой сессии, а не раздувать этот thread дальше.",
	early: {
		warning:
			"Сессия уже тяжелеет ещё до следующего большого прохода. Быстро зафиксируй handoff и подумай о продолжении следующего тяжёлого шага в новой сессии.",
		elevated:
			"Сессия уже достаточно тяжёлая, и ещё один большой проход рискован. Сохрани handoff сейчас и продолжай следующий тяжёлый шаг в новой сессии.",
		critical:
			"Сессия близка к перегрузке для ещё одного большого прохода. Не раздувай этот thread дальше, сохрани handoff и продолжай следующий тяжёлый шаг в новой сессии.",
	},
};

export function buildPreCompactionWarning(args: MessageArgs) {
	return readMessages(args.language).before;
}

export function buildPostCompactionNote(args: MessageArgs) {
	return readMessages(args.language).after;
}

export function buildEarlyWarning(args: EarlyWarningArgs) {
	const base = readMessages(args.language).early[args.severity];
	return appendContextSyncSurface(appendReason(base, args), args);
}

function readMessages(language: SessionWarningLanguage) {
	return language === "ru" ? RUSSIAN_MESSAGES : ENGLISH_MESSAGES;
}

function appendReason(message: string, args: EarlyWarningArgs) {
	const reason = readReasonText(args);
	return reason ? `${message} (${reason})` : message;
}

function readReasonText(args: EarlyWarningArgs) {
	if (args.language === "ru") {
		switch (args.reasonCode) {
			case "input_tokens":
				return "вход уже слишком большой";
			case "history_chars":
				return "история уже слишком раздута";
			case "history_messages":
				return "в сессии уже слишком много сообщений";
			case "timeout_risk":
				return `повторяются timeout'ы gateway около ${formatMs(args.observedTimeoutMs, args.language)}`;
			case "lane_pressure":
				return `очередь main session уже подвисает до ${formatMs(args.observedLaneWaitMs, args.language)}`;
			case "no_reply_streak":
				return "агент уже несколько раз не смог ответить вовремя";
			case "estimate_observed_drift":
				return `observed usage заметно расходится с local estimate: ${formatDrift(args)}`;
			case "provider_usage_unknown":
				return `provider usage пока ${readSignalLabel(args.driftStatus, args.language)}, estimate остаётся heuristic`;
			case "reset_integrity_suspicious":
				return "reset signal выглядит suspicious, continuity truth не подтверждён";
			case "provider_chain_continued_after_reset":
				return "provider chain выглядит continued после reset, это suspicious";
			default:
				return "";
		}
	}

	switch (args.reasonCode) {
		case "input_tokens":
			return "input is already very large";
		case "history_chars":
			return "history is already very large";
		case "history_messages":
			return "the session already has many messages";
		case "timeout_risk":
			return `repeated gateway timeouts are already landing around ${formatMs(args.observedTimeoutMs, args.language)}`;
		case "lane_pressure":
			return `the main session lane is already stalling up to ${formatMs(args.observedLaneWaitMs, args.language)}`;
		case "no_reply_streak":
			return "the agent already failed to reply in time multiple times";
		case "estimate_observed_drift":
			return `observed usage is drifting materially from the local estimate: ${formatDrift(args)}`;
		case "provider_usage_unknown":
			return `provider usage is still ${readSignalLabel(args.driftStatus, args.language)}, so the estimate remains heuristic`;
		case "reset_integrity_suspicious":
			return "reset integrity looks suspicious, and continuity truth is not confirmed";
		case "provider_chain_continued_after_reset":
			return "the provider chain looks continued after reset, which is suspicious";
		default:
			return "";
	}
}

function formatDrift(args: EarlyWarningArgs) {
	const parts: string[] = [];
	if (typeof args.estimatedInputTokens === "number") {
		parts.push(`estimate=${Math.round(args.estimatedInputTokens)}`);
	}
	if (typeof args.observedInputTokens === "number") {
		parts.push(`observed=${Math.round(args.observedInputTokens)}`);
	}
	if (typeof args.cachedInputTokens === "number") {
		parts.push(`cached=${Math.round(args.cachedInputTokens)}`);
	}
	if (typeof args.totalTokens === "number") {
		parts.push(`total=${Math.round(args.totalTokens)}`);
	}
	if (typeof args.estimateObservedDriftTokens === "number") {
		parts.push(`drift=${Math.round(args.estimateObservedDriftTokens)}`);
	}
	if (typeof args.estimateObservedDriftRatio === "number") {
		parts.push(`ratio=${Math.round(args.estimateObservedDriftRatio * 100)}%`);
	}
	return parts.join(", ");
}

function appendContextSyncSurface(message: string, args: EarlyWarningArgs) {
	const surface = buildContextSyncSurface(args);
	return surface ? `${message}\n\n${surface}` : message;
}

function buildContextSyncSurface(args: EarlyWarningArgs) {
	const lines: string[] = [];
	const push = (label: string, value: string | undefined) => {
		if (value) {
			lines.push(`${label}: ${value}`);
		}
	};

	push(
		args.language === "ru" ? "context-sync" : "context-sync",
		undefined,
	);
	push(readLabel("estimate", args.language), formatMetric(args.estimatedInputTokens, "heuristic", args.language));
	push(readLabel("observed", args.language), formatMetric(args.observedInputTokens, "observed", args.language));
	push(readLabel("cached", args.language), formatMetric(args.cachedInputTokens, "observed", args.language));
	push(readLabel("output", args.language), formatMetric(args.outputTokens, "observed", args.language));
	push(readLabel("total", args.language), formatMetric(args.totalTokens, "observed", args.language));
	push(readLabel("drift", args.language), formatDriftMetric(args));
	push(readLabel("chain", args.language), formatChainMetric(args));

	if (lines.length === 0) {
		return undefined;
	}

	const header = args.language === "ru" ? "context-sync:" : "context-sync:";
	return `${header}\n- ${lines.join("\n- ")}`;
}

function formatMetric(value: number | undefined, status: "observed" | "missing" | "heuristic" | "suspicious", language: SessionWarningLanguage) {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return readSignalLabel(status === "observed" ? "missing" : status, language);
	}
	return `${Math.round(value)} (${readSignalLabel(status, language)})`;
}

function formatDriftMetric(args: EarlyWarningArgs) {
	const parts: string[] = [];
	if (typeof args.estimateObservedDriftTokens === "number") {
		parts.push(`${Math.round(args.estimateObservedDriftTokens)}`);
	}
	if (typeof args.estimateObservedDriftRatio === "number") {
		parts.push(`${Math.round(args.estimateObservedDriftRatio * 100)}%`);
	}
	if (parts.length === 0) {
		return readSignalLabel(args.driftStatus ?? "missing", args.language);
	}
	return `${parts.join(", ")} (${readSignalLabel(args.driftStatus ?? "observed", args.language)})`;
}

function formatChainMetric(args: EarlyWarningArgs) {
	const parts: string[] = [];
	if (args.providerChainStatus) {
		parts.push(`chain=${args.providerChainStatus}`);
	}
	if (args.resetIntegrityStatus) {
		parts.push(`reset=${args.resetIntegrityStatus === "ok" ? "observed" : args.resetIntegrityStatus}`);
	}
	return parts.join(", ");
}

function readLabel(
	kind: "estimate" | "observed" | "cached" | "output" | "total" | "drift" | "chain",
	language: SessionWarningLanguage,
) {
	switch (kind) {
		case "estimate":
			return language === "ru" ? "local estimate" : "local estimate";
		case "observed":
			return language === "ru" ? "observed provider input" : "observed provider input";
		case "cached":
			return language === "ru" ? "cached input" : "cached input";
		case "output":
			return language === "ru" ? "observed output" : "observed output";
		case "total":
			return language === "ru" ? "total observed usage" : "total observed usage";
		case "drift":
			return language === "ru" ? "drift" : "drift";
		case "chain":
		default:
			return language === "ru" ? "reset / chain status" : "reset / chain status";
	}
}

function readSignalLabel(
	status: EarlyWarningArgs["driftStatus"],
	language: SessionWarningLanguage,
) {
	switch (status) {
		case "observed":
			return "observed";
		case "missing":
			return language === "ru" ? "missing" : "missing";
		case "suspicious":
			return language === "ru" ? "suspicious" : "suspicious";
		case "heuristic":
		default:
			return "heuristic";
	}
}

function formatMs(value: number | undefined, language: SessionWarningLanguage) {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		return language === "ru" ? "десятков секунд" : "tens of seconds";
	}
	if (value >= 1000) {
		const seconds = Math.round((value / 1000) * 10) / 10;
		return language === "ru" ? `${seconds}с` : `${seconds}s`;
	}
	return `${Math.round(value)}ms`;
}
