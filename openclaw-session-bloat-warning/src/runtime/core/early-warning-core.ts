import type {
	LlmInputHookEvent,
	LlmOutputHookEvent,
	PluginHookContext,
} from "../../../api.js";
import type {
	SessionBloatWarningConfig,
	WarningSeverity,
} from "../config/plugin-config.js";
import type {
	SessionSignalState,
	SessionWarningState,
} from "../state/state-types.js";
import { buildEarlyWarning } from "../text/messages.js";

export type EarlyWarningDecision = {
	severity: WarningSeverity;
	reasonCode: string;
	message: string;
};

export type EarlyWarningInputSignals = {
	inputChars: number;
	messageCount: number;
	inputTokens?: number;
};

export type EarlyWarningObservation = {
	signals: SessionSignalState;
	decision?: EarlyWarningDecision;
	turn: number;
	shouldWarnNow: boolean;
	now: string;
};

export function observeEarlyWarningInput(params: {
	event: LlmInputHookEvent;
	ctx: PluginHookContext;
	config: SessionBloatWarningConfig;
	session: Pick<
		SessionWarningState,
		| "beforeWarnings"
		| "afterWarnings"
		| "earlyWarnings"
		| "cooldownUntilTurn"
		| "signals"
	>;
	now?: string;
}): EarlyWarningObservation {
	const signals = measureInputSignals(params.event, params.session.signals);
	const decision = createEarlyWarningDecision(signals, params.config);
	const turn =
		params.session.beforeWarnings +
		params.session.afterWarnings +
		params.session.earlyWarnings +
		1;
	const now = params.now ?? new Date().toISOString();
	const shouldWarnNow = Boolean(
		decision && shouldEmitEarlyWarning(params.session.cooldownUntilTurn, turn),
	);

	return {
		signals: {
			...(params.session.signals ?? {}),
			lastInputChars: signals.inputChars,
			lastMessageCount: signals.messageCount,
			lastInputTokens: signals.inputTokens,
			lastSeverity: decision?.severity,
			lastReasonCode: decision?.reasonCode,
			lastRunId: params.event.runId ?? params.ctx.runId,
		},
		decision,
		turn,
		shouldWarnNow,
		now,
	};
}

export function observeEarlyWarningOutput(params: {
	event: LlmOutputHookEvent;
	ctx: PluginHookContext;
	sessionSignals?: SessionSignalState;
	now?: string;
}) {
	const now = params.now ?? new Date().toISOString();
	return {
		signals: {
			...(params.sessionSignals ?? {}),
			lastInputTokens: readInputTokens(params.event),
			lastRunId: params.event.runId ?? params.ctx.runId,
		},
		now,
	};
}

export function getEarlyWarningMessage(params: {
	event: LlmInputHookEvent;
	ctx: PluginHookContext;
	config: SessionBloatWarningConfig;
	session: Pick<
		SessionWarningState,
		| "beforeWarnings"
		| "afterWarnings"
		| "earlyWarnings"
		| "cooldownUntilTurn"
		| "signals"
	>;
}) {
	return observeEarlyWarningInput(params).decision?.message;
}

export function buildStoredEarlyWarningMessage(params: {
	config: SessionBloatWarningConfig;
	signals?: SessionSignalState;
}) {
	const severity = params.signals?.lastSeverity;
	const reasonCode = params.signals?.lastReasonCode;
	if (!severity || !reasonCode) {
		return undefined;
	}

	return buildEarlyWarning({
		language: params.config.defaultLanguage,
		severity,
		reasonCode,
	});
}

export function shouldEmitEarlyWarning(
	cooldownUntilTurn: number | undefined,
	turn: number,
) {
	return cooldownUntilTurn === undefined || turn >= cooldownUntilTurn;
}

export function measureInputSignals(
	event: LlmInputHookEvent,
	existingSignals?: SessionSignalState,
): EarlyWarningInputSignals {
	const systemPrompt =
		typeof event.systemPrompt === "string" ? event.systemPrompt : "";
	const prompt = typeof event.prompt === "string" ? event.prompt : "";
	const inputChars =
		systemPrompt.length +
		prompt.length +
		estimateHistoryChars(event.historyMessages);
	const messageCount = Array.isArray(event.historyMessages)
		? event.historyMessages.length
		: 0;

	return {
		inputChars,
		messageCount,
		inputTokens: existingSignals?.lastInputTokens,
	};
}

export function createEarlyWarningDecision(
	signals: EarlyWarningInputSignals,
	config: SessionBloatWarningConfig,
): EarlyWarningDecision | undefined {
	const classified = classifyInputSeverity(signals, config);
	if (!classified) {
		return undefined;
	}

	return {
		...classified,
		message: buildEarlyWarning({
			language: config.defaultLanguage,
			severity: classified.severity,
			reasonCode: classified.reasonCode,
		}),
	};
}

function estimateHistoryChars(historyMessages: unknown[] | undefined) {
	if (!Array.isArray(historyMessages)) {
		return 0;
	}

	return historyMessages.reduce<number>((total, message) => {
		if (!message || typeof message !== "object") {
			return total;
		}

		return total + JSON.stringify(message).length;
	}, 0);
}

function classifyInputSeverity(
	signals: EarlyWarningInputSignals,
	config: SessionBloatWarningConfig,
): { severity: WarningSeverity; reasonCode: string } | undefined {
	const inputTokens = signals.inputTokens;
	if (typeof inputTokens === "number") {
		if (inputTokens >= config.criticalInputTokensThreshold) {
			return { severity: "critical", reasonCode: "input_tokens" };
		}
		if (inputTokens >= config.elevatedInputTokensThreshold) {
			return { severity: "elevated", reasonCode: "input_tokens" };
		}
		if (inputTokens >= config.warningInputTokensThreshold) {
			return { severity: "warning", reasonCode: "input_tokens" };
		}
	}

	if (signals.inputChars >= config.warningCharThreshold * 1.25) {
		return { severity: "elevated", reasonCode: "history_chars" };
	}
	if (signals.inputChars >= config.warningCharThreshold) {
		return { severity: "warning", reasonCode: "history_chars" };
	}
	if (signals.messageCount >= config.warningMessageCountThreshold * 1.5) {
		return { severity: "elevated", reasonCode: "history_messages" };
	}
	if (signals.messageCount >= config.warningMessageCountThreshold) {
		return { severity: "warning", reasonCode: "history_messages" };
	}

	return undefined;
}

function readInputTokens(event: LlmOutputHookEvent) {
	return typeof event.usage?.input === "number" &&
		Number.isFinite(event.usage.input)
		? Math.max(0, Math.round(event.usage.input))
		: undefined;
}
