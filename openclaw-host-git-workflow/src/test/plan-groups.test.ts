import { describe, expect, it } from "vitest";
import { buildPlanResult } from "../runtime/planning/plan-groups.js";

describe("buildPlanResult", () => {
	it("creates repo-aware groups and a confirmed plan candidate for branch-aware planning", () => {
		const result = buildPlanResult(
			{
				repoPath: "/home/node/repos/openclaw-host-git-workflow",
				currentBranch: "main",
				headCommit: "abc123",
				changedFiles: [
					{ path: "README.md", status: "M" },
					{
						path: "openclaw-host-git-workflow/src/host-git-workflow-tool.ts",
						status: "M",
					},
					{
						path: "openclaw-host-git-workflow/src/runtime/planning/validate-confirmed-plan.ts",
						status: "M",
					},
				],
			},
			{
				includeBranches: true,
				sourceCommand: "send_to_git",
			},
		);

		expect(result.changedFiles).toHaveLength(3);
		expect(result.groups).toHaveLength(2);
		expect(result.groups[0]).toMatchObject({
			id: "group-1",
			area: "docs",
			branch: "docs/update-host-workflow-docs",
			commit: {
				title: "docs(workflow): update host workflow docs",
			},
		});
		expect(result.groups[1]).toMatchObject({
			id: "group-2",
			area: "runtime",
			branch: "feat/host-workflow-confirmed-plan-runtime",
			commit: {
				title: "feat(workflow): add confirmed-plan runtime slice",
			},
		});
		expect(result.confirmedPlanCandidate).toMatchObject({
			version: 1,
			status: "confirmed",
			repoPath: "/home/node/repos/openclaw-host-git-workflow",
			sourceCommand: "send_to_git",
		});
		expect(result.confirmedPlanCandidate?.groups).toHaveLength(2);
	});

	it("splits runtime changes into planning and execute groups when both are obvious", () => {
		const result = buildPlanResult(
			{
				repoPath: "/home/node/repos/openclaw-host-git-workflow",
				currentBranch: "main",
				headCommit: "abc123",
				changedFiles: [
					{
						path: "openclaw-host-git-workflow/src/runtime/planning/plan-groups.ts",
						status: "M",
					},
					{
						path: "openclaw-host-git-workflow/src/test/plan-groups.test.ts",
						status: "M",
					},
					{
						path: "openclaw-host-git-workflow/src/host-git-workflow-tool.ts",
						status: "M",
					},
				],
			},
			{
				includeBranches: true,
				sourceCommand: "send_to_git",
			},
		);

		expect(result.groups).toHaveLength(2);
		expect(result.groups[0]).toMatchObject({
			id: "group-1",
			area: "runtime",
			label: "Runtime planning logic",
			branch: "feat/host-workflow-refine-planning",
			files: [
				"openclaw-host-git-workflow/src/runtime/planning/plan-groups.ts",
				"openclaw-host-git-workflow/src/test/plan-groups.test.ts",
			],
			commit: {
				title: "feat(workflow): refine host repo-aware planning",
			},
		});
		expect(result.groups[1]).toMatchObject({
			id: "group-2",
			area: "runtime",
			label: "Plugin and confirmed-plan runtime",
			branch: "feat/host-workflow-confirmed-plan-runtime",
			files: ["openclaw-host-git-workflow/src/host-git-workflow-tool.ts"],
			commit: {
				title: "feat(workflow): add confirmed-plan runtime slice",
			},
		});
		expect(result.confirmedPlanCandidate?.groups).toHaveLength(2);
	});

	it("creates a dedicated install group for package-shape-only runtime changes", () => {
		const result = buildPlanResult(
			{
				repoPath: "/home/node/repos/openclaw-host-git-workflow",
				currentBranch: "main",
				headCommit: "abc123",
				changedFiles: [
					{
						path: "openclaw-host-git-workflow/openclaw.plugin.json",
						status: "M",
					},
					{
						path: "openclaw-host-git-workflow/package.json",
						status: "M",
					},
				],
			},
			{
				includeBranches: true,
				sourceCommand: "send_to_git",
			},
		);

		expect(result.groups).toHaveLength(1);
		expect(result.groups[0]).toMatchObject({
			area: "runtime",
			label: "Plugin install and package shape",
			branch: "fix/host-plugin-install-shape",
			commit: {
				title: "fix(plugin): refine host workflow package shape",
			},
		});
	});

	it("falls back to a single runtime group when runtime changes are mixed", () => {
		const result = buildPlanResult(
			{
				repoPath: "/home/node/repos/openclaw-host-git-workflow",
				currentBranch: "main",
				headCommit: "abc123",
				changedFiles: [
					{
						path: "openclaw-host-git-workflow/src/runtime/planning/plan-groups.ts",
						status: "M",
					},
					{ path: "openclaw-host-git-workflow/src/index.ts", status: "M" },
				],
			},
			{
				includeBranches: true,
				sourceCommand: "send_to_git",
			},
		);

		expect(result.groups).toHaveLength(1);
		expect(result.groups[0]).toMatchObject({
			area: "runtime",
			label: "Plugin and bounded runtime",
			branch: "feat/host-workflow-repo-aware-planning",
			commit: {
				title: "feat(workflow): add host repo-aware planning output",
			},
		});
	});

	it("returns no confirmed plan candidate for plain planning or clean repos", () => {
		const plainPlan = buildPlanResult(
			{
				repoPath: "/home/node/repos/openclaw-host-git-workflow",
				currentBranch: "main",
				headCommit: "abc123",
				changedFiles: [
					{
						path: "openclaw-host-git-workflow/skills/openclaw-host-git-workflow/SKILL.md",
						status: "M",
					},
				],
			},
			{
				includeBranches: false,
				sourceCommand: "send_to_git",
			},
		);
		expect(plainPlan.groups).toHaveLength(1);
		expect(plainPlan.confirmedPlanCandidate).toBeNull();

		const cleanPlan = buildPlanResult(
			{
				repoPath: "/home/node/repos/openclaw-host-git-workflow",
				currentBranch: "main",
				headCommit: "abc123",
				changedFiles: [],
			},
			{
				includeBranches: true,
				sourceCommand: "send_to_git",
			},
		);
		expect(cleanPlan.groups).toHaveLength(0);
		expect(cleanPlan.confirmedPlanCandidate).toBeNull();
	});

	it("classifies bundled package skill changes into the skills area", () => {
		const result = buildPlanResult(
			{
				repoPath: "/home/node/repos/openclaw-host-git-workflow",
				currentBranch: "main",
				headCommit: "abc123",
				changedFiles: [
					{
						path: "openclaw-host-git-workflow/skills/openclaw-host-git-workflow/SKILL.md",
						status: "M",
					},
				],
			},
			{
				includeBranches: true,
				sourceCommand: "send_to_git",
			},
		);

		expect(result.changedFiles).toEqual([
			{
				path: "openclaw-host-git-workflow/skills/openclaw-host-git-workflow/SKILL.md",
				status: "M",
				area: "skills",
			},
		]);
		expect(result.groups).toHaveLength(1);
		expect(result.groups[0]).toMatchObject({
			area: "skills",
			label: "Skill UX and command contract",
			branch: "feat/skills-refine-host-workflow",
			files: [
				"openclaw-host-git-workflow/skills/openclaw-host-git-workflow/SKILL.md",
			],
			commit: {
				title: "feat(skills): refine host git workflow contract",
			},
		});
		expect(result.confirmedPlanCandidate?.groups).toHaveLength(1);
	});
});
