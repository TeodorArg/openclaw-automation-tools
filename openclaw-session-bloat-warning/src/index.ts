import {
	type AnyAgentTool,
	definePluginEntry,
	type OpenClawPluginApi,
} from "../api.js";
import { resolvePluginConfig } from "./runtime/config/plugin-config.js";
import { createEarlyWarningDeliveryHooks } from "./runtime/hooks/early-warning-delivery-hooks.js";
import { createOperatorDiagnosticsHooks } from "./runtime/hooks/operator-diagnostics-hooks.js";
import { createCompactionWarningHooks } from "./runtime/hooks/session-compact-hooks.js";
import { createSessionBloatStatusTool } from "./status-tool.js";

export default definePluginEntry({
	id: "openclaw-session-bloat-warning",
	name: "OpenClaw Session Bloat Warning",
	description:
		"Early session-health warnings plus compact context-sync diagnostics for OpenClaw. Catch compaction pressure, timeout risk, lane pressure, and no-reply streaks before long AI work slows down.",
	register(api: OpenClawPluginApi) {
		const pluginConfig = resolvePluginConfig(api.pluginConfig);
		const hooks = createCompactionWarningHooks(pluginConfig);
		const deliveryHooks = createEarlyWarningDeliveryHooks(pluginConfig);
		const diagnosticsHooks = createOperatorDiagnosticsHooks(pluginConfig);

		api.registerTool(
			(_context: unknown) =>
				createSessionBloatStatusTool({
					pluginConfig,
				}) as unknown as AnyAgentTool,
			{ optional: true },
		);

		api.on("before_prompt_build", diagnosticsHooks.beforePromptBuild);
		api.on("before_compaction", hooks.beforeCompaction);
		api.on("after_compaction", hooks.afterCompaction);
		api.on("before_agent_reply", deliveryHooks.beforeAgentReply);
		api.on("llm_input", hooks.llmInput);
		api.on("llm_output", hooks.llmOutput);
	},
});
