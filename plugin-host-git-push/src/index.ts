import {
	type AnyAgentTool,
	definePluginEntry,
	type OpenClawPluginApi,
} from "../api.js";
import { createGitPrBridgeTool } from "./git-pr-bridge-tool.js";
import { createGitPushBridgeTool } from "./git-push-bridge-tool.js";

export default definePluginEntry({
	id: "openclaw-host-git-push",
	name: "OpenClaw Host Git Push",
	description:
		"Bounded host-git bridge for capability preflight, push-current-branch, and create-pr-to-main.",
	register(api: OpenClawPluginApi) {
		api.registerTool(createGitPushBridgeTool() as unknown as AnyAgentTool, {
			optional: true,
		});
		api.registerTool(createGitPrBridgeTool() as unknown as AnyAgentTool, {
			optional: true,
		});
	},
});
