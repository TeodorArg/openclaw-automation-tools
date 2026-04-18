import { definePluginEntry, type OpenClawPluginApi } from "../api.js";
import { resolvePluginConfig } from "./runtime/config/plugin-config.js";
import { createCompactionWarningHooks } from "./runtime/hooks/session-compact-hooks.js";

export default definePluginEntry({
	id: "openclaw-session-bloat-warning",
	name: "OpenClaw Session Bloat Warning",
	description:
		"Compaction-surface warning plugin with calm pre/post compaction notices.",
	register(api: OpenClawPluginApi) {
		const pluginConfig = resolvePluginConfig(api.pluginConfig);
		const hooks = createCompactionWarningHooks(pluginConfig);

		api.on("before_compaction", hooks.beforeCompaction);
		api.on("after_compaction", hooks.afterCompaction);
	},
});
