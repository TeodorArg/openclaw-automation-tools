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
	name: "OpenClaw Canon",
	description:
		"Operational canon plugin for status, bounded diagnosis, and preview-first memory fixes.",
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
