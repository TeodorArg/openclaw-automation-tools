import { describe, expect, it } from "vitest";
import { buildPlanResult } from "./plan-groups.js";

describe("buildPlanResult", () => {
	it("creates repo-aware groups and a confirmed plan candidate for branch-aware planning", () => {
		const result = buildPlanResult(
			{
				repoPath: "/home/node/repos/openclaw-git-workflow",
				currentBranch: "main",
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

	it("returns no confirmed plan candidate for plain planning or clean repos", () => {
		const plainPlan = buildPlanResult(
			{
				repoPath: "/home/node/repos/openclaw-git-workflow",
				currentBranch: "main",
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
