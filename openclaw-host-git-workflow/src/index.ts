import {
	type AnyAgentTool,
	definePluginEntry,
	type OpenClawPluginApi,
} from "../api.js";
import { createHostGitWorkflowTool } from "./host-git-workflow-tool.js";

export default definePluginEntry({
	id: "openclaw-host-git-workflow",
	name: "OpenClaw Host Git Workflow",
	description:
		"Host-backed git workflow scaffold for repo-aware planning, repo resolution, node selection, host preflight, bounded push, bounded PR creation, checks wait, merge, and sync-main.",
	register(api: OpenClawPluginApi) {
		api.registerTool(
			(toolContext: { agentId?: string; sessionKey?: string }) =>
				createHostGitWorkflowTool({
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
