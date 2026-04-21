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
	DriftStatus,
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
	estimatedInputTokens?: number;
	lastCachedInputTokens?: number;
	lastOutputTokens?: number;
	lastTotalTokens?: number;
	estimateObservedDriftTokens?: number;
	estimateObservedDriftRatio?: number;
	driftStatus?: DriftStatus;
	providerChainStatus?: SessionSignalState["providerChainStatus"];
	resetIntegrityStatus?: SessionSignalState["resetIntegrityStatus"];
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

	return {
		signals: {
			...(params.session.signals ?? {}),
			lastInputChars: signals.inputChars,
			lastMessageCount: signals.messageCount,
			lastInputTokens: signals.inputTokens,
			lastEstimatedInputTokens: signals.estimatedInputTokens,
			estimateObservedDriftTokens: signals.estimateObservedDriftTokens,
			estimateObservedDriftRatio: signals.estimateObservedDriftRatio,
			driftStatus: signals.driftStatus,
			lastSeverity: decision?.severity,
			lastReasonCode: decision?.reasonCode,
			lastRunId: params.event.runId ?? params.ctx.runId,
			lastObservedAt: now,
		},
		decision,
		turn,
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
	const observedUsage = readObservedUsage(params.event);
	return {
		signals: {
			...nextSignals,
			lastInputTokens: observedUsage.inputTokens ?? nextSignals.lastInputTokens,
			lastCachedInputTokens:
				observedUsage.cachedInputTokens ?? nextSignals.lastCachedInputTokens,
			lastOutputTokens:
				observedUsage.outputTokens ?? nextSignals.lastOutputTokens,
			lastCacheWriteTokens:
				observedUsage.cacheWriteTokens ?? nextSignals.lastCacheWriteTokens,
			lastTotalTokens: observedUsage.totalTokens ?? nextSignals.lastTotalTokens,
			observedUsageAvailability: observedUsage.availability,
			lastProvider:
				params.event.provider ??
				params.event.lastAssistant?.provider ??
				nextSignals.lastProvider,
			lastModel:
				params.event.model ??
				params.event.lastAssistant?.model ??
				nextSignals.lastModel,
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
		observedInputTokens: params.signals?.lastInputTokens,
		estimatedInputTokens: params.signals?.lastEstimatedInputTokens,
		cachedInputTokens: params.signals?.lastCachedInputTokens,
		outputTokens: params.signals?.lastOutputTokens,
		totalTokens: params.signals?.lastTotalTokens,
		estimateObservedDriftTokens: params.signals?.estimateObservedDriftTokens,
		estimateObservedDriftRatio: params.signals?.estimateObservedDriftRatio,
		driftStatus: params.signals?.driftStatus,
		providerChainStatus: params.signals?.providerChainStatus,
		resetIntegrityStatus: params.signals?.resetIntegrityStatus,
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

	const estimatedInputTokens = estimateInputTokensFromChars(inputChars);
	const drift = computeObservedDrift({
		estimatedInputTokens,
		observedInputTokens: existingSignals?.lastInputTokens,
	});
	const driftEligible = typeof existingSignals?.lastInputTokens === "number";

	return {
		inputChars,
		messageCount,
		inputTokens: existingSignals?.lastInputTokens,
		estimatedInputTokens,
		lastCachedInputTokens: existingSignals?.lastCachedInputTokens,
		lastOutputTokens: existingSignals?.lastOutputTokens,
		lastTotalTokens: existingSignals?.lastTotalTokens,
		estimateObservedDriftTokens: driftEligible ? drift.driftTokens : undefined,
		estimateObservedDriftRatio: driftEligible ? drift.driftRatio : undefined,
		driftStatus: driftEligible ? drift.status : undefined,
		providerChainStatus: existingSignals?.providerChainStatus,
		resetIntegrityStatus: existingSignals?.resetIntegrityStatus,
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
			observedInputTokens: signals.inputTokens,
			estimatedInputTokens: signals.estimatedInputTokens,
			cachedInputTokens: signals.lastCachedInputTokens,
			outputTokens: signals.lastOutputTokens,
			totalTokens: signals.lastTotalTokens,
			estimateObservedDriftTokens: signals.estimateObservedDriftTokens,
			estimateObservedDriftRatio: signals.estimateObservedDriftRatio,
			driftStatus: signals.driftStatus,
			providerChainStatus: signals.providerChainStatus,
			resetIntegrityStatus: signals.resetIntegrityStatus,
		}),
	};
}

function estimateInputTokensFromChars(inputChars: number) {
	if (!Number.isFinite(inputChars) || inputChars <= 0) {
		return 0;
	}
	return Math.max(0, Math.round(inputChars / 4));
}

export function computeObservedDrift(params: {
	estimatedInputTokens?: number;
	observedInputTokens?: number;
}) {
	const estimated = params.estimatedInputTokens;
	const observed = params.observedInputTokens;
	if (
		typeof observed !== "number" ||
		!Number.isFinite(observed) ||
		observed < 0
	) {
		return {
			driftTokens: undefined,
			driftRatio: undefined,
			status: (typeof estimated === "number" && estimated > 0
				? "missing"
				: "heuristic") as DriftStatus,
		};
	}
	if (
		typeof estimated !== "number" ||
		!Number.isFinite(estimated) ||
		estimated < 0
	) {
		return {
			driftTokens: undefined,
			driftRatio: undefined,
			status: "heuristic" as DriftStatus,
		};
	}
	const driftTokens = Math.abs(estimated - observed);
	const denominator = Math.max(observed, 1);
	const driftRatio = driftTokens / denominator;
	return {
		driftTokens,
		driftRatio,
		status: "observed" as DriftStatus,
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
		const criticalThreshold = Math.min(
			config.criticalInputTokensThreshold,
			Math.round(config.contextWindowTokens * config.criticalInputTokensRatio),
		);
		const elevatedThreshold = Math.min(
			config.elevatedInputTokensThreshold,
			Math.round(config.contextWindowTokens * config.elevatedInputTokensRatio),
		);
		const warningThreshold = Math.min(
			config.warningInputTokensThreshold,
			Math.round(config.contextWindowTokens * config.warningInputTokensRatio),
		);
		if (inputTokens >= criticalThreshold) {
			return { severity: "critical", reasonCode: "input_tokens" };
		}
		if (inputTokens >= elevatedThreshold) {
			return { severity: "elevated", reasonCode: "input_tokens" };
		}
		if (inputTokens >= warningThreshold) {
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

export function readObservedUsage(event: LlmOutputHookEvent) {
	const inputTokens =
		typeof event.usage?.input === "number" && Number.isFinite(event.usage.input)
			? Math.max(0, Math.round(event.usage.input))
			: undefined;
	const cachedInputTokens =
		typeof event.usage?.cacheRead === "number" &&
		Number.isFinite(event.usage.cacheRead)
			? Math.max(0, Math.round(event.usage.cacheRead))
			: undefined;
	const outputTokens =
		typeof event.usage?.output === "number" &&
		Number.isFinite(event.usage.output)
			? Math.max(0, Math.round(event.usage.output))
			: undefined;
	const cacheWriteTokens =
		typeof event.usage?.cacheWrite === "number" &&
		Number.isFinite(event.usage.cacheWrite)
			? Math.max(0, Math.round(event.usage.cacheWrite))
			: undefined;
	const totalTokens =
		typeof event.usage?.total === "number" && Number.isFinite(event.usage.total)
			? Math.max(0, Math.round(event.usage.total))
			: undefined;
	const hasUsage =
		inputTokens !== undefined ||
		cachedInputTokens !== undefined ||
		cacheWriteTokens !== undefined ||
		outputTokens !== undefined ||
		totalTokens !== undefined;

	return {
		inputTokens,
		cachedInputTokens,
		outputTokens,
		cacheWriteTokens,
		totalTokens,
		availability: hasUsage ? "present" : "missing",
	} as const;
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
	if (signals.resetIntegrityStatus === "suspicious") {
		return { severity: "critical", reasonCode: "reset_integrity_suspicious" };
	}
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
	if (
		signals.driftStatus === "observed" &&
		typeof signals.estimateObservedDriftRatio === "number" &&
		typeof signals.estimateObservedDriftTokens === "number" &&
		signals.estimateObservedDriftTokens >= 20000 &&
		signals.estimateObservedDriftRatio >= 0.2 &&
		typeof signals.inputTokens !== "number"
	) {
		return { severity: "elevated", reasonCode: "estimate_observed_drift" };
	}
	if (
		(signals.driftStatus === "missing" ||
			signals.driftStatus === "heuristic") &&
		typeof signals.inputTokens !== "number" &&
		signals.inputChars < config.earlyWarningCharThreshold &&
		signals.messageCount < config.earlyWarningMessageCountThreshold
	) {
		return { severity: "warning", reasonCode: "provider_usage_unknown" };
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
