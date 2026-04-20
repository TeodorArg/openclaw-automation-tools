import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRepoTargetMock = vi.fn();
const resolveHostNodeSelectionMock = vi.fn();
const createNodeHostCommandRunnerMock = vi.fn();
const collectRepoStateMock = vi.fn();
const buildPlanResultMock = vi.fn();
const validateConfirmedPlanMock = vi.fn();
const pushCurrentBranchMock = vi.fn();
const createPullRequestMock = vi.fn();
const preflightHostOpsMock = vi.fn();

vi.mock("../runtime/repo/repo-resolution.js", () => ({
	resolveRepoTarget: resolveRepoTargetMock,
}));

vi.mock("../runtime/node/selection.js", () => ({
	resolveHostNodeSelection: resolveHostNodeSelectionMock,
}));

vi.mock("../runtime/node/execution.js", () => ({
	assertBoundNodeSelection: vi.fn(),
	createNodeHostCommandRunner: createNodeHostCommandRunnerMock,
}));

vi.mock("../runtime/planning/intent-routing.js", () => ({
	resolveWorkflowIntent: vi.fn(() => "send_to_git"),
}));

vi.mock("../runtime/planning/plan-groups.js", () => ({
	collectRepoState: collectRepoStateMock,
	buildPlanResult: buildPlanResultMock,
}));

vi.mock("../runtime/planning/validate-confirmed-plan.js", () => ({
	validateConfirmedPlan: validateConfirmedPlanMock,
}));

vi.mock("../runtime/host/ops.js", () => ({
	createPullRequest: createPullRequestMock,
	enterWorkingBranch: vi.fn(),
	mergePullRequest: vi.fn(),
	pushCurrentBranch: pushCurrentBranchMock,
	syncMainBranch: vi.fn(),
	waitForPullRequestChecks: vi.fn(),
}));

vi.mock("../runtime/host/preflight.js", () => ({
	isHostWorkflowBlockerError: vi.fn(
		(error) => error?.name === "HostWorkflowBlockerError",
	),
	preflightHostOps: preflightHostOpsMock,
}));

const { createHostGitWorkflowTool } = await import(
	"../host-git-workflow-tool.js"
);

describe("createHostGitWorkflowTool", () => {
	beforeEach(() => {
		resolveRepoTargetMock.mockReset();
		resolveHostNodeSelectionMock.mockReset();
		createNodeHostCommandRunnerMock.mockReset();
		collectRepoStateMock.mockReset();
		buildPlanResultMock.mockReset();
		validateConfirmedPlanMock.mockReset();
		pushCurrentBranchMock.mockReset();
		createPullRequestMock.mockReset();
		preflightHostOpsMock.mockReset();

		resolveRepoTargetMock.mockReturnValue({
			repoPath: "/repo",
		});
		resolveHostNodeSelectionMock.mockResolvedValue({
			runtimeBindingStatus: "bound",
			runtimeBindingTarget: "node-1",
			commandSurface: "node.invoke.system.run",
		});
		createNodeHostCommandRunnerMock.mockReturnValue({
			run: vi.fn(),
		});
	});

	it("passes plugin config into repo resolution", async () => {
		const tool = createHostGitWorkflowTool({
			pluginConfig: {
				hostRepoPath: "/Users/tester/repo",
				nodeSelector: "host-a",
			},
		});

		collectRepoStateMock.mockResolvedValue({
			repoPath: "/repo",
			currentBranch: "feat/openclaw-host-git-workflow-runtime",
			headCommit: "abc123",
			changedFiles: [],
		});
		buildPlanResultMock.mockReturnValue({
			currentBranch: "feat/openclaw-host-git-workflow-runtime",
			changedFiles: [],
			groups: [],
			confirmedPlanCandidate: null,
		});

		await tool.execute("call-config", {
			action: "plan",
			command: "send_to_git",
			commandName: "send_to_git",
			skillName: "openclaw-host-git-workflow",
		});

		expect(resolveRepoTargetMock).toHaveBeenCalledWith(
			process.env,
			expect.objectContaining({
				hostRepoPath: "/Users/tester/repo",
				nodeSelector: "host-a",
			}),
		);
	});

	it("returns branch-aware planning output without stale planning-only wording", async () => {
		collectRepoStateMock.mockResolvedValue({
			repoPath: "/repo",
			currentBranch: "feat/openclaw-host-git-workflow-runtime",
			headCommit: "abc123",
			changedFiles: [],
		});
		buildPlanResultMock.mockReturnValue({
			currentBranch: "feat/openclaw-host-git-workflow-runtime",
			changedFiles: [],
			groups: [],
			confirmedPlanCandidate: null,
		});

		const tool = createHostGitWorkflowTool();
		const result = await tool.execute("call-1", {
			action: "plan_with_branches",
			command: "send_to_git",
			commandName: "send_to_git",
			skillName: "openclaw-host-git-workflow",
		});
		const payload = JSON.parse(result.content[0].text);

		expect(payload.ok).toBe(true);
		expect(payload.mode).toBe("branch-aware-planning");
		expect(payload.note).toContain("branch-aware planning output");
		expect(payload.note).toContain("separate bounded actions");
		expect(payload.note).not.toContain("planning-only");
	});

	it("returns confirmed-plan validation output without stale not-implemented wording", async () => {
		validateConfirmedPlanMock.mockReturnValue({
			status: "confirmed",
			repoPath: "/repo",
			sourceCommand: "send_to_git",
			version: 1,
			groups: [],
		});

		const tool = createHostGitWorkflowTool();
		const result = await tool.execute("call-2", {
			action: "validate_confirmed_plan",
			command: "send_to_git",
			commandName: "send_to_git",
			skillName: "openclaw-host-git-workflow",
			confirmedPlan: {
				version: 1,
				status: "confirmed",
				repoPath: "/repo",
				sourceCommand: "send_to_git",
				groups: [],
			},
		});
		const payload = JSON.parse(result.content[0].text);

		expect(payload.status).toBe("validated");
		expect(payload.note).toContain("bounded preflight");
		expect(payload.note).not.toContain("not implemented");
	});

	it("returns a consolidated completed result for execute_confirmed_plan", async () => {
		validateConfirmedPlanMock.mockReturnValue({
			version: 1,
			status: "confirmed",
			repoPath: "/repo",
			sourceCommand: "send_to_git",
			groups: [
				{
					id: "group-1",
					branch: "feat/openclaw-host-git-workflow-runtime",
					files: ["src/host-git-workflow-tool.ts"],
					commit: {
						title: "feat(openclaw-host-git-workflow): ship bounded flow",
						body: "intro\n- one\n- two\n- three\n- four",
					},
				},
			],
		});
		preflightHostOpsMock.mockResolvedValue({
			repoRoot: "/repo",
			currentBranch: "feat/openclaw-host-git-workflow-runtime",
			originUrl: "git@github.com:test/repo.git",
			remoteReadiness: {
				protocol: "ssh",
				existingPullRequest: null,
			},
		});
		pushCurrentBranchMock.mockResolvedValue({
			status: "pushed",
			remote: "origin",
			branch: "feat/openclaw-host-git-workflow-runtime",
			upstream: "origin/feat/openclaw-host-git-workflow-runtime",
			pushMode: "set_upstream_current_branch",
		});
		createPullRequestMock.mockResolvedValue({
			status: "pr_opened",
			baseBranch: "main",
			headBranch: "feat/openclaw-host-git-workflow-runtime",
			prNumber: 42,
			prUrl: "https://github.com/test/repo/pull/42",
			prLookup: {
				attempted: true,
				outcome: "no_existing_pr_found_then_created",
			},
		});

		const tool = createHostGitWorkflowTool();
		const result = await tool.execute("call-flow", {
			action: "execute_confirmed_plan",
			command: "send_to_git",
			commandName: "send_to_git",
			skillName: "openclaw-host-git-workflow",
			confirmedPlan: {
				version: 1,
				status: "confirmed",
				repoPath: "/repo",
				sourceCommand: "send_to_git",
				groups: [],
			},
		});
		const payload = JSON.parse(result.content[0].text);

		expect(payload).toMatchObject({
			ok: true,
			action: "execute_confirmed_plan",
			status: "completed",
			push: {
				status: "pushed",
				remote: "origin",
			},
			pullRequest: {
				status: "pr_opened",
				prNumber: 42,
			},
			nextStep: "wait_for_checks",
		});
	});

	it("returns a structured blocked result when node binding is unavailable", async () => {
		validateConfirmedPlanMock.mockReturnValue({
			version: 1,
			status: "confirmed",
			repoPath: "/repo",
			sourceCommand: "send_to_git",
			groups: [],
		});
		resolveHostNodeSelectionMock.mockResolvedValue({
			runtimeBindingStatus: "node_disconnected",
			runtimeBindingTarget: {
				nodeId: "node-1",
			},
			note: "node disconnected",
			blocker: {
				code: "node_disconnected",
				message: "node disconnected",
				remediation: ["restart node"],
			},
		});

		const tool = createHostGitWorkflowTool();
		const result = await tool.execute("call-blocked", {
			action: "execute_confirmed_plan",
			command: "send_to_git",
			commandName: "send_to_git",
			skillName: "openclaw-host-git-workflow",
			confirmedPlan: {
				version: 1,
				status: "confirmed",
				repoPath: "/repo",
				sourceCommand: "send_to_git",
				groups: [],
			},
		});
		const payload = JSON.parse(result.content[0].text);

		expect(payload).toMatchObject({
			ok: false,
			stage: "bind_node",
			blocker: {
				code: "node_disconnected",
			},
		});
	});
});
