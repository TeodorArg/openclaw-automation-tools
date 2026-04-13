import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { Type } from "@sinclair/typebox";
import { buildPlanResult, collectRepoState } from "./runtime/plan-groups.js";
import {
	type ConfirmedPlan,
	validateConfirmedPlan,
} from "./runtime/validate-confirmed-plan.js";

const execFileAsync = promisify(execFile);

function resolveRepoPath(): string {
	return path.resolve(
		process.env.OPENCLAW_GIT_WORKFLOW_REPO ??
			"/home/node/repos/openclaw-git-workflow",
	);
}

function resolveScriptsDir(repoPath: string): string {
	return path.resolve(repoPath, "scripts");
}

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
	repoPath: string,
	scriptName: string,
	args: string[],
): Promise<{ stdout: string; stderr: string }> {
	const scriptPath = path.join(resolveScriptsDir(repoPath), scriptName);
	const result = await execFileAsync(scriptPath, args, {
		cwd: repoPath,
		env: {
			...process.env,
			OPENCLAW_GIT_WORKFLOW_REPO: repoPath,
		},
	});

	return {
		stdout: result.stdout?.trim() ?? "",
		stderr: result.stderr?.trim() ?? "",
	};
}

async function executeConfirmedPlan(plan: ConfirmedPlan) {
	const executedGroups: Array<Record<string, unknown>> = [];
	const repoPath = resolveRepoPath();
	const initialRepoState = await collectRepoState(repoPath);

	for (const group of plan.groups) {
		try {
			const branchResult = await runScript(repoPath, "git-create-branch.sh", [
				group.branch,
			]);
			const commitResult = await runScript(repoPath, "git-create-commit.sh", [
				group.branch,
				JSON.stringify(group.files),
				group.commit.title,
				group.commit.body,
			]);

			executedGroups.push({
				id: group.id,
				branch: group.branch,
				files: group.files,
				status: "executed",
				branchResult,
				commitResult,
			});
		} catch (error) {
			return {
				ok: false,
				action: "execute-groups-with-branches",
				repoPath: plan.repoPath,
				status: "failed",
				initialBranch: initialRepoState.currentBranch,
				executedGroups,
				failedGroup: {
					id: group.id,
					branch: group.branch,
					files: group.files,
				},
				error: formatExecutionError(error),
			};
		}
	}

	return {
		ok: true,
		action: "execute-groups-with-branches",
		repoPath: plan.repoPath,
		status: "executed",
		initialBranch: initialRepoState.currentBranch,
		executedGroups,
	};
}

function normalizeConfirmedPlanInput(raw: unknown): unknown {
	if (typeof raw !== "string") {
		return raw;
	}

	const trimmed = raw.trim();
	if (trimmed === "") {
		return raw;
	}

	try {
		return JSON.parse(trimmed);
	} catch {
		throw new Error("confirmedPlan string must contain valid JSON.");
	}
}

function formatExecutionError(error: unknown) {
	if (error && typeof error === "object") {
		const execError = error as {
			message?: string;
			stdout?: string;
			stderr?: string;
			code?: number | string;
		};

		return {
			message: execError.message ?? "Unknown execution error.",
			stdout: execError.stdout?.trim() ?? "",
			stderr: execError.stderr?.trim() ?? "",
			code: execError.code ?? null,
		};
	}

	return {
		message: String(error),
		stdout: "",
		stderr: "",
		code: null,
	};
}

export function createGitWorkflowTool() {
	return {
		name: "git_workflow_action",
		description:
			"Bounded git workflow tool for planning handoff and confirmed branch/commit execution.",
		parameters: ToolSchema,
		async execute(_toolCallId: string, params: ToolParams) {
			const repoPath = resolveRepoPath();

			if (params.skillName !== "openclaw-git-workflow") {
				throw new Error(
					"git_workflow_action only accepts requests from skill openclaw-git-workflow.",
				);
			}

			if (
				params.action === "plan-groups" ||
				params.action === "plan-groups-with-branches"
			) {
				const repoState = await collectRepoState(repoPath);
				const planResult = buildPlanResult(repoState, {
					includeBranches: params.action === "plan-groups-with-branches",
					sourceCommand: params.commandName,
				});

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									ok: true,
									action: params.action,
									repoPath,
									mode: "plan-only",
									commandName: params.commandName,
									command: params.command,
									currentBranch: planResult.currentBranch,
									changedFiles: planResult.changedFiles,
									groups: planResult.groups,
									confirmedPlanCandidate: planResult.confirmedPlanCandidate,
									note:
										planResult.groups.length > 0
											? "Planning output is repo-aware and derived from current changed files. Execute remains bounded and still requires an explicit confirmed plan handoff."
											: "No changed files detected in the target repo, so there is nothing to group yet.",
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

			try {
				const confirmedPlan = validateConfirmedPlan(
					normalizeConfirmedPlanInput(params.confirmedPlan),
					repoPath,
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
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									ok: false,
									action: "execute-groups-with-branches",
									repoPath,
									status: "rejected",
									error: formatExecutionError(error),
									note: "Execute accepts only a valid confirmed plan payload and remains bounded to branch plus commit actions.",
								},
								null,
								2,
							),
						},
					],
				};
			}
		},
	};
}
