import { resolvePluginConfig } from "../dist/src/runtime/config/plugin-config.js";
import { createEarlyWarningDecision } from "../dist/src/runtime/core/early-warning-core.js";

const config = resolvePluginConfig(undefined);

const decision = createEarlyWarningDecision(
	{
		inputChars: 130000,
		messageCount: 90,
		estimatedInputTokens: 32500,
		observedUsageAvailability: "present",
		lastCachedInputTokens: 321152,
		lastTotalTokens: 34160,
	},
	config,
);

if (decision !== undefined) {
	throw new Error(
		`Built runtime drift detected: expected no visible warning when observed usage is present, got ${decision.reasonCode}.`,
	);
}

console.log(
	"Built runtime verified: history heuristics stay support-only when observed usage is present.",
);
