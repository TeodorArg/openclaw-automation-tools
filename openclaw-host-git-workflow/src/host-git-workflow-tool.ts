import { Type } from "@sinclair/typebox";
import {
	createPullRequest,
	enterWorkingBranch,
	mergePullRequest,
	pushCurrentBranch,
	syncMainBranch,
	waitForPullRequestChecks,
} from "./runtime/host/ops.js";
import { preflightHostOps } from "./runtime/host/preflight.js";
import {
	assertBoundNodeSelection,
	createNodeHostCommandRunner,
} from "./runtime/node/execution.js";
import { resolveHostNodeSelection } from "./runtime/node/selection.js";
import { resolveWorkflowIntent } from "./runtime/planning/intent-routing.js";
import {
	buildPlanResult,
	collectRepoState,
} from "./runtime/planning/plan-groups.js";
import { validateConfirmedPlan } from "./runtime/planning/validate-confirmed-plan.js";
import { resolveRepoTarget } from "./runtime/repo/repo-resolution.js";

const ToolSchema = Type.Object(
	{
		action: Type.Union([
			Type.Literal("plan"),
			Type.Literal("plan_with_branches"),
			Type.Literal("validate_confirmed_plan"),
			Type.Literal("preflight"),
			Type.Literal("enter_branch"),
			Type.Literal("push_branch"),
			Type.Literal("create_pr"),
			Type.Literal("wait_for_checks"),
			Type.Literal("merge_pr"),
			Type.Literal("sync_main"),
		]),
		command: Type.String(),
		commandName: Type.String(),
		skillName: Type.String(),
		branchName: Type.Optional(Type.String()),
		confirmedPlan: Type.Optional(Type.Unknown()),
	},
	{ additionalProperties: false },
);

type ToolParams = {
	action:
		| "plan"
		| "plan_with_branches"
		| "validate_confirmed_plan"
		| "preflight"
		| "enter_branch"
		| "push_branch"
		| "create_pr"
		| "wait_for_checks"
		| "merge_pr"
		| "sync_main";
	command: string;
	commandName: string;
	skillName: string;
	branchName?: string;
	confirmedPlan?: unknown;
};

type HostGitWorkflowToolOptions = {
	pluginConfig?: {
		nodeSelector?: unknown;
	};
	toolContext?: {
		agentId?: string;
		sessionKey?: string;
	};
};

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

export function createHostGitWorkflowTool(
	options: HostGitWorkflowToolOptions = {},
) {
	return {
		name: "host_git_workflow_action",
		description:
			"Bounded host git workflow scaffold for planning, repo resolution, node selection, host preflight, branch entry, confirmed-plan validation, push, PR creation, wait-for-checks, merge, and sync-main.",
		parameters: ToolSchema,
		async execute(_toolCallId: string, params: ToolParams) {
			const repoTarget = resolveRepoTarget();
			const nodeSelection = await resolveHostNodeSelection({
				pluginConfig: options.pluginConfig,
			});
			const nodeRunner =
				nodeSelection.runtimeBindingStatus === "bound"
					? createNodeHostCommandRunner({
							nodeSelection,
							agentId: options.toolContext?.agentId,
							sessionKey: options.toolContext?.sessionKey,
						})
					: null;
			const requireNodeRunner = () => {
				assertBoundNodeSelection(nodeSelection);
				if (!nodeRunner) {
					throw new Error(
						"Host node runner was not initialized after successful node binding.",
					);
				}
				return nodeRunner;
			};
			const repoPath = repoTarget.repoPath;
			const intent = resolveWorkflowIntent({
				commandName: params.commandName,
				command: params.command,
			});

			if (params.skillName !== "openclaw-host-git-workflow") {
				throw new Error(
					"host_git_workflow_action only accepts requests from skill openclaw-host-git-workflow.",
				);
			}

			if (intent !== "send_to_git") {
				throw new Error(
					"host_git_workflow_action accepts only the canonical send_to_git intent or its supported aliases.",
				);
			}

			if (params.action === "plan" || params.action === "plan_with_branches") {
				const repoState = await collectRepoState(repoPath, requireNodeRunner());
				const planResult = buildPlanResult(repoState, {
					includeBranches: params.action === "plan_with_branches",
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
									repoResolution: repoTarget,
									nodeSelection,
									mode:
										params.action === "plan"
											? "plan-only"
											: "branch-aware-planning",
									intent,
									commandName: params.commandName,
									command: params.command,
									currentBranch: planResult.currentBranch,
									changedFiles: planResult.changedFiles,
									groups: planResult.groups,
									confirmedPlanCandidate: planResult.confirmedPlanCandidate,
									note:
										params.action === "plan_with_branches"
											? "This package slice supports branch-aware planning now, with repo resolution, node selection, host preflight, bounded branch entry, bounded push, bounded PR creation, bounded wait_for_checks, bounded merge_pr, and sync_main available as separate runtime actions."
											: "This package slice currently supports planning-only output without execution.",
								},
								null,
								2,
							),
						},
					],
				};
			}

			if (params.action === "enter_branch") {
				if (!params.branchName) {
					throw new Error("branchName is required for enter_branch action.");
				}

				const branchResult = await enterWorkingBranch(
					repoPath,
					params.branchName,
					requireNodeRunner(),
				);

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									ok: true,
									action: params.action,
									intent,
									repoResolution: repoTarget,
									nodeSelection,
									...branchResult,
									note: "Bounded branch entry can start from main, create or switch the requested local working branch, may carry uncommitted changes only for main -> new branch creation, and keeps later push/pr/merge actions on a non-main branch.",
								},
								null,
								2,
							),
						},
					],
				};
			}

			if (params.action === "push_branch") {
				const pushResult = await pushCurrentBranch(
					repoPath,
					requireNodeRunner(),
				);

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									ok: true,
									action: params.action,
									intent,
									repoResolution: repoTarget,
									nodeSelection,
									...pushResult,
									note: "Current branch push completed with bounded origin/current-branch behavior.",
								},
								null,
								2,
							),
						},
					],
				};
			}

			if (params.action === "create_pr") {
				const prResult = await createPullRequest(repoPath, requireNodeRunner());

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									ok: true,
									action: params.action,
									intent,
									repoResolution: repoTarget,
									nodeSelection,
									...prResult,
									note: "Pull request creation is bounded to the current branch into main and derives title/body from the latest commit.",
								},
								null,
								2,
							),
						},
					],
				};
			}

			if (params.action === "sync_main") {
				const syncResult = await syncMainBranch(repoPath, requireNodeRunner());

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									ok: true,
									action: params.action,
									intent,
									repoResolution: repoTarget,
									nodeSelection,
									...syncResult,
									note: "Local main sync is bounded to origin/main with a clean worktree check and fast-forward-only update behavior.",
								},
								null,
								2,
							),
						},
					],
				};
			}

			if (params.action === "wait_for_checks") {
				const checksResult = await waitForPullRequestChecks(
					repoPath,
					requireNodeRunner(),
				);

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									ok: true,
									action: params.action,
									intent,
									repoResolution: repoTarget,
									nodeSelection,
									...checksResult,
									note: "Required checks are watched only for the bounded current-branch pull request into main.",
								},
								null,
								2,
							),
						},
					],
				};
			}

			if (params.action === "merge_pr") {
				const mergeResult = await mergePullRequest(
					repoPath,
					requireNodeRunner(),
				);

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									ok: true,
									action: params.action,
									intent,
									repoResolution: repoTarget,
									nodeSelection,
									...mergeResult,
									note: "PR merge is bounded to the open current-branch pull request into main with HEAD SHA matching.",
								},
								null,
								2,
							),
						},
					],
				};
			}

			if (params.action === "preflight") {
				const preflight = await preflightHostOps(
					repoPath,
					{
						requireGhAuth: true,
						requireNonMainBranch: false,
					},
					requireNodeRunner(),
				);

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									ok: true,
									action: params.action,
									intent,
									repoResolution: repoTarget,
									nodeSelection,
									...preflight,
									note: "Host workflow preflight passed for repo access, git/gh availability, origin remote, current branch, and GitHub CLI auth.",
								},
								null,
								2,
							),
						},
					],
				};
			}

			if (params.action !== "validate_confirmed_plan") {
				throw new Error(`Unsupported action: ${params.action}`);
			}

			if (params.confirmedPlan === undefined) {
				throw new Error(
					"confirmedPlan is required for validate_confirmed_plan action.",
				);
			}

			const normalizedPlan = normalizeConfirmedPlanInput(params.confirmedPlan);
			const validatedPlan = validateConfirmedPlan(normalizedPlan, repoPath);

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(
							{
								ok: true,
								action: params.action,
								repoPath,
								repoResolution: repoTarget,
								nodeSelection,
								status: "validated",
								intent,
								confirmedPlan: validatedPlan,
								note: "Confirmed plan validation passed. Host-backed execution orchestration is not implemented in this package slice yet.",
							},
							null,
							2,
						),
					},
				],
			};
		},
	};
}
