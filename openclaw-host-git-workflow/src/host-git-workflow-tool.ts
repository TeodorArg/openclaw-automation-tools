import { Type } from "@sinclair/typebox";
import { runHostWorkflowDoctor } from "./runtime/host/doctor.js";
import {
	createPullRequest,
	enterWorkingBranch,
	mergePullRequest,
	pushCurrentBranch,
	syncMainBranch,
	waitForPullRequestChecks,
} from "./runtime/host/ops.js";
import {
	type HostPreflight,
	isHostWorkflowBlockerError,
	preflightHostOps,
} from "./runtime/host/preflight.js";
import {
	assertBoundNodeSelection,
	createNodeHostCommandRunner,
} from "./runtime/node/execution.js";
import { resolveHostNodeSelection } from "./runtime/node/selection.js";
import { buildCommitPrepResult } from "./runtime/planning/commit-prep.js";
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
			Type.Literal("doctor"),
			Type.Literal("plan"),
			Type.Literal("plan_with_branches"),
			Type.Literal("commit_prep"),
			Type.Literal("validate_confirmed_plan"),
			Type.Literal("execute_confirmed_plan"),
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
		| "doctor"
		| "plan"
		| "plan_with_branches"
		| "commit_prep"
		| "validate_confirmed_plan"
		| "execute_confirmed_plan"
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
		hostRepoPath?: unknown;
		pathMappings?: unknown;
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
	function jsonResult(payload: unknown) {
		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify(payload, null, 2),
				},
			],
		};
	}

	return {
		name: "host_git_workflow_action",
		description:
			"Bounded host git workflow for setup doctor, repo-aware planning, branch-aware planning, commit prep, repo resolution, node selection, host preflight, branch entry, confirmed-plan validation, push, PR creation, wait-for-checks, merge, and sync-main.",
		parameters: ToolSchema,
		async execute(_toolCallId: string, params: ToolParams) {
			const repoTarget = resolveRepoTarget(process.env, options.pluginConfig);
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

			if (params.action === "execute_confirmed_plan") {
				if (params.confirmedPlan === undefined) {
					throw new Error(
						"confirmedPlan is required for execute_confirmed_plan action.",
					);
				}

				const normalizedPlan = normalizeConfirmedPlanInput(
					params.confirmedPlan,
				);
				const validatedPlan = validateConfirmedPlan(normalizedPlan, repoPath);

				if (nodeSelection.runtimeBindingStatus !== "bound") {
					return jsonResult({
						ok: false,
						action: params.action,
						intent,
						status: "blocked",
						stage: "bind_node",
						repoResolution: repoTarget,
						nodeSelection,
						confirmedPlan: validatedPlan,
						blocker:
							nodeSelection.blocker ??
							({
								code: nodeSelection.runtimeBindingStatus,
								message: nodeSelection.note,
								remediation: [],
							} as const),
					});
				}

				const runner = requireNodeRunner();

				let preflight: HostPreflight;
				try {
					preflight = await preflightHostOps(
						repoPath,
						{
							requireGhAuth: true,
							requireNonMainBranch: true,
							requireRemotePushReadiness: true,
						},
						runner,
					);
				} catch (error) {
					if (!isHostWorkflowBlockerError(error)) {
						throw error;
					}
					return jsonResult({
						ok: false,
						action: params.action,
						intent,
						status: "blocked",
						stage: "preflight",
						repoResolution: repoTarget,
						nodeSelection,
						confirmedPlan: validatedPlan,
						blocker: error.blocker,
					});
				}

				const executionGroup =
					validatedPlan.groups.find(
						(group) => group.branch === preflight.currentBranch,
					) ?? null;
				if (!executionGroup) {
					return jsonResult({
						ok: false,
						action: params.action,
						intent,
						status: "blocked",
						stage: "confirmed_plan",
						repoResolution: repoTarget,
						nodeSelection,
						confirmedPlan: validatedPlan,
						preflight,
						blocker: {
							code: "plan_branch_mismatch",
							message:
								"Validated confirmed plan does not contain the current non-main branch, so bounded execution cannot continue.",
							remediation: validatedPlan.groups.map(
								(group) => `git checkout ${group.branch}`,
							),
						},
					});
				}

				const pushResult = await pushCurrentBranch(repoPath, runner);
				const prResult = await createPullRequest(repoPath, runner);

				return jsonResult({
					ok: true,
					action: params.action,
					intent,
					status: "completed",
					repoResolution: repoTarget,
					nodeSelection,
					confirmedPlan: validatedPlan,
					executionGroup,
					preflight: {
						repoRoot: preflight.repoRoot,
						currentBranch: preflight.currentBranch,
						originUrl: preflight.originUrl,
						remoteReadiness: preflight.remoteReadiness,
					},
					push: {
						status: pushResult.status,
						remote: pushResult.remote,
						branch: pushResult.branch,
						upstream: pushResult.upstream,
						pushMode: pushResult.pushMode,
					},
					pullRequest: {
						status: prResult.status,
						baseBranch: prResult.baseBranch,
						headBranch: prResult.headBranch,
						prNumber: prResult.prNumber,
						prUrl: prResult.prUrl,
						prLookup: prResult.prLookup,
					},
					nextStep: "wait_for_checks",
					note: "Confirmed-plan execution completed through bounded host push and PR create/reuse.",
				});
			}

			if (params.action === "doctor") {
				const doctor = await runHostWorkflowDoctor({
					repoResolution: repoTarget,
					nodeSelection,
					runner: nodeRunner,
				});

				return jsonResult({
					ok: true,
					action: params.action,
					intent,
					...doctor,
					note: "Doctor is a lightweight setup/readiness surface. It keeps repo targeting, host-node binding, git/gh checks, and origin readiness explicit before the bounded execution kernel starts.",
				});
			}

			if (params.action === "plan" || params.action === "plan_with_branches") {
				const repoState = await collectRepoState(repoPath, requireNodeRunner());
				const planResult = buildPlanResult(repoState, {
					includeBranches: params.action === "plan_with_branches",
					sourceCommand: intent,
				});

				return jsonResult({
					ok: true,
					action: params.action,
					repoPath,
					repoResolution: repoTarget,
					nodeSelection,
					mode:
						params.action === "plan" ? "plan-only" : "branch-aware-planning",
					intent,
					commandName: params.commandName,
					command: params.command,
					currentBranch: planResult.currentBranch,
					changedFiles: planResult.changedFiles,
					groups: planResult.groups,
					confirmedPlanCandidate: planResult.confirmedPlanCandidate,
					note:
						params.action === "plan_with_branches"
							? "This action returns branch-aware planning output with package-aware branch and commit metadata; separate bounded actions in the same package handle confirmed-plan validation, confirmed-plan execution, preflight, branch entry, push, PR creation, required-check waiting, merge, and local main sync."
							: "This action returns repo-aware planning output; separate bounded actions in the same package handle confirmed-plan validation, confirmed-plan execution, preflight, branch entry, push, PR creation, required-check waiting, merge, and local main sync.",
				});
			}

			if (params.action === "commit_prep") {
				const repoState = await collectRepoState(repoPath, requireNodeRunner());
				const commitPrep = buildCommitPrepResult(repoState, {
					repoResolution: repoTarget,
					nodeSelection,
					sourceCommand: intent,
				});

				return jsonResult({
					ok: true,
					action: params.action,
					intent,
					...commitPrep,
					note: "Commit prep is an explicit bounded surface for ownership grouping, branch and commit metadata, current-state mapping, and recommended small-session choreography.",
				});
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

				return jsonResult({
					ok: true,
					action: params.action,
					intent,
					repoResolution: repoTarget,
					nodeSelection,
					...branchResult,
					note: "Bounded branch entry can start from main, create or switch the requested local working branch, may carry uncommitted changes only for main -> new branch creation, and keeps later push/pr/merge actions on a non-main branch.",
				});
			}

			if (params.action === "push_branch") {
				await preflightHostOps(
					repoPath,
					{
						requireGhAuth: true,
						requireNonMainBranch: true,
						requireRemotePushReadiness: true,
					},
					requireNodeRunner(),
				);
				const pushResult = await pushCurrentBranch(
					repoPath,
					requireNodeRunner(),
				);

				return jsonResult({
					ok: true,
					action: params.action,
					intent,
					repoResolution: repoTarget,
					nodeSelection,
					...pushResult,
					note: "Current branch push completed with bounded origin/current-branch behavior.",
				});
			}

			if (params.action === "create_pr") {
				await preflightHostOps(
					repoPath,
					{
						requireGhAuth: true,
						requireNonMainBranch: true,
						requireRemotePushReadiness: true,
					},
					requireNodeRunner(),
				);
				const prResult = await createPullRequest(repoPath, requireNodeRunner());

				return jsonResult({
					ok: true,
					action: params.action,
					intent,
					repoResolution: repoTarget,
					nodeSelection,
					...prResult,
					note: "Pull request creation is bounded to the current branch into main and derives title/body from the latest commit.",
				});
			}

			if (params.action === "sync_main") {
				const syncResult = await syncMainBranch(repoPath, requireNodeRunner());

				return jsonResult({
					ok: true,
					action: params.action,
					intent,
					repoResolution: repoTarget,
					nodeSelection,
					...syncResult,
					note: "Local main sync is bounded to origin/main with a clean worktree check and fast-forward-only update behavior.",
				});
			}

			if (params.action === "wait_for_checks") {
				const checksResult = await waitForPullRequestChecks(
					repoPath,
					requireNodeRunner(),
				);

				return jsonResult({
					ok: true,
					action: params.action,
					intent,
					repoResolution: repoTarget,
					nodeSelection,
					...checksResult,
					note: "Required checks are watched only for the bounded current-branch pull request into main.",
				});
			}

			if (params.action === "merge_pr") {
				const mergeResult = await mergePullRequest(
					repoPath,
					requireNodeRunner(),
				);

				return jsonResult({
					ok: true,
					action: params.action,
					intent,
					repoResolution: repoTarget,
					nodeSelection,
					...mergeResult,
					note: "PR merge is bounded to the open current-branch pull request into main with HEAD SHA matching.",
				});
			}

			if (params.action === "preflight") {
				const preflight = await preflightHostOps(
					repoPath,
					{
						requireGhAuth: true,
						requireNonMainBranch: false,
						requireRemotePushReadiness: true,
					},
					requireNodeRunner(),
				);

				return jsonResult({
					ok: true,
					action: params.action,
					intent,
					repoResolution: repoTarget,
					nodeSelection,
					...preflight,
					note: "Host workflow preflight passed for repo access, git/gh availability, origin remote, current branch, GitHub CLI auth, and remote push/PR readiness.",
				});
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

			return jsonResult({
				ok: true,
				action: params.action,
				repoPath,
				repoResolution: repoTarget,
				nodeSelection,
				status: "validated",
				intent,
				confirmedPlan: validatedPlan,
				note: "Confirmed plan validation passed. The validated plan can now drive the package's confirmed-plan execution action plus the separate bounded preflight, branch-entry, push, PR, checks, merge, and local main sync actions.",
			});
		},
	};
}
