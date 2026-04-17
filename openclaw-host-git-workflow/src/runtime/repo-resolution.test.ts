import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_REPO_PATH, resolveRepoTarget } from "./repo-resolution.js";

describe("repo resolution", () => {
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

	it("uses the package default when no env override is present", () => {
		const result = resolveRepoTarget({});

		expect(result).toMatchObject({
			repoPath: path.resolve(DEFAULT_REPO_PATH),
			requestedRepoPath: DEFAULT_REPO_PATH,
			resolutionSource: "default",
			usedDefault: true,
		});
	});
});
