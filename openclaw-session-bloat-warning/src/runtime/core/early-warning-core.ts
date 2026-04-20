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
	timeoutRiskStreak?: number;
	lanePressureStreak?: number;
	noReplyStreak?: number;
	lastObservedTimeoutMs?: number;
	lastObservedLaneWaitMs?: number;
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
		"turnCount" | "cooldownUntilTurn" | "signals"
	>;
	now?: string;
}): EarlyWarningObservation {
	const signals = measureInputSignals(params.event, params.session.signals);
	const decision = createEarlyWarningDecision(signals, params.config);
	const turn = (params.session.turnCount ?? 0) + 1;
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
			lastObservedAt: now,
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
	config: SessionBloatWarningConfig;
	sessionSignals?: SessionSignalState;
	now?: string;
}) {
	const now = params.now ?? new Date().toISOString();
	const nextSignals = applyOutputRiskSignals({
		event: params.event,
		config: params.config,
		sessionSignals: params.sessionSignals,
	});
	return {
		signals: {
			...nextSignals,
			lastInputTokens:
				readInputTokens(params.event) ?? nextSignals.lastInputTokens,
			lastRunId: params.event.runId ?? params.ctx.runId,
			lastObservedAt: now,
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
		"turnCount" | "cooldownUntilTurn" | "signals"
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
		observedTimeoutMs: params.signals?.lastObservedTimeoutMs,
		observedLaneWaitMs: params.signals?.lastObservedLaneWaitMs,
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
		timeoutRiskStreak: existingSignals?.timeoutRiskStreak,
		lanePressureStreak: existingSignals?.lanePressureStreak,
		noReplyStreak: existingSignals?.noReplyStreak,
		lastObservedTimeoutMs: existingSignals?.lastObservedTimeoutMs,
		lastObservedLaneWaitMs: existingSignals?.lastObservedLaneWaitMs,
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
			observedTimeoutMs: signals.lastObservedTimeoutMs,
			observedLaneWaitMs: signals.lastObservedLaneWaitMs,
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
	const riskClassification = classifyRiskSeverity(signals, config);
	if (riskClassification) {
		return riskClassification;
	}

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

	if (signals.inputChars >= config.warningCharThreshold) {
		return { severity: "elevated", reasonCode: "history_chars" };
	}
	if (signals.inputChars >= config.earlyWarningCharThreshold) {
		return { severity: "warning", reasonCode: "history_chars" };
	}
	if (signals.messageCount >= config.warningMessageCountThreshold) {
		return { severity: "elevated", reasonCode: "history_messages" };
	}
	if (signals.messageCount >= config.earlyWarningMessageCountThreshold) {
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

function applyOutputRiskSignals(params: {
	event: LlmOutputHookEvent;
	config: SessionBloatWarningConfig;
	sessionSignals?: SessionSignalState;
}) {
	const previous = params.sessionSignals ?? {};
	const next: SessionSignalState = { ...previous };
	const assistantTexts = Array.isArray(params.event.assistantTexts)
		? params.event.assistantTexts.filter(
				(value): value is string => typeof value === "string",
			)
		: [];
	const lastAssistantError = params.event.lastAssistant?.errorMessage;
	const errorText =
		typeof lastAssistantError === "string" ? lastAssistantError : "";
	const combinedText = [errorText, ...assistantTexts].join("\n");

	const timeoutMs = parseGatewayTimeoutMs(combinedText);
	if (typeof timeoutMs === "number") {
		next.lastObservedTimeoutMs = timeoutMs;
		next.timeoutRiskStreak = (previous.timeoutRiskStreak ?? 0) + 1;
	} else if ((previous.timeoutRiskStreak ?? 0) > 0) {
		next.timeoutRiskStreak = 0;
	}

	const noReplySeen = /\bNo reply from agent\b/i.test(combinedText);
	if (noReplySeen) {
		next.noReplyStreak = (previous.noReplyStreak ?? 0) + 1;
		if (next.lastObservedTimeoutMs === undefined) {
			next.lastObservedTimeoutMs = params.config.timeoutRiskMsThreshold;
		}
	} else if ((previous.noReplyStreak ?? 0) > 0) {
		next.noReplyStreak = 0;
	}
	if (timeoutMs === undefined && !noReplySeen) {
		next.lastObservedTimeoutMs = undefined;
	}

	const laneWaitMs = parseLaneWaitMs(combinedText);
	if (typeof laneWaitMs === "number") {
		next.lastObservedLaneWaitMs = laneWaitMs;
		next.lanePressureStreak = (previous.lanePressureStreak ?? 0) + 1;
	} else if ((previous.lanePressureStreak ?? 0) > 0) {
		next.lanePressureStreak = 0;
	}
	if (laneWaitMs === undefined) {
		next.lastObservedLaneWaitMs = undefined;
	}

	return next;
}

function classifyRiskSeverity(
	signals: EarlyWarningInputSignals,
	config: SessionBloatWarningConfig,
): { severity: WarningSeverity; reasonCode: string } | undefined {
	if (
		meetsSignalThreshold(
			signals.timeoutRiskStreak,
			config.timeoutRiskStreakThreshold,
			signals.lastObservedTimeoutMs,
			config.timeoutRiskMsThreshold,
		)
	) {
		return { severity: "critical", reasonCode: "timeout_risk" };
	}
	if (
		meetsSignalThreshold(
			signals.noReplyStreak,
			config.noReplyStreakThreshold,
			signals.lastObservedTimeoutMs,
			Math.round(config.timeoutRiskMsThreshold * 0.75),
		)
	) {
		return { severity: "critical", reasonCode: "no_reply_streak" };
	}
	if (
		meetsSignalThreshold(
			signals.lanePressureStreak,
			config.lanePressureStreakThreshold,
			signals.lastObservedLaneWaitMs,
			config.lanePressureMsThreshold,
		)
	) {
		return { severity: "elevated", reasonCode: "lane_pressure" };
	}

	return undefined;
}

function meetsSignalThreshold(
	streak: number | undefined,
	streakThreshold: number,
	observedValue: number | undefined,
	valueThreshold: number,
) {
	return (
		(streak ?? 0) >= streakThreshold && (observedValue ?? 0) >= valueThreshold
	);
}

function parseGatewayTimeoutMs(text: string) {
	const match = text.match(/gateway timeout after\s+(\d+)ms/i);
	if (!match) {
		return undefined;
	}
	const value = Number.parseInt(match[1] ?? "", 10);
	return Number.isFinite(value) ? value : undefined;
}

function parseLaneWaitMs(text: string) {
	const match = text.match(/lane wait exceeded:[^\n]*waitedMs=(\d+)/i);
	if (!match) {
		return undefined;
	}
	const value = Number.parseInt(match[1] ?? "", 10);
	return Number.isFinite(value) ? value : undefined;
}
