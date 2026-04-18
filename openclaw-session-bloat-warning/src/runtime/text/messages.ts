import type { SessionWarningLanguage } from "../config/plugin-config.js";

type MessageArgs = {
	language: SessionWarningLanguage;
};

const ENGLISH_MESSAGES = {
	before:
		"This session is already heavy for another large phase. Save a handoff first, then continue the next heavy step in a fresh session.",
	after:
		"Compaction finished. If the next step is another large phase, continue it in a fresh session instead of expanding this thread further.",
};

const RUSSIAN_MESSAGES = {
	before:
		"Эта сессия уже тяжёлая для ещё одной большой фазы. Сначала зафиксируй handoff, потом продолжай следующий тяжёлый шаг в новой сессии.",
	after:
		"Compaction завершён. Если дальше идёт ещё одна большая фаза, безопаснее продолжить её в новой сессии, а не раздувать этот thread дальше.",
};

export function buildPreCompactionWarning(args: MessageArgs) {
	return readMessages(args.language).before;
}

export function buildPostCompactionNote(args: MessageArgs) {
	return readMessages(args.language).after;
}

function readMessages(language: SessionWarningLanguage) {
	return language === "ru" ? RUSSIAN_MESSAGES : ENGLISH_MESSAGES;
}
