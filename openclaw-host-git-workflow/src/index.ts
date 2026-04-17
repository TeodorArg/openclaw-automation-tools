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
		"Host-backed git workflow scaffold for repo-aware planning, repo resolution, node selection, host preflight, bounded push, and bounded PR creation.",
	register(api: OpenClawPluginApi) {
		api.registerTool(
			createHostGitWorkflowTool({
				pluginConfig: api.pluginConfig,
			}) as unknown as AnyAgentTool,
			{
				optional: true,
			},
		);
	},
});
