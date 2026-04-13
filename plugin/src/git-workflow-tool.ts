import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { Type } from "@sinclair/typebox";
import {
	type ConfirmedPlan,
	validateConfirmedPlan,
} from "./runtime/validate-confirmed-plan.js";

const execFileAsync = promisify(execFile);
const REPO_PATH = "/home/node/repos/openclaw-git-workflow";
const SCRIPTS_DIR = path.resolve(REPO_PATH, "scripts");

const ToolSchema = Type.Object(
	{
		action: Type.Union([
			Type.Literal("plan-groups"),
			Type.Literal("plan-groups-with-branches"),
			Type.Literal("execute-groups-with-branches"),
		]),
		command: Type.String(),
		commandName: Type.String(),
		skillName: Type.String(),
		confirmedPlan: Type.Optional(Type.Unknown()),
	},
	{ additionalProperties: false },
);

type ToolParams = {
	action:
		| "plan-groups"
		| "plan-groups-with-branches"
		| "execute-groups-with-branches";
	command: string;
	commandName: string;
	skillName: string;
	confirmedPlan?: unknown;
};

async function runScript(
	scriptName: string,
	args: string[],
): Promise<{ stdout: string; stderr: string }> {
	const scriptPath = path.join(SCRIPTS_DIR, scriptName);
	const result = await execFileAsync(scriptPath, args, {
		cwd: REPO_PATH,
		env: {
			...process.env,
			OPENCLAW_GIT_WORKFLOW_REPO: REPO_PATH,
		},
	});

	return {
		stdout: result.stdout?.trim() ?? "",
		stderr: result.stderr?.trim() ?? "",
	};
}

async function executeConfirmedPlan(plan: ConfirmedPlan) {
	const executedGroups: Array<Record<string, unknown>> = [];

	for (const group of plan.groups) {
		const branchResult = await runScript("git-create-branch.sh", [
			group.branch,
		]);
		const commitResult = await runScript("git-create-commit.sh", [
			group.branch,
			JSON.stringify(group.files),
			group.commit.title,
			group.commit.body,
		]);

		executedGroups.push({
			id: group.id,
			branch: group.branch,
			files: group.files,
			branchResult,
			commitResult,
		});
	}

	return {
		ok: true,
		action: "execute-groups-with-branches",
		repoPath: plan.repoPath,
		executedGroups,
	};
}

export function createGitWorkflowTool() {
	return {
		name: "git_workflow_action",
		description:
			"Bounded git workflow tool for planning handoff and confirmed branch/commit execution.",
		parameters: ToolSchema,
		async execute(_toolCallId: string, params: ToolParams) {
			if (params.skillName !== "openclaw_git_workflow") {
				throw new Error(
					"git_workflow_action only accepts requests from skill openclaw_git_workflow.",
				);
			}

			if (
				params.action === "plan-groups" ||
				params.action === "plan-groups-with-branches"
			) {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									ok: true,
									action: params.action,
									repoPath: REPO_PATH,
									mode: "plan-only",
									commandName: params.commandName,
									command: params.command,
									note: "Planning path scaffold only. Execute path is bounded separately and requires confirmedPlan.",
								},
								null,
								2,
							),
						},
					],
				};
			}

			if (params.action !== "execute-groups-with-branches") {
				throw new Error("Unsupported git_workflow_action action.");
			}

			const confirmedPlan = validateConfirmedPlan(
				params.confirmedPlan,
				REPO_PATH,
			);
			const result = await executeConfirmedPlan(confirmedPlan);

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(result, null, 2),
					},
				],
			};
		},
	};
}
