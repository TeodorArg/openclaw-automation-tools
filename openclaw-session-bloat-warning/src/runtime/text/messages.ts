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
	driftStatus?: "observed" | "missing" | "heuristic";
	providerChainStatus?: "fresh" | "unknown";
	resetIntegrityStatus?: "ok" | "suspicious" | "unknown";
};

const ENGLISH_MESSAGES = {
	before:
		"This session is already heavy for another large phase. Save a handoff first, then continue the next heavy step in a fresh session.",
	after:
		"Compaction finished. If the next step is another large phase, continue it in a fresh session instead of expanding this thread further.",
	early: {
		warning:
			"This session is entering an early warning zone for the next large pass. Save a quick handoff before the next heavy step if more context is about to accumulate.",
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
			"Сессия входит в раннюю warning-zone перед следующим большим проходом. Быстро зафиксируй handoff перед следующим тяжёлым шагом, если контекст ещё будет расти.",
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
				return "observed provider input уже вошёл в warning-zone";
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
			default:
				return "";
		}
	}

	switch (args.reasonCode) {
		case "input_tokens":
			return "observed provider input is already in the warning zone";
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
	const usageConsistency = readUsageConsistency(args);
	const push = (label: string, value: string | undefined) => {
		if (value) {
			lines.push(`${label}: ${value}`);
		}
	};

	push(args.language === "ru" ? "context-sync" : "context-sync", undefined);
	push(
		readLabel("estimate", args.language),
		formatMetric(args.estimatedInputTokens, "heuristic", args.language),
	);
	push(
		readLabel("observed", args.language),
		formatMetric(args.observedInputTokens, "observed", args.language),
	);
	push(
		readLabel("cached", args.language),
		formatMetric(
			args.cachedInputTokens,
			usageConsistency === "inconsistent" ? "diagnostic" : "observed",
			args.language,
		),
	);
	push(
		readLabel("output", args.language),
		formatMetric(args.outputTokens, "observed", args.language),
	);
	push(
		readLabel("total", args.language),
		formatMetric(
			args.totalTokens,
			usageConsistency === "inconsistent" ? "diagnostic" : "observed",
			args.language,
		),
	);
	if (usageConsistency !== "inconsistent") {
		push(readLabel("drift", args.language), formatDriftMetric(args));
	}
	if (usageConsistency !== "unknown") {
		push(
			readLabel("consistency", args.language),
			formatConsistencyMetric(usageConsistency, args.language),
		);
	}
	push(readLabel("chain", args.language), formatChainMetric(args));

	if (lines.length === 0) {
		return undefined;
	}

	const header = args.language === "ru" ? "context-sync:" : "context-sync:";
	return `${header}\n- ${lines.join("\n- ")}`;
}

function formatMetric(
	value: number | undefined,
	status: "observed" | "missing" | "heuristic" | "diagnostic",
	language: SessionWarningLanguage,
) {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return readSignalLabel(
			status === "observed" || status === "diagnostic" ? "missing" : status,
			language,
		);
	}
	return `${Math.round(value)} (${readSignalLabel(status, language)})`;
}

function formatConsistencyMetric(
	status: "consistent" | "inconsistent" | "unknown",
	language: SessionWarningLanguage,
) {
	switch (status) {
		case "consistent":
			return language === "ru" ? "stable" : "stable";
		case "inconsistent":
			return language === "ru"
				? "disputed; cache/total treated as diagnostic only"
				: "disputed; cache/total treated as diagnostic only";
		default:
			return language === "ru" ? "unknown" : "unknown";
	}
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
		parts.push(
			`reset=${args.resetIntegrityStatus === "ok" ? "observed" : args.resetIntegrityStatus}`,
		);
	}
	return parts.join(", ");
}

function readLabel(
	kind:
		| "estimate"
		| "observed"
		| "cached"
		| "output"
		| "total"
		| "drift"
		| "consistency"
		| "chain",
	language: SessionWarningLanguage,
) {
	switch (kind) {
		case "estimate":
			return language === "ru" ? "local estimate" : "local estimate";
		case "observed":
			return language === "ru"
				? "observed provider input"
				: "observed provider input";
		case "cached":
			return language === "ru" ? "cached input" : "cached input";
		case "output":
			return language === "ru" ? "observed output" : "observed output";
		case "total":
			return language === "ru"
				? "total observed usage"
				: "total observed usage";
		case "drift":
			return language === "ru" ? "drift" : "drift";
		case "consistency":
			return language === "ru" ? "metrics consistency" : "metrics consistency";
		default:
			return language === "ru"
				? "reset / chain status"
				: "reset / chain status";
	}
}

function readSignalLabel(
	status: EarlyWarningArgs["driftStatus"] | "diagnostic",
	language: SessionWarningLanguage,
) {
	switch (status) {
		case "observed":
			return "observed";
		case "diagnostic":
			return language === "ru" ? "diagnostic only" : "diagnostic only";
		case "missing":
			return language === "ru" ? "missing" : "missing";
		default:
			return "heuristic";
	}
}

function readUsageConsistency(args: EarlyWarningArgs) {
	const observedInput = args.observedInputTokens;
	const cachedInput = args.cachedInputTokens;
	const output = args.outputTokens;
	const total = args.totalTokens;

	if (
		typeof observedInput !== "number" ||
		!Number.isFinite(observedInput) ||
		typeof total !== "number" ||
		!Number.isFinite(total)
	) {
		return "unknown" as const;
	}

	const roundedObserved = Math.max(0, Math.round(observedInput));
	const roundedTotal = Math.max(0, Math.round(total));
	const roundedCached =
		typeof cachedInput === "number" && Number.isFinite(cachedInput)
			? Math.max(0, Math.round(cachedInput))
			: undefined;
	const roundedOutput =
		typeof output === "number" && Number.isFinite(output)
			? Math.max(0, Math.round(output))
			: undefined;

	if (roundedTotal + 1024 < roundedObserved) {
		return "inconsistent" as const;
	}
	if (
		typeof roundedCached === "number" &&
		roundedTotal + 1024 < roundedCached
	) {
		return "inconsistent" as const;
	}
	if (
		typeof roundedOutput === "number" &&
		roundedTotal + 1024 < roundedObserved + roundedOutput
	) {
		return "inconsistent" as const;
	}
	if (
		typeof roundedCached === "number" &&
		roundedCached >= roundedObserved * 2 &&
		roundedTotal <= Math.round(roundedObserved * 1.25)
	) {
		return "inconsistent" as const;
	}

	return "consistent" as const;
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
