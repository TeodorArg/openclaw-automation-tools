import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	DEFAULT_REPO_PATH,
	resolveRepoTarget,
} from "../runtime/repo/repo-resolution.js";

describe("repo resolution", () => {
	it("prefers plugin config hostRepoPath over environment-derived paths", () => {
		const result = resolveRepoTarget(
			{
				OPENCLAW_HOST_GIT_WORKFLOW_REPO: "/home/node/project/repo-a",
				OPENCLAW_PROJECT_DIR: "/tmp/fallback",
			},
			{
				hostRepoPath: " /Users/tester/src/openclaw-automation-tools ",
			},
		);

		expect(result).toMatchObject({
			repoPath: path.resolve("/Users/tester/src/openclaw-automation-tools"),
			requestedRepoPath: "/Users/tester/src/openclaw-automation-tools",
			resolutionSource: "pluginConfig.hostRepoPath",
			hostPath: path.resolve("/Users/tester/src/openclaw-automation-tools"),
			containerPath: null,
			usedDefault: false,
		});
		expect(
			result.resolutionDetail.shouldAvoidContainerPathForHostExecution,
		).toBe(true);
	});

	it("prefers the explicit host workflow repo override", () => {
		const result = resolveRepoTarget({
			OPENCLAW_HOST_GIT_WORKFLOW_REPO: " ../repo-a ",
			OPENCLAW_PROJECT_DIR: "/tmp/fallback",
		});

		expect(result).toMatchObject({
			repoPath: path.resolve("../repo-a"),
			requestedRepoPath: "../repo-a",
			resolutionSource: "OPENCLAW_HOST_GIT_WORKFLOW_REPO",
			usedDefault: false,
		});
	});

	it("falls back to OPENCLAW_PROJECT_DIR when the workflow override is empty", () => {
		const result = resolveRepoTarget({
			OPENCLAW_HOST_GIT_WORKFLOW_REPO: "   ",
			OPENCLAW_PROJECT_DIR: " ./repo-b ",
		});

		expect(result).toMatchObject({
			repoPath: path.resolve("./repo-b"),
			requestedRepoPath: "./repo-b",
			resolutionSource: "OPENCLAW_PROJECT_DIR",
			usedDefault: false,
		});
	});

	it("maps a container repo path to a configured host repo path", () => {
		const result = resolveRepoTarget(
			{
				OPENCLAW_HOST_GIT_WORKFLOW_REPO:
					"/home/node/tools/openclaw-host-git-workflow/src",
			},
			{
				pathMappings: [
					{
						containerPath: "/home/node/tools/openclaw-host-git-workflow",
						hostPath: "/Users/tester/src/openclaw-host-git-workflow",
					},
				],
			},
		);

		expect(result).toMatchObject({
			repoPath: path.resolve(
				"/Users/tester/src/openclaw-host-git-workflow/src",
			),
			requestedRepoPath: "/home/node/tools/openclaw-host-git-workflow/src",
			resolutionSource: "pluginConfig.pathMappings",
			hostPath: path.resolve(
				"/Users/tester/src/openclaw-host-git-workflow/src",
			),
			containerPath: path.resolve(
				"/home/node/tools/openclaw-host-git-workflow/src",
			),
			usedDefault: false,
		});
		expect(result.pathMapping).toMatchObject({
			applied: true,
			source: "pluginConfig.pathMappings",
		});
		expect(result.resolutionDetail).toMatchObject({
			pathForHostExecution: path.resolve(
				"/Users/tester/src/openclaw-host-git-workflow/src",
			),
			pathForContainerDiscovery: path.resolve(
				"/home/node/tools/openclaw-host-git-workflow/src",
			),
			shouldAvoidContainerPathForHostExecution: true,
		});
	});

	it("uses the package default when no env override is present", () => {
		const result = resolveRepoTarget({});

		expect(result).toMatchObject({
			repoPath: path.resolve(DEFAULT_REPO_PATH),
			requestedRepoPath: DEFAULT_REPO_PATH,
			resolutionSource: "default",
			usedDefault: true,
			hostPath: path.resolve(DEFAULT_REPO_PATH),
			containerPath: null,
		});
	});
});
