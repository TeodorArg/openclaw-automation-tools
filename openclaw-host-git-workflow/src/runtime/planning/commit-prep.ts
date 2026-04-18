import type { HostNodeSelection } from "../node/selection.js";
import type { ResolvedRepoTarget } from "../repo/repo-resolution.js";
import {
	buildPlanResult,
	type PlanResult,
	type RepoState,
} from "./plan-groups.js";

type SurfaceStatus = "productized" | "follow_up_session";

export type SurfaceMatrixEntry = {
	phase: string;
	surface: string;
	status: SurfaceStatus;
	note: string;
};

export type SessionStep = {
	order: number;
	session: string;
	surface: string;
	note: string;
};

export type CommitPrepResult = PlanResult & {
	mode: "commit-prep";
	repoResolution: ResolvedRepoTarget;
	nodeSelection: HostNodeSelection;
	executionKernel: string[];
	currentStateMatrix: SurfaceMatrixEntry[];
	currentTestedFlow: string[];
	recommendedSessionChoreography: SessionStep[];
};

const EXECUTION_KERNEL = [
	"doctor",
	"plan",
	"plan_with_branches",
	"commit_prep",
	"validate_confirmed_plan",
	"enter_branch",
	"preflight",
	"push_branch",
	"create_pr",
	"wait_for_checks",
	"merge_pr",
	"sync_main",
] as const;

const CURRENT_STATE_MATRIX: SurfaceMatrixEntry[] = [
	{
		phase: "setup_doctor",
		surface: "host_git_workflow_action:doctor",
		status: "productized",
		note: "Lightweight readiness loop for repo resolution, host-node binding, git/gh availability, origin, and GitHub CLI auth.",
	},
	{
		phase: "planning",
		surface: "host_git_workflow_action:plan",
		status: "productized",
		note: "Repo-aware planning for the active bounded host git flow.",
	},
	{
		phase: "branch_aware_planning",
		surface: "host_git_workflow_action:plan_with_branches",
		status: "productized",
		note: "Branch-aware planning with package-aware branch and commit metadata.",
	},
	{
		phase: "commit_prep",
		surface: "host_git_workflow_action:commit_prep",
		status: "productized",
		note: "Ownership grouping, commit-body suggestion, current-state matrix, and tested flow sequence for short bounded sessions.",
	},
	{
		phase: "confirmed_plan_validation",
		surface: "host_git_workflow_action:validate_confirmed_plan",
		status: "productized",
		note: "Typed contract validation before execution continues.",
	},
	{
		phase: "branch_entry",
		surface: "host_git_workflow_action:enter_branch",
		status: "productized",
		note: "Bounded entry into a validated non-main local branch.",
	},
	{
		phase: "host_preflight",
		surface: "host_git_workflow_action:preflight",
		status: "productized",
		note: "Execution-time host repo, binary, origin, branch, and GitHub auth verification.",
	},
	{
		phase: "push_pr_merge_sync",
		surface:
			"host_git_workflow_action:{push_branch,create_pr,wait_for_checks,merge_pr,sync_main}",
		status: "productized",
		note: "Bounded host-backed execution kernel for push, PR, checks, merge, and local main sync.",
	},
	{
		phase: "docs_follow_up",
		surface: "separate repo-docs-sync or package-docs session",
		status: "follow_up_session",
		note: "Docs sync remains intentionally separate so execution stays reviewable and bounded.",
	},
	{
		phase: "memory_follow_up",
		surface: "separate memory-sync session",
		status: "follow_up_session",
		note: "Memory sync mirrors accepted canon after owner docs and code are already settled.",
	},
];

const CURRENT_TESTED_FLOW = [
	"plan",
	"plan_with_branches",
	"commit_prep",
	"validate_confirmed_plan",
	"enter_branch",
	"preflight",
	"push_branch",
	"create_pr",
	"wait_for_checks",
	"merge_pr",
	"sync_main",
] as const;

const RECOMMENDED_SESSION_CHOREOGRAPHY: SessionStep[] = [
	{
		order: 1,
		session: "setup_doctor",
		surface: "doctor",
		note: "Confirm repo target, host node, git, gh, and origin readiness before planning.",
	},
	{
		order: 2,
		session: "planning",
		surface: "plan_with_branches",
		note: "Read the current diff and generate branch-aware planning output.",
	},
	{
		order: 3,
		session: "commit_prep",
		surface: "commit_prep",
		note: "Split the diff by ownership lane and lock the commit contract for the next bounded execution slice.",
	},
	{
		order: 4,
		session: "execution",
		surface:
			"validate_confirmed_plan -> enter_branch -> preflight -> push_branch -> create_pr -> wait_for_checks -> merge_pr -> sync_main",
		note: "Run the host-backed execution kernel as short bounded actions instead of one giant session.",
	},
	{
		order: 5,
		session: "docs_follow_up",
		surface: "separate docs session",
		note: "Sync package or repo docs only if the merged slice changed shipped truth.",
	},
	{
		order: 6,
		session: "memory_follow_up",
		surface: "separate memory sync session",
		note: "Mirror the accepted state into memory only after docs and code are already final.",
	},
];

export function buildCommitPrepResult(
	repoState: RepoState,
	params: {
		repoResolution: ResolvedRepoTarget;
		nodeSelection: HostNodeSelection;
		sourceCommand: string;
	},
): CommitPrepResult {
	const planResult = buildPlanResult(repoState, {
		includeBranches: true,
		sourceCommand: params.sourceCommand,
	});

	return {
		...planResult,
		mode: "commit-prep",
		repoResolution: params.repoResolution,
		nodeSelection: params.nodeSelection,
		executionKernel: [...EXECUTION_KERNEL],
		currentStateMatrix: [...CURRENT_STATE_MATRIX],
		currentTestedFlow: [...CURRENT_TESTED_FLOW],
		recommendedSessionChoreography: RECOMMENDED_SESSION_CHOREOGRAPHY.map(
			(step) => ({ ...step }),
		),
	};
}
