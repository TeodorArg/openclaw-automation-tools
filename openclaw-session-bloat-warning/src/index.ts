import { definePluginEntry, type OpenClawPluginApi } from "../api.js";
import { resolvePluginConfig } from "./runtime/config/plugin-config.js";
import { createEarlyWarningDeliveryHooks } from "./runtime/hooks/early-warning-delivery-hooks.js";
import { createCompactionWarningHooks } from "./runtime/hooks/session-compact-hooks.js";

export default definePluginEntry({
	id: "openclaw-session-bloat-warning",
	name: "OpenClaw Session Bloat Warning",
	description:
		"Compaction-surface warning plugin with calm pre/post compaction notices and early session-heaviness tracking for timeout_risk, lane_pressure, and no_reply_streak.",
	register(api: OpenClawPluginApi) {
		const pluginConfig = resolvePluginConfig(api.pluginConfig);
		const hooks = createCompactionWarningHooks(pluginConfig);
		const deliveryHooks = createEarlyWarningDeliveryHooks(pluginConfig);

		api.on("before_compaction", hooks.beforeCompaction);
		api.on("after_compaction", hooks.afterCompaction);
		api.on("before_agent_reply", deliveryHooks.beforeAgentReply);
		api.on("llm_input", hooks.llmInput);
		api.on("llm_output", hooks.llmOutput);
	},
});
