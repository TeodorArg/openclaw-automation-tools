import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { preflightHostOps } from "./preflight.js";

const execFileAsync = promisify(execFile);
const tempDirs: string[] = [];

async function makeExecutable(filePath: string, content: string) {
	await fs.writeFile(filePath, content, "utf8");
	await fs.chmod(filePath, 0o755);
}

async function createRepo(branchName = "feat/host-workflow-test") {
	const repoPath = await fs.mkdtemp(
		path.join(os.tmpdir(), "openclaw-host-git-workflow-preflight-"),
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

	if (branchName !== "main") {
		await execFileAsync("git", ["checkout", "-b", branchName], {
			cwd: repoPath,
		});
	}

	const remotePath = await fs.mkdtemp(
		path.join(os.tmpdir(), "openclaw-host-git-workflow-preflight-remote-"),
	);
	tempDirs.push(remotePath);
	await execFileAsync("git", ["init", "--bare"], { cwd: remotePath });
	await execFileAsync("git", ["remote", "add", "origin", remotePath], {
		cwd: repoPath,
	});

	return { repoPath, remotePath };
}

async function createFakeGh(repoPath: string, authReady = true) {
	const binDir = path.join(repoPath, "fake-bin");
	await fs.mkdir(binDir, { recursive: true });

	await makeExecutable(
		path.join(binDir, "gh"),
		`#!/bin/sh
if [ "$1" = "--version" ]; then
  echo "gh version test"
  exit 0
fi
if [ "$1" = "auth" ] && [ "$2" = "status" ]; then
  ${authReady ? "exit 0" : "exit 1"}
fi
exit 0
`,
	);

	return { binDir };
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

describe("host preflight", () => {
	it("returns structured readiness for a valid repo", async () => {
		const { repoPath, remotePath } = await createRepo();
		const { binDir } = await createFakeGh(repoPath);
		const resolvedRepoPath = await fs.realpath(repoPath);

		process.env.OPENCLAW_HOST_GIT_WORKFLOW_GH_BIN = path.join(binDir, "gh");

		const result = await preflightHostOps(repoPath, {
			requireGhAuth: true,
			requireNonMainBranch: true,
		});

		expect(result).toMatchObject({
			repoPath,
			repoRoot: resolvedRepoPath,
			currentBranch: "feat/host-workflow-test",
			originUrl: remotePath,
			ghAuthStatus: "ready",
		});
	});

	it("allows main when the action does not require a working branch", async () => {
		const { repoPath } = await createRepo("main");
		const { binDir } = await createFakeGh(repoPath);

		process.env.OPENCLAW_HOST_GIT_WORKFLOW_GH_BIN = path.join(binDir, "gh");

		const result = await preflightHostOps(repoPath, {
			requireGhAuth: true,
			requireNonMainBranch: false,
		});

		expect(result.currentBranch).toBe("main");
	});

	it("fails when GitHub auth is not ready", async () => {
		const { repoPath } = await createRepo();
		const { binDir } = await createFakeGh(repoPath, false);

		process.env.OPENCLAW_HOST_GIT_WORKFLOW_GH_BIN = path.join(binDir, "gh");

		await expect(
			preflightHostOps(repoPath, {
				requireGhAuth: true,
				requireNonMainBranch: false,
			}),
		).rejects.toThrow(
			"GitHub CLI auth is not ready for bounded host workflow actions.",
		);
	});
});
