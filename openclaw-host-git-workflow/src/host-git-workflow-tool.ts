import { Type } from "@sinclair/typebox";
import { createPullRequest, pushCurrentBranch } from "./runtime/host-ops.js";
import { resolveWorkflowIntent } from "./runtime/intent-routing.js";
import { resolveHostNodeSelection } from "./runtime/node-selection.js";
import { buildPlanResult, collectRepoState } from "./runtime/plan-groups.js";
import { preflightHostOps } from "./runtime/preflight.js";
import { resolveRepoTarget } from "./runtime/repo-resolution.js";
import { validateConfirmedPlan } from "./runtime/validate-confirmed-plan.js";

const ToolSchema = Type.Object(
	{
		action: Type.Union([
			Type.Literal("plan"),
			Type.Literal("plan_with_branches"),
			Type.Literal("validate_confirmed_plan"),
			Type.Literal("preflight"),
			Type.Literal("push_branch"),
			Type.Literal("create_pr"),
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
		| "plan"
		| "plan_with_branches"
		| "validate_confirmed_plan"
		| "preflight"
		| "push_branch"
		| "create_pr";
	command: string;
	commandName: string;
	skillName: string;
	confirmedPlan?: unknown;
};

type HostGitWorkflowToolOptions = {
	pluginConfig?: {
		nodeSelector?: unknown;
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
			"Bounded host git workflow scaffold for planning, repo resolution, node selection, host preflight, confirmed-plan validation, push, and PR creation.",
		parameters: ToolSchema,
		async execute(_toolCallId: string, params: ToolParams) {
			const repoTarget = resolveRepoTarget();
			const nodeSelection = resolveHostNodeSelection({
				pluginConfig: options.pluginConfig,
			});
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
				const repoState = await collectRepoState(repoPath);
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
											? "This package slice supports branch-aware planning now, with repo resolution, node selection, host preflight, bounded push, and bounded PR creation available as separate runtime actions or contracts. sync-main, wait_for_checks, and merge_pr land in later runtime slices."
											: "This package slice currently supports planning-only output without execution.",
								},
								null,
								2,
							),
						},
					],
				};
			}

			if (params.action === "push_branch") {
				const pushResult = await pushCurrentBranch(repoPath);

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
				const prResult = await createPullRequest(repoPath);

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

			if (params.action === "preflight") {
				const preflight = await preflightHostOps(repoPath, {
					requireGhAuth: true,
					requireNonMainBranch: false,
				});

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
