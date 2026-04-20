import {
	type AnyAgentTool,
	definePluginEntry,
	type OpenClawPluginApi,
} from "../api.js";
import { createUrlTailwindScaffoldTool } from "./runtime/analysis/url-tailwind-scaffold-tool.js";

export default definePluginEntry({
	id: "openclaw-url-tailwind-scaffold",
	name: "OpenClaw URL Tailwind Scaffold",
	description:
		"Analyzes a reference page URL and returns a bounded Tailwind CSS v4 scaffold summary or page contract.",
	register(api: OpenClawPluginApi) {
		api.registerTool(
			(toolContext: { agentId?: string; sessionKey?: string } = {}) =>
				createUrlTailwindScaffoldTool({
					pluginConfig: api.pluginConfig,
					toolContext: {
						agentId: toolContext.agentId,
						sessionKey: toolContext.sessionKey,
					},
				}) as unknown as AnyAgentTool,
			{
				optional: true,
			},
		);
	},
});
