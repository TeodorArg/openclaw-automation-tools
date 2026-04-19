import type {
	AfterCompactionHookEvent,
	BeforeCompactionHookEvent,
	PluginHookContext,
} from "../../../api.js";
import type { SessionBloatWarningConfig } from "../config/plugin-config.js";
import { loadWarningState, saveWarningState } from "../state/plugin-state.js";
import { getSessionState } from "../state/state-normalize.js";
import {
	buildPostCompactionNote,
	buildPreCompactionWarning,
} from "../text/messages.js";

type CompactionWarningHooks = {
	beforeCompaction: (
		event: BeforeCompactionHookEvent,
		ctx: PluginHookContext,
	) => Promise<void>;
	afterCompaction: (
		event: AfterCompactionHookEvent,
		ctx: PluginHookContext,
	) => Promise<void>;
};

export function createCompactionWarningHooks(
	config: SessionBloatWarningConfig,
): CompactionWarningHooks {
	return {
		beforeCompaction: async (event, ctx) => {
			if (!config.enablePreCompactionWarning) {
				return;
			}

			const state = await loadWarningState(config.stateFilePath);
			const session = getSessionState(state, ctx.sessionKey);

			if (session.beforeWarnings >= config.maxWarningsPerSession) {
				return;
			}

			if (
				!appendMessage(
					event,
					buildPreCompactionWarning({
						language: config.defaultLanguage,
					}),
				)
			) {
				return;
			}
			session.beforeWarnings += 1;
			session.lastUpdatedAt = new Date().toISOString();
			await saveWarningState(config.stateFilePath, state);
		},
		afterCompaction: async (event, ctx) => {
			if (!config.enablePostCompactionNote) {
				return;
			}

			const state = await loadWarningState(config.stateFilePath);
			const session = getSessionState(state, ctx.sessionKey);
			const allowWithoutPreWarning = !config.enablePreCompactionWarning;

			if (
				session.afterWarnings >= config.maxWarningsPerSession ||
				(!allowWithoutPreWarning &&
					session.afterWarnings >= session.beforeWarnings)
			) {
				return;
			}

			if (
				!appendMessage(
					event,
					buildPostCompactionNote({
						language: config.defaultLanguage,
					}),
				)
			) {
				return;
			}
			session.afterWarnings += 1;
			session.lastUpdatedAt = new Date().toISOString();
			await saveWarningState(config.stateFilePath, state);
		},
	};
}

function appendMessage(
	event: BeforeCompactionHookEvent | AfterCompactionHookEvent,
	message: string,
) {
	if (!Array.isArray(event.messages)) {
		return false;
	}

	event.messages.push(message);
	return true;
}
