import { describe, expect, it } from "vitest";
import { validateConfirmedPlan } from "./validate-confirmed-plan.js";

const repoPath = "/home/node/repos/openclaw-host-git-workflow";

function makePlan() {
	return {
		version: 1 as const,
		repoPath,
		status: "confirmed" as const,
		sourceCommand: "send_to_git",
		groups: [
			{
				id: "group-1",
				branch: "feat/host-workflow-repo-aware-planning",
				files: ["openclaw-host-git-workflow/src/host-git-workflow-tool.ts"],
				commit: {
					title: "feat(workflow): add host repo-aware planning output",
					body: [
						"Add deterministic repo-aware planning output to the host workflow runtime.",
						"- Inspect git status and classify changed files by repo area.",
						"- Generate stable groups, commit metadata, and branch suggestions.",
						"- Cover the changed runtime files: openclaw-host-git-workflow/src/host-git-workflow-tool.ts.",
						"- Keep execution limited to shipped validation-only behavior in this slice.",
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
			branch: "feat/host-workflow-confirmed-plan-runtime",
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
				"openclaw-host-git-workflow/src/host-git-workflow-tool.ts",
				"openclaw-host-git-workflow/src/host-git-workflow-tool.ts",
			],
		};
		expect(() => validateConfirmedPlan(duplicateFiles, repoPath)).toThrow(
			"confirmedPlan.groups[0].files must not contain duplicates.",
		);
	});
});
