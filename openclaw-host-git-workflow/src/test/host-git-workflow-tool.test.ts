import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRepoTargetMock = vi.fn();
const resolveHostNodeSelectionMock = vi.fn();
const createNodeHostCommandRunnerMock = vi.fn();
const collectRepoStateMock = vi.fn();
const buildPlanResultMock = vi.fn();
const validateConfirmedPlanMock = vi.fn();

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
	createPullRequest: vi.fn(),
	enterWorkingBranch: vi.fn(),
	mergePullRequest: vi.fn(),
	pushCurrentBranch: vi.fn(),
	syncMainBranch: vi.fn(),
	waitForPullRequestChecks: vi.fn(),
}));

vi.mock("../runtime/host/preflight.js", () => ({
	preflightHostOps: vi.fn(),
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
});
