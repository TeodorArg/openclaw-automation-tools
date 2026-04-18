import {
	type AnyAgentTool,
	definePluginEntry,
	type OpenClawPluginApi,
} from "../api.js";
import { createWorkflowPlannerTool } from "./workflow-planner-tool.js";

export default definePluginEntry({
	id: "openclaw-workflow-planner",
	name: "OpenClaw Workflow Planner",
	description:
		"Planning-first OpenClaw workflow for idea creation, typed research, idea gate, accepted plan lifecycle, and implementation handoff.",
	register(api: OpenClawPluginApi) {
		api.registerTool(
			(toolContext: { agentId?: string; sessionKey?: string }) =>
				createWorkflowPlannerTool({
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
