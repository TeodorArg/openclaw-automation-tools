import {
	type AnyAgentTool,
	definePluginEntry,
	type OpenClawPluginApi,
} from "../api.js";
import { createWorkflowPlannerTool } from "./runtime/planning/workflow-planner-tool.js";

export default definePluginEntry({
	id: "openclaw-workflow-planner",
	name: "OpenClaw Workflow Planner",
	description:
		"Planning-first OpenClaw workflow for idea creation, typed research, idea gate, lane-1 design, accepted plan lifecycle, task tracking, snapshots, and implementation handoff.",
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
