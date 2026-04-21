import {
	type AnyAgentTool,
	definePluginEntry,
	type OpenClawPluginApi,
} from "../api.js";
import { createCanonDoctorTool } from "./canon-doctor-tool.js";
import { createCanonFixTool } from "./canon-fix-tool.js";
import { createCanonStatusTool } from "./canon-status-tool.js";

export default definePluginEntry({
	id: "openclaw-canon",
	name: "Workspace Truth Guard for OpenClaw",
	description:
		"Keep docs, memory, and repo truth aligned in long-running OpenClaw work. Diagnose canon drift first, then preview and apply bounded fixes for supported memory and sync issues.",
	register(api: OpenClawPluginApi) {
		api.registerTool(
			() =>
				createCanonStatusTool({
					pluginConfig: api.pluginConfig,
				}) as unknown as AnyAgentTool,
			{
				optional: true,
			},
		);
		api.registerTool(
			() =>
				createCanonDoctorTool({
					pluginConfig: api.pluginConfig,
				}) as unknown as AnyAgentTool,
			{
				optional: true,
			},
		);
		api.registerTool(
			() =>
				createCanonFixTool({
					pluginConfig: api.pluginConfig,
				}) as unknown as AnyAgentTool,
			{
				optional: true,
			},
		);
	},
});
