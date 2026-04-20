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
	return appendReason(base, args);
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
		default:
			return "";
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
