import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import {
	createGitWorkflowTool,
	resolveCommitIdentityEnv,
} from "./git-workflow-tool.js";

const execFileAsync = promisify(execFile);
const tempDirs: string[] = [];

afterEach(async () => {
	delete process.env.GIT_AUTHOR_NAME;
	delete process.env.GIT_AUTHOR_EMAIL;
	delete process.env.GIT_COMMITTER_NAME;
	delete process.env.GIT_COMMITTER_EMAIL;
	delete process.env.OPENCLAW_GIT_WORKFLOW_AUTHOR_NAME;
	delete process.env.OPENCLAW_GIT_WORKFLOW_AUTHOR_EMAIL;
	delete process.env.OPENCLAW_GIT_WORKFLOW_COMMITTER_NAME;
	delete process.env.OPENCLAW_GIT_WORKFLOW_COMMITTER_EMAIL;

	await Promise.all(
		tempDirs
			.splice(0)
			.map((dir) => fs.rm(dir, { recursive: true, force: true })),
	);
});

async function createRepo() {
	const repoPath = await fs.mkdtemp(
		path.join(os.tmpdir(), "openclaw-git-workflow-identity-test-"),
	);
	tempDirs.push(repoPath);

	await execFileAsync("git", ["init", "-b", "main"], { cwd: repoPath });
	await fs.writeFile(path.join(repoPath, "README.md"), "hello\n", "utf8");
	await execFileAsync("git", ["config", "user.name", "Repo Config User"], {
		cwd: repoPath,
	});
	await execFileAsync(
		"git",
		["config", "user.email", "repo-config@example.test"],
		{ cwd: repoPath },
	);

	return repoPath;
}

describe("resolveCommitIdentityEnv", () => {
	it("uses repo git config when explicit env identity is missing", async () => {
		const repoPath = await createRepo();

		const result = await resolveCommitIdentityEnv(repoPath);

		expect(result).toMatchObject({
			GIT_AUTHOR_NAME: "Repo Config User",
			GIT_AUTHOR_EMAIL: "repo-config@example.test",
			GIT_COMMITTER_NAME: "Repo Config User",
			GIT_COMMITTER_EMAIL: "repo-config@example.test",
		});
	});

	it("falls back to deterministic OpenClaw identity when git config is missing", async () => {
		const repoPath = await fs.mkdtemp(
			path.join(os.tmpdir(), "openclaw-git-workflow-identity-fallback-"),
		);
		tempDirs.push(repoPath);
		await execFileAsync("git", ["init", "-b", "main"], { cwd: repoPath });

		const result = await resolveCommitIdentityEnv(repoPath);

		expect(result).toMatchObject({
			GIT_AUTHOR_NAME: "OpenClaw Agent",
			GIT_AUTHOR_EMAIL: "openclaw@example.test",
			GIT_COMMITTER_NAME: "OpenClaw Agent",
			GIT_COMMITTER_EMAIL: "openclaw@example.test",
		});
	});
});

describe("git_workflow_action intent normalization", () => {
	it("rejects unsupported intents before planning", async () => {
		const tool = createGitWorkflowTool();

		await expect(
			tool.execute("call-unsupported", {
				action: "plan-groups",
				command: "git status",
				commandName: "git status",
				skillName: "openclaw-git-workflow",
			}),
		).rejects.toThrow(
			"git_workflow_action accepts only the canonical send_to_git intent or its supported aliases.",
		);
	});
});
