import type {
	BeforeAgentReplyHookEvent,
	PluginHookContext,
} from "../../../api.js";
import type { SessionBloatWarningConfig } from "../config/plugin-config.js";
import {
	buildStoredEarlyWarningMessage,
	shouldEmitEarlyWarning,
} from "../core/early-warning-core.js";
import { loadWarningState, saveWarningState } from "../state/plugin-state.js";
import { getSessionState } from "../state/state-normalize.js";

type EarlyWarningDeliveryHooks = {
	beforeAgentReply: (
		event: BeforeAgentReplyHookEvent,
		ctx: PluginHookContext,
	) => Promise<
		{ handled: true; reply: { text: string }; reason: string } | undefined
	>;
};

export function createEarlyWarningDeliveryHooks(
	config: SessionBloatWarningConfig,
): EarlyWarningDeliveryHooks {
	return {
		beforeAgentReply: async (_event, ctx) => {
			if (!config.enableEarlyWarning) {
				return undefined;
			}

			const state = await loadWarningState(config.stateFilePath);
			const session = getSessionState(state, ctx.sessionKey);
			const turn =
				session.beforeWarnings +
				session.afterWarnings +
				session.earlyWarnings +
				1;
			const shouldWarnNow = shouldEmitEarlyWarning(
				session.cooldownUntilTurn,
				turn,
			);
			const message = buildStoredEarlyWarningMessage({
				config,
				signals: session.signals,
			});
			const now = new Date().toISOString();

			session.lastUpdatedAt = now;
			state.updatedAt = now;

			if (
				!message ||
				session.earlyWarnings >= config.maxWarningsPerSession ||
				!shouldWarnNow
			) {
				await saveWarningState(config.stateFilePath, state);
				return undefined;
			}

			session.earlyWarnings += 1;
			session.lastWarnedTurn = turn;
			session.cooldownUntilTurn = turn + config.cooldownTurns;
			await saveWarningState(config.stateFilePath, state);

			return {
				handled: true,
				reply: {
					text: message,
				},
				reason: "session-bloat-early-warning",
			};
		},
	};
}
