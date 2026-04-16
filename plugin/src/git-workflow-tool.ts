import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { Type } from "@sinclair/typebox";
import { resolveWorkflowIntent } from "./runtime/intent-routing.js";
import { buildPlanResult, collectRepoState } from "./runtime/plan-groups.js";
import {
	type ConfirmedPlan,
	validateConfirmedPlan,
} from "./runtime/validate-confirmed-plan.js";

const execFileAsync = promisify(execFile);

function resolveRepoPath(): string {
	return path.resolve(
		process.env.OPENCLAW_GIT_WORKFLOW_REPO ??
			process.env.OPENCLAW_PROJECT_DIR ??
			"/home/node/project",
	);
}

function resolveScriptsDir(repoPath: string): string {
	return path.resolve(repoPath, "plugin/scripts");
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

type ScriptEnv = Record<string, string>;

async function runScript(
	repoPath: string,
	scriptName: string,
	args: string[],
	extraEnv: ScriptEnv = {},
): Promise<{ stdout: string; stderr: string }> {
	const scriptPath = path.join(resolveScriptsDir(repoPath), scriptName);
	const result = await execFileAsync(scriptPath, args, {
		cwd: repoPath,
		env: {
			...process.env,
			...extraEnv,
			OPENCLAW_GIT_WORKFLOW_REPO: repoPath,
		},
	});

	return {
		stdout: result.stdout?.trim() ?? "",
		stderr: result.stderr?.trim() ?? "",
	};
}

async function readGitConfig(repoPath: string, key: string): Promise<string> {
	try {
		const result = await execFileAsync("git", ["config", "--get", key], {
			cwd: repoPath,
		});
		return result.stdout.trim();
	} catch {
		return "";
	}
}

export async function resolveCommitIdentityEnv(
	repoPath: string,
): Promise<ScriptEnv> {
	const authorName =
		process.env.GIT_AUTHOR_NAME ||
		process.env.OPENCLAW_GIT_WORKFLOW_AUTHOR_NAME ||
		(await readGitConfig(repoPath, "user.name")) ||
		"OpenClaw Agent";
	const authorEmail =
		process.env.GIT_AUTHOR_EMAIL ||
		process.env.OPENCLAW_GIT_WORKFLOW_AUTHOR_EMAIL ||
		(await readGitConfig(repoPath, "user.email")) ||
		"openclaw@example.test";
	const committerName =
		process.env.GIT_COMMITTER_NAME ||
		process.env.OPENCLAW_GIT_WORKFLOW_COMMITTER_NAME ||
		authorName;
	const committerEmail =
		process.env.GIT_COMMITTER_EMAIL ||
		process.env.OPENCLAW_GIT_WORKFLOW_COMMITTER_EMAIL ||
		authorEmail;

	return {
		GIT_AUTHOR_NAME: authorName,
		GIT_AUTHOR_EMAIL: authorEmail,
		GIT_COMMITTER_NAME: committerName,
		GIT_COMMITTER_EMAIL: committerEmail,
	};
}

async function executeConfirmedPlan(plan: ConfirmedPlan) {
	const executedGroups: Array<Record<string, unknown>> = [];
	const repoPath = resolveRepoPath();
	const initialRepoState = await collectRepoState(repoPath);
	const initialHead = initialRepoState.headCommit;
	const commitIdentityEnv = await resolveCommitIdentityEnv(repoPath);

	for (const group of plan.groups) {
		try {
			const branchResult = await runScript(repoPath, "git-create-branch.sh", [
				group.branch,
				initialHead,
			]);
			const commitResult = await runScript(
				repoPath,
				"git-create-commit.sh",
				[
					group.branch,
					JSON.stringify(group.files),
					group.commit.title,
					group.commit.body,
				],
				commitIdentityEnv,
			);

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
			const intent = resolveWorkflowIntent({
				commandName: params.commandName,
				command: params.command,
			});

			if (params.skillName !== "openclaw-git-workflow") {
				throw new Error(
					"git_workflow_action only accepts requests from skill openclaw-git-workflow.",
				);
			}

			if (intent !== "send_to_git") {
				throw new Error(
					"git_workflow_action accepts only the canonical send_to_git intent or its supported aliases.",
				);
			}

			if (
				params.action === "plan-groups" ||
				params.action === "plan-groups-with-branches"
			) {
				const repoState = await collectRepoState(repoPath);
				const planResult = buildPlanResult(repoState, {
					includeBranches: params.action === "plan-groups-with-branches",
					sourceCommand: intent,
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
									intent,
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

				if (confirmedPlan.sourceCommand !== intent) {
					throw new Error(
						"confirmedPlan.sourceCommand does not match the normalized send_to_git intent for this request.",
					);
				}

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
