import { describe, expect, it } from "vitest";
import { buildCommitPrepResult } from "../runtime/planning/commit-prep.js";

describe("buildCommitPrepResult", () => {
	it("returns an explicit commit-prep surface with current-state mapping", () => {
		const result = buildCommitPrepResult(
			{
				repoPath: "/Users/tester/openclaw-automation-tools",
				currentBranch: "main",
				headCommit: "abc123",
				changedFiles: [
					{ path: "README.md", status: "M" },
					{
						path: "openclaw-host-git-workflow/src/host-git-workflow-tool.ts",
						status: "M",
					},
				],
			},
			{
				repoResolution: {
					repoPath: "/Users/tester/openclaw-automation-tools",
					requestedRepoPath: "/Users/tester/openclaw-automation-tools",
					resolutionSource: "OPENCLAW_HOST_GIT_WORKFLOW_REPO",
					usedDefault: false,
				},
				nodeSelection: {
					requestedSelector: "host-node",
					normalizedSelector: "host-node",
					selectionSource: "pluginConfig.nodeSelector",
					selectionMode: "configured",
					usedDefault: false,
					runtimeBindingStatus: "bound",
					runtimeBindingTarget: {
						nodeId: "node-1",
						displayName: "host-node",
						platform: "darwin",
						connected: true,
						bindingSource: "selector",
						commandSurface: "node.invoke.system.run",
					},
					note: "Bound to host-node.",
				},
				sourceCommand: "send_to_git",
			},
		);

		expect(result.mode).toBe("commit-prep");
		expect(result.executionKernel).toContain("doctor");
		expect(result.executionKernel).toContain("commit_prep");
		expect(result.currentStateMatrix).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					phase: "setup_doctor",
					status: "productized",
				}),
				expect.objectContaining({
					phase: "docs_follow_up",
					status: "follow_up_session",
				}),
			]),
		);
		expect(
			result.currentStateMatrix.some(
				(entry) => entry.phase === "memory_follow_up",
			),
		).toBe(false);
		expect(result.currentTestedFlow).toContain("commit_prep");
		expect(result.recommendedSessionChoreography[0]).toMatchObject({
			order: 1,
			session: "setup_doctor",
			surface: "doctor",
		});
		expect(result.recommendedSessionChoreography[2]).toMatchObject({
			order: 3,
			session: "commit_prep",
			surface: "commit_prep",
		});
		expect(
			result.recommendedSessionChoreography.some(
				(step) => step.session === "memory_follow_up",
			),
		).toBe(false);
		expect(result.groups).toHaveLength(2);
		expect(result.confirmedPlanCandidate?.groups).toHaveLength(2);
	});
});
