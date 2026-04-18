import type { SessionHookEvent } from "../../../api.js";
import type { SessionBloatWarningConfig } from "../config/plugin-config.js";
import { loadWarningState, saveWarningState } from "../state/plugin-state.js";
import {
	buildPostCompactionNote,
	buildPreCompactionWarning,
} from "../text/messages.js";

type CompactionWarningHooks = {
	beforeCompaction: (event: SessionHookEvent) => Promise<void>;
	afterCompaction: (event: SessionHookEvent) => Promise<void>;
};

export function createCompactionWarningHooks(
	config: SessionBloatWarningConfig,
): CompactionWarningHooks {
	return {
		beforeCompaction: async (event) => {
			if (!config.enablePreCompactionWarning) {
				return;
			}

			const state = await loadWarningState(config.stateFilePath);
			const session = getSessionState(state, event.sessionKey);

			if (session.beforeWarnings >= config.maxWarningsPerSession) {
				return;
			}

			appendMessage(
				event,
				buildPreCompactionWarning({
					language: config.defaultLanguage,
				}),
			);
			session.beforeWarnings += 1;
			session.lastUpdatedAt = readTimestamp(event.timestamp);
			await saveWarningState(config.stateFilePath, state);
		},
		afterCompaction: async (event) => {
			if (!config.enablePostCompactionNote) {
				return;
			}

			const state = await loadWarningState(config.stateFilePath);
			const session = getSessionState(state, event.sessionKey);
			const allowWithoutPreWarning = !config.enablePreCompactionWarning;

			if (
				session.afterWarnings >= config.maxWarningsPerSession ||
				(!allowWithoutPreWarning &&
					session.afterWarnings >= session.beforeWarnings)
			) {
				return;
			}

			appendMessage(
				event,
				buildPostCompactionNote({
					language: config.defaultLanguage,
				}),
			);
			session.afterWarnings += 1;
			session.lastUpdatedAt = readTimestamp(event.timestamp);
			await saveWarningState(config.stateFilePath, state);
		},
	};
}

function appendMessage(event: SessionHookEvent, message: string) {
	if (!Array.isArray(event.messages)) {
		return;
	}

	event.messages.push(message);
}

function readTimestamp(timestamp: string | undefined) {
	return timestamp && timestamp.trim().length > 0
		? timestamp
		: new Date().toISOString();
}

function getSessionState(
	state: Awaited<ReturnType<typeof loadWarningState>>,
	sessionKey: string | undefined,
) {
	const key =
		sessionKey && sessionKey.trim().length > 0 ? sessionKey : "__default__";

	state.sessions[key] ??= {
		beforeWarnings: 0,
		afterWarnings: 0,
	};

	return state.sessions[key];
}
