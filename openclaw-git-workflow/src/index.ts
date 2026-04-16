import {
	type AnyAgentTool,
	definePluginEntry,
	type OpenClawPluginApi,
} from "../api.js";
import { createGitWorkflowTool } from "./git-workflow-tool.js";

export default definePluginEntry({
	id: "openclaw-git-workflow",
	name: "OpenClaw Git Workflow",
	description: "Bounded git workflow tool for plan and execute handoff.",
	register(api: OpenClawPluginApi) {
		api.registerTool(createGitWorkflowTool() as unknown as AnyAgentTool, {
			optional: true,
		});
	},
});
