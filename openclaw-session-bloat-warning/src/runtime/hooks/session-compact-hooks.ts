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
import type { SessionSignalState } from "../state/state-types.js";
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
			const previousSignals = session.signals;
			const observation = observeEarlyWarningInput({
				event,
				ctx,
				config,
				session,
			});

			session.turnCount = observation.turn;
			session.signals = enrichRuntimeTruth({
				previousSignals,
				nextSignals: observation.signals,
				event,
				ctx,
				config,
				now: observation.now,
			});
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

			session.signals = enrichRuntimeTruth({
				previousSignals: session.signals,
				nextSignals: observation.signals,
				event,
				ctx,
				config,
				now: observation.now,
			});
			session.lastUpdatedAt = observation.now;
			state.updatedAt = observation.now;
			await saveWarningState(config.stateFilePath, state);
		},
	};
}

function enrichRuntimeTruth(params: {
	previousSignals?: SessionSignalState;
	nextSignals: SessionSignalState;
	event: LlmInputHookEvent | LlmOutputHookEvent;
	ctx: PluginHookContext;
	config: SessionBloatWarningConfig;
	now: string;
}) {
	const previous = params.previousSignals ?? {};
	const next: SessionSignalState = {
		...previous,
		...params.nextSignals,
	};
	const provider = readProvider(params.event) ?? previous.lastProvider;
	const model = readModel(params.event) ?? previous.lastModel;
	const authProfile = readAuthProfile(params.ctx) ?? previous.lastAuthProfile;
	const sessionId = readSessionId(params.event) ?? previous.lastSessionId;

	next.lastProvider = provider;
	next.lastModel = model;
	next.lastAuthProfile = authProfile;

	const effectiveWindow = resolveEffectiveContextWindow({
		provider,
		model,
		authProfile,
		config: params.config,
	});
	next.effectiveContextWindowTokens = effectiveWindow.tokens;
	next.effectiveContextWindowSource = effectiveWindow.source;
	next.effectiveContextWindowResolvedAt = params.now;

	if (sessionId && sessionId !== previous.lastSessionId) {
		next.lastSessionId = sessionId;
		next.lastSessionIdChangedAt = params.now;
		next.providerChainStatus = previous.lastSessionId ? "fresh" : "unknown";
		next.resetIntegrityStatus = previous.lastSessionId ? "ok" : "unknown";
		next.lastIdentityChangeKind = "session";
		next.lastResetReason = previous.lastSessionId
			? "session_changed"
			: "unknown";
	}

	if (provider && previous.lastProvider && provider !== previous.lastProvider) {
		next.lastIdentityChangedAt = params.now;
		next.lastIdentityChangeKind = "provider";
		next.lastResetReason = "provider_changed";
		next.providerChainStatus = "unknown";
		next.resetIntegrityStatus = "suspicious";
	}
	if (model && previous.lastModel && model !== previous.lastModel) {
		next.lastIdentityChangedAt = params.now;
		next.lastIdentityChangeKind = "model";
		next.lastResetReason = "model_changed";
		next.providerChainStatus = "unknown";
		next.resetIntegrityStatus = "suspicious";
	}
	if (
		authProfile &&
		previous.lastAuthProfile &&
		authProfile !== previous.lastAuthProfile
	) {
		next.lastIdentityChangedAt = params.now;
		next.lastIdentityChangeKind = "auth_profile";
		next.lastResetReason = "auth_profile_changed";
		next.providerChainStatus = "unknown";
		next.resetIntegrityStatus = "suspicious";
	}

	return next;
}

function resolveEffectiveContextWindow(params: {
	provider?: string;
	model?: string;
	authProfile?: string;
	config: SessionBloatWarningConfig;
}) {
	const providerCatalogWindow = readProviderCatalogContextWindow(
		params.provider,
		params.model,
	);
	if (providerCatalogWindow) {
		return {
			tokens: providerCatalogWindow,
			source: "provider_catalog" as const,
		};
	}
	if (params.authProfile) {
		return {
			tokens: params.config.contextWindowTokens,
			source: "auth_profile" as const,
		};
	}
	if (params.config.contextWindowTokens > 0) {
		return {
			tokens: params.config.contextWindowTokens,
			source: "plugin_fallback" as const,
		};
	}
	return { tokens: 200000, source: "safe_default" as const };
}

function readProviderCatalogContextWindow(
	provider: string | undefined,
	model: string | undefined,
) {
	if (provider === "openai-codex" && model === "gpt-5.4") {
		return 272000;
	}
	if (provider === "openai-codex" && model === "gpt-5.4-mini") {
		return 272000;
	}
	if (provider === "openai-codex" && model === "gpt-5.2") {
		return 272000;
	}
	return undefined;
}

function readProvider(event: LlmInputHookEvent | LlmOutputHookEvent) {
	return "provider" in event && typeof event.provider === "string"
		? event.provider
		: undefined;
}

function readModel(event: LlmInputHookEvent | LlmOutputHookEvent) {
	return "model" in event && typeof event.model === "string"
		? event.model
		: undefined;
}

function readSessionId(event: LlmInputHookEvent | LlmOutputHookEvent) {
	return typeof event.sessionId === "string" ? event.sessionId : undefined;
}

function readAuthProfile(ctx: PluginHookContext) {
	const value = (ctx as Record<string, unknown>).authProfileOverride;
	return typeof value === "string" ? value : undefined;
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
