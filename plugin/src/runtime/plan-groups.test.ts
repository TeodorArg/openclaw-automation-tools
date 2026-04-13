import { describe, expect, it } from "vitest";
import { buildPlanResult } from "./plan-groups.js";

describe("buildPlanResult", () => {
	it("creates repo-aware groups and a confirmed plan candidate for branch-aware planning", () => {
		const result = buildPlanResult(
			{
				repoPath: "/home/node/repos/openclaw-git-workflow",
				currentBranch: "main",
				headCommit: "abc123",
				changedFiles: [
					{ path: "docs/SKILL_SPEC.md", status: "M" },
					{ path: "plugin/src/git-workflow-tool.ts", status: "M" },
					{ path: "scripts/git-create-commit.sh", status: "M" },
				],
			},
			{
				includeBranches: true,
				sourceCommand: "разложи по git-группам с ветками",
			},
		);

		expect(result.changedFiles).toHaveLength(3);
		expect(result.groups).toHaveLength(2);
		expect(result.groups[0]).toMatchObject({
			id: "group-1",
			area: "docs",
			branch: "docs/update-workflow-docs",
			commit: {
				title: "docs(workflow): update planning and usage docs",
			},
		});
		expect(result.groups[1]).toMatchObject({
			id: "group-2",
			area: "runtime",
			branch: "feat/workflow-refine-planning-and-execute",
			commit: {
				title: "feat(workflow): refine planning and bounded execute",
			},
		});
		expect(result.confirmedPlanCandidate).toMatchObject({
			version: 1,
			status: "confirmed",
			repoPath: "/home/node/repos/openclaw-git-workflow",
			sourceCommand: "разложи по git-группам с ветками",
		});
		expect(result.confirmedPlanCandidate?.groups).toHaveLength(2);
	});

	it("splits runtime changes into planning and execute groups when both are obvious", () => {
		const result = buildPlanResult(
			{
				repoPath: "/home/node/repos/openclaw-git-workflow",
				currentBranch: "main",
				headCommit: "abc123",
				changedFiles: [
					{ path: "plugin/src/runtime/plan-groups.ts", status: "M" },
					{ path: "plugin/src/runtime/plan-groups.test.ts", status: "M" },
					{ path: "scripts/git-create-commit.sh", status: "M" },
				],
			},
			{
				includeBranches: true,
				sourceCommand: "разложи по git-группам с ветками",
			},
		);

		expect(result.groups).toHaveLength(2);
		expect(result.groups[0]).toMatchObject({
			id: "group-1",
			area: "runtime",
			label: "Runtime planning logic",
			branch: "feat/workflow-refine-planning",
			files: [
				"plugin/src/runtime/plan-groups.test.ts",
				"plugin/src/runtime/plan-groups.ts",
			],
			commit: {
				title: "feat(workflow): refine repo-aware planning",
			},
		});
		expect(result.groups[1]).toMatchObject({
			id: "group-2",
			area: "runtime",
			label: "Plugin and bounded execute runtime",
			branch: "feat/workflow-refine-planning-and-execute",
			files: ["scripts/git-create-commit.sh"],
			commit: {
				title: "feat(workflow): refine planning and bounded execute",
			},
		});
		expect(result.confirmedPlanCandidate?.groups).toHaveLength(2);
	});

	it("creates a dedicated install group for package-shape-only runtime changes", () => {
		const result = buildPlanResult(
			{
				repoPath: "/home/node/repos/openclaw-git-workflow",
				currentBranch: "main",
				headCommit: "abc123",
				changedFiles: [
					{ path: "plugin/openclaw.plugin.json", status: "M" },
					{ path: "plugin/package.json", status: "M" },
				],
			},
			{
				includeBranches: true,
				sourceCommand: "разложи по git-группам с ветками",
			},
		);

		expect(result.groups).toHaveLength(1);
		expect(result.groups[0]).toMatchObject({
			area: "runtime",
			label: "Plugin install and package shape",
			branch: "fix/plugin-install-shape",
			commit: {
				title: "fix(plugin): refine install and package shape",
			},
		});
	});

	it("falls back to a single runtime group when runtime changes are mixed", () => {
		const result = buildPlanResult(
			{
				repoPath: "/home/node/repos/openclaw-git-workflow",
				currentBranch: "main",
				headCommit: "abc123",
				changedFiles: [
					{ path: "plugin/src/runtime/plan-groups.ts", status: "M" },
					{ path: "plugin/src/index.ts", status: "M" },
				],
			},
			{
				includeBranches: true,
				sourceCommand: "разложи по git-группам с ветками",
			},
		);

		expect(result.groups).toHaveLength(1);
		expect(result.groups[0]).toMatchObject({
			area: "runtime",
			label: "Plugin and bounded runtime",
			branch: "feat/workflow-repo-aware-planning",
			commit: {
				title: "feat(workflow): add repo-aware planning output",
			},
		});
	});

	it("returns no confirmed plan candidate for plain planning or clean repos", () => {
		const plainPlan = buildPlanResult(
			{
				repoPath: "/home/node/repos/openclaw-git-workflow",
				currentBranch: "main",
				headCommit: "abc123",
				changedFiles: [
					{ path: "skills/openclaw-git-workflow/SKILL.md", status: "M" },
				],
			},
			{
				includeBranches: false,
				sourceCommand: "разложи по git-группам",
			},
		);
		expect(plainPlan.groups).toHaveLength(1);
		expect(plainPlan.confirmedPlanCandidate).toBeNull();

		const cleanPlan = buildPlanResult(
			{
				repoPath: "/home/node/repos/openclaw-git-workflow",
				currentBranch: "main",
				headCommit: "abc123",
				changedFiles: [],
			},
			{
				includeBranches: true,
				sourceCommand: "разложи по git-группам с ветками",
			},
		);
		expect(cleanPlan.groups).toHaveLength(0);
		expect(cleanPlan.confirmedPlanCandidate).toBeNull();
	});
});
