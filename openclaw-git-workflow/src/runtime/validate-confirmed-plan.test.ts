import { describe, expect, it } from "vitest";
import { validateConfirmedPlan } from "./validate-confirmed-plan.js";

const repoPath = "/home/node/repos/openclaw-git-workflow";

function makePlan() {
	return {
		version: 1 as const,
		repoPath,
		status: "confirmed" as const,
		sourceCommand: "send_to_git",
		groups: [
			{
				id: "group-1",
				branch: "feat/workflow-repo-aware-planning",
				files: ["openclaw-git-workflow/src/git-workflow-tool.ts"],
				commit: {
					title: "feat(workflow): add repo-aware planning output",
					body: [
						"Add deterministic repo-aware planning output to the workflow runtime.",
						"- Inspect git status and classify changed files by repo area.",
						"- Generate stable groups, commit metadata, and branch suggestions.",
						"- Cover the changed runtime files: openclaw-git-workflow/src/git-workflow-tool.ts.",
						"- Keep execute bounded to branch plus commit, with no push.",
					].join("\n"),
				},
			},
		],
	};
}

describe("validateConfirmedPlan", () => {
	it("accepts a valid confirmed plan", () => {
		expect(validateConfirmedPlan(makePlan(), repoPath)).toMatchObject({
			status: "confirmed",
			groups: [{ id: "group-1" }],
		});
	});

	it("rejects duplicate group ids, branches, and files", () => {
		const duplicateGroupId = makePlan();
		duplicateGroupId.groups.push({
			...duplicateGroupId.groups[0],
			branch: "feat/workflow-refine-planning-and-execute",
		});
		expect(() => validateConfirmedPlan(duplicateGroupId, repoPath)).toThrow(
			"confirmedPlan.groups[1].id must be unique.",
		);

		const duplicateBranch = makePlan();
		duplicateBranch.groups.push({
			...duplicateBranch.groups[0],
			id: "group-2",
		});
		expect(() => validateConfirmedPlan(duplicateBranch, repoPath)).toThrow(
			"confirmedPlan.groups[1].branch must be unique.",
		);

		const duplicateFiles = makePlan();
		duplicateFiles.groups[0] = {
			...duplicateFiles.groups[0],
			files: [
				"openclaw-git-workflow/src/git-workflow-tool.ts",
				"openclaw-git-workflow/src/git-workflow-tool.ts",
			],
		};
		expect(() => validateConfirmedPlan(duplicateFiles, repoPath)).toThrow(
			"confirmedPlan.groups[0].files must not contain duplicates.",
		);
	});
});
