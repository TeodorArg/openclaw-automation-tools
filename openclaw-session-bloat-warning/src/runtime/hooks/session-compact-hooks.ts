import type {
	AfterCompactionHookEvent,
	BeforeCompactionHookEvent,
	LlmInputHookEvent,
	LlmOutputHookEvent,
	PluginHookContext,
} from "../../../api.js";
import type { SessionBloatWarningConfig } from "../config/plugin-config.js";
import {
	observeEarlyWarningInput,
	observeEarlyWarningOutput,
} from "../core/early-warning-core.js";
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
	llmInput: (event: LlmInputHookEvent, ctx: PluginHookContext) => Promise<void>;
	llmOutput: (
		event: LlmOutputHookEvent,
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
			state.updatedAt = session.lastUpdatedAt;
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
			state.updatedAt = session.lastUpdatedAt;
			await saveWarningState(config.stateFilePath, state);
		},
		llmInput: async (event, ctx) => {
			if (!config.enableEarlyWarning) {
				return;
			}

			const state = await loadWarningState(config.stateFilePath);
			const session = getSessionState(state, ctx.sessionKey);
			const observation = observeEarlyWarningInput({
				event,
				ctx,
				config,
				session,
			});

			session.turnCount = observation.turn;
			session.signals = observation.signals;
			session.lastUpdatedAt = observation.now;
			state.updatedAt = observation.now;
			await saveWarningState(config.stateFilePath, state);
		},
		llmOutput: async (event, ctx) => {
			if (!config.enableEarlyWarning) {
				return;
			}

			const state = await loadWarningState(config.stateFilePath);
			const session = getSessionState(state, ctx.sessionKey);
			const observation = observeEarlyWarningOutput({
				event,
				ctx,
				config,
				sessionSignals: session.signals,
			});

			session.signals = observation.signals;
			session.lastUpdatedAt = observation.now;
			state.updatedAt = observation.now;
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
