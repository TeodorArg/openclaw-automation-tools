import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { createPullRequest, pushCurrentBranch } from "./host-ops.js";

const execFileAsync = promisify(execFile);
const tempDirs: string[] = [];

async function makeExecutable(filePath: string, content: string) {
	await fs.writeFile(filePath, content, "utf8");
	await fs.chmod(filePath, 0o755);
}

async function createRepo() {
	const repoPath = await fs.mkdtemp(
		path.join(os.tmpdir(), "openclaw-host-git-workflow-"),
	);
	tempDirs.push(repoPath);

	await execFileAsync("git", ["init", "-b", "main"], { cwd: repoPath });
	await execFileAsync("git", ["config", "user.name", "Test User"], {
		cwd: repoPath,
	});
	await execFileAsync("git", ["config", "user.email", "test@example.com"], {
		cwd: repoPath,
	});
	await fs.writeFile(path.join(repoPath, "README.md"), "hello\n", "utf8");
	await execFileAsync("git", ["add", "README.md"], { cwd: repoPath });
	await execFileAsync("git", ["commit", "-m", "chore(repo): init"], {
		cwd: repoPath,
	});
	await execFileAsync("git", ["checkout", "-b", "feat/host-workflow-test"], {
		cwd: repoPath,
	});
	const remotePath = await fs.mkdtemp(
		path.join(os.tmpdir(), "openclaw-host-git-workflow-remote-"),
	);
	tempDirs.push(remotePath);
	await execFileAsync("git", ["init", "--bare"], { cwd: remotePath });
	await execFileAsync("git", ["remote", "add", "origin", remotePath], {
		cwd: repoPath,
	});
	await fs.writeFile(path.join(repoPath, "notes.md"), "next\n", "utf8");
	await execFileAsync("git", ["add", "notes.md"], { cwd: repoPath });
	await execFileAsync(
		"git",
		[
			"commit",
			"-m",
			"feat(workflow): add host push and pr slice",
			"-m",
			[
				"Add bounded push and PR support to the host workflow package.",
				"- Keep current branch as the only allowed PR head.",
				"- Fix PR base to main and derive metadata from the latest commit.",
				"- Cover the new runtime files with direct unit tests.",
				"- Preserve bounded behavior without arbitrary gh passthrough.",
			].join("\n"),
		],
		{ cwd: repoPath },
	);

	return { repoPath, remotePath };
}

async function createFakeGh(repoPath: string) {
	const binDir = path.join(repoPath, "fake-bin");
	await fs.mkdir(binDir, { recursive: true });
	const ghLogPath = path.join(repoPath, "gh-invocations.log");

	await makeExecutable(
		path.join(binDir, "gh"),
		`#!/bin/sh
if [ "$1" = "--version" ]; then
  echo "gh version test"
  exit 0
fi
printf '%s\\n' "$@" >> "${ghLogPath}"
if [ "$1" = "auth" ] && [ "$2" = "status" ]; then
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "create" ]; then
  echo "https://github.com/test/repo/pull/123"
  exit 0
fi
exit 0
`,
	);

	return { binDir, ghLogPath };
}

afterEach(async () => {
	delete process.env.OPENCLAW_HOST_GIT_WORKFLOW_GIT_BIN;
	delete process.env.OPENCLAW_HOST_GIT_WORKFLOW_GH_BIN;

	await Promise.all(
		tempDirs
			.splice(0)
			.map((dir) => fs.rm(dir, { recursive: true, force: true })),
	);
});

describe("host push and pr ops", () => {
	it("pushes the current branch to origin with bounded args", async () => {
		const { repoPath, remotePath } = await createRepo();
		const { binDir } = await createFakeGh(repoPath);

		process.env.OPENCLAW_HOST_GIT_WORKFLOW_GH_BIN = path.join(binDir, "gh");

		const result = await pushCurrentBranch(repoPath);
		const remoteHead = await execFileAsync(
			"git",
			["rev-parse", "refs/heads/feat/host-workflow-test"],
			{ cwd: remotePath },
		);

		expect(result).toMatchObject({
			status: "pushed",
			currentBranch: "feat/host-workflow-test",
			originUrl: remotePath,
		});
		expect(remoteHead.stdout.trim()).not.toBe("");
	});

	it("creates a PR into main from the current branch using latest commit metadata", async () => {
		const { repoPath } = await createRepo();
		const { binDir, ghLogPath } = await createFakeGh(repoPath);

		process.env.OPENCLAW_HOST_GIT_WORKFLOW_GH_BIN = path.join(binDir, "gh");

		const result = await createPullRequest(repoPath);
		const ghLog = await fs.readFile(ghLogPath, "utf8");

		expect(result).toMatchObject({
			status: "pr_opened",
			baseBranch: "main",
			currentBranch: "feat/host-workflow-test",
			prTitle: "feat(workflow): add host push and pr slice",
		});
		expect(ghLog).toContain("pr");
		expect(ghLog).toContain("create");
		expect(ghLog).toContain("--base");
		expect(ghLog).toContain("main");
		expect(ghLog).toContain("--head");
		expect(ghLog).toContain("feat/host-workflow-test");
	});

	it("blocks push and pr flow on main", async () => {
		const repoPath = await fs.mkdtemp(
			path.join(os.tmpdir(), "openclaw-host-git-workflow-main-"),
		);
		tempDirs.push(repoPath);

		await execFileAsync("git", ["init", "-b", "main"], { cwd: repoPath });
		await execFileAsync("git", ["config", "user.name", "Test User"], {
			cwd: repoPath,
		});
		await execFileAsync("git", ["config", "user.email", "test@example.com"], {
			cwd: repoPath,
		});
		await fs.writeFile(path.join(repoPath, "README.md"), "hello\n", "utf8");
		await execFileAsync("git", ["add", "README.md"], { cwd: repoPath });
		await execFileAsync("git", ["commit", "-m", "chore(repo): init"], {
			cwd: repoPath,
		});
		const remotePath = await fs.mkdtemp(
			path.join(os.tmpdir(), "openclaw-host-git-workflow-main-remote-"),
		);
		tempDirs.push(remotePath);
		await execFileAsync("git", ["init", "--bare"], { cwd: remotePath });
		await execFileAsync("git", ["remote", "add", "origin", remotePath], {
			cwd: repoPath,
		});

		const { binDir } = await createFakeGh(repoPath);
		process.env.OPENCLAW_HOST_GIT_WORKFLOW_GH_BIN = path.join(binDir, "gh");

		await expect(pushCurrentBranch(repoPath)).rejects.toThrow(
			"This host workflow action requires a non-main working branch.",
		);
	});
});
