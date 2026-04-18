import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import {
	createPullRequest,
	enterWorkingBranch,
	mergePullRequest,
	pushCurrentBranch,
	syncMainBranch,
	waitForPullRequestChecks,
} from "../runtime/host/ops.js";

const execFileAsync = promisify(execFile);
const tempDirs: string[] = [];

async function makeExecutable(filePath: string, content: string) {
	await fs.writeFile(filePath, content, "utf8");
	await fs.chmod(filePath, 0o755);
}

async function createRepo(options?: {
	workingBranch?: string | null;
	withFeatureCommit?: boolean;
}) {
	const {
		workingBranch = "feat/host-workflow-test",
		withFeatureCommit = true,
	} = options ?? {};
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
	const remotePath = await fs.mkdtemp(
		path.join(os.tmpdir(), "openclaw-host-git-workflow-remote-"),
	);
	tempDirs.push(remotePath);
	await execFileAsync("git", ["init", "--bare"], { cwd: remotePath });
	await execFileAsync("git", ["remote", "add", "origin", remotePath], {
		cwd: repoPath,
	});

	if (workingBranch) {
		await execFileAsync("git", ["checkout", "-b", workingBranch], {
			cwd: repoPath,
		});
	}

	if (withFeatureCommit && workingBranch) {
		await fs.writeFile(path.join(repoPath, "notes.md"), "next\n", "utf8");
		await execFileAsync("git", ["add", "notes.md"], { cwd: repoPath });
		await execFileAsync(
			"git",
			[
				"commit",
				"-m",
				"feat(openclaw-host-git-workflow): add host push and pr slice",
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
	}

	return { repoPath, remotePath };
}

async function cloneAndAdvanceMain(remotePath: string) {
	const clonePath = await fs.mkdtemp(
		path.join(os.tmpdir(), "openclaw-host-git-workflow-sync-main-clone-"),
	);
	tempDirs.push(clonePath);

	await execFileAsync("git", ["clone", remotePath, clonePath]);
	await execFileAsync(
		"git",
		["checkout", "-b", "main", "--track", "origin/main"],
		{
			cwd: clonePath,
		},
	);
	await execFileAsync("git", ["config", "user.name", "Remote User"], {
		cwd: clonePath,
	});
	await execFileAsync("git", ["config", "user.email", "remote@example.com"], {
		cwd: clonePath,
	});
	await fs.writeFile(
		path.join(clonePath, "REMOTE.md"),
		"remote main advance\n",
		"utf8",
	);
	await execFileAsync("git", ["add", "REMOTE.md"], { cwd: clonePath });
	await execFileAsync("git", ["commit", "-m", "chore(repo): advance main"], {
		cwd: clonePath,
	});
	await execFileAsync("git", ["push", "origin", "main"], { cwd: clonePath });
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
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  echo '{"number":123,"url":"https://github.com/test/repo/pull/123","headRefName":"feat/host-workflow-test","baseRefName":"main","state":"OPEN"}'
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "checks" ]; then
  echo "required checks passed"
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "create" ]; then
  echo "https://github.com/test/repo/pull/123"
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "merge" ]; then
  echo "merged"
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
	it("creates and enters a new working branch from main", async () => {
		const { repoPath } = await createRepo({
			workingBranch: null,
			withFeatureCommit: false,
		});

		const result = await enterWorkingBranch(
			repoPath,
			"feat/branch-entry-from-main",
		);
		const currentBranch = await execFileAsync(
			"git",
			["rev-parse", "--abbrev-ref", "HEAD"],
			{ cwd: repoPath },
		);

		expect(result).toMatchObject({
			status: "entered_branch",
			startingBranch: "main",
			requestedBranch: "feat/branch-entry-from-main",
			currentBranch: "feat/branch-entry-from-main",
			branchCreated: true,
			carriedUncommittedChanges: false,
			entryMode: "created_and_checked_out",
		});
		expect(currentBranch.stdout.trim()).toBe("feat/branch-entry-from-main");
	});

	it("creates a new working branch from dirty main and carries uncommitted changes", async () => {
		const { repoPath } = await createRepo({
			workingBranch: null,
			withFeatureCommit: false,
		});
		await fs.writeFile(path.join(repoPath, "dirty.txt"), "dirty\n", "utf8");

		const result = await enterWorkingBranch(repoPath, "feat/dirty-main-carry");
		const currentBranch = await execFileAsync(
			"git",
			["rev-parse", "--abbrev-ref", "HEAD"],
			{ cwd: repoPath },
		);
		const carriedFile = await fs.readFile(
			path.join(repoPath, "dirty.txt"),
			"utf8",
		);
		const status = await execFileAsync("git", ["status", "--short"], {
			cwd: repoPath,
		});

		expect(result).toMatchObject({
			status: "entered_branch",
			startingBranch: "main",
			requestedBranch: "feat/dirty-main-carry",
			currentBranch: "feat/dirty-main-carry",
			branchCreated: true,
			carriedUncommittedChanges: true,
			entryMode: "created_and_checked_out",
		});
		expect(currentBranch.stdout.trim()).toBe("feat/dirty-main-carry");
		expect(carriedFile).toBe("dirty\n");
		expect(status.stdout).toContain("dirty.txt");
	});

	it("switches from main into an existing local working branch", async () => {
		const { repoPath } = await createRepo({
			workingBranch: null,
			withFeatureCommit: false,
		});
		await execFileAsync("git", ["checkout", "-b", "feat/existing-branch"], {
			cwd: repoPath,
		});
		await execFileAsync("git", ["checkout", "main"], { cwd: repoPath });

		const result = await enterWorkingBranch(repoPath, "feat/existing-branch");
		const currentBranch = await execFileAsync(
			"git",
			["rev-parse", "--abbrev-ref", "HEAD"],
			{ cwd: repoPath },
		);

		expect(result).toMatchObject({
			status: "entered_branch",
			startingBranch: "main",
			requestedBranch: "feat/existing-branch",
			currentBranch: "feat/existing-branch",
			branchCreated: false,
			carriedUncommittedChanges: false,
			entryMode: "checked_out_existing",
		});
		expect(currentBranch.stdout.trim()).toBe("feat/existing-branch");
	});

	it("blocks dirty switch into an existing local branch", async () => {
		const { repoPath } = await createRepo({
			workingBranch: null,
			withFeatureCommit: false,
		});
		await execFileAsync("git", ["checkout", "-b", "feat/existing-branch"], {
			cwd: repoPath,
		});
		await execFileAsync("git", ["checkout", "main"], { cwd: repoPath });
		await fs.writeFile(path.join(repoPath, "dirty.txt"), "dirty\n", "utf8");

		await expect(
			enterWorkingBranch(repoPath, "feat/existing-branch"),
		).rejects.toThrow(
			"Working tree must be clean before bounded branch entry can switch branches; only main -> new branch creation may carry uncommitted changes.",
		);
	});

	it("rejects invalid bounded branch entry names", async () => {
		const { repoPath } = await createRepo({
			workingBranch: null,
			withFeatureCommit: false,
		});

		await expect(enterWorkingBranch(repoPath, "main")).rejects.toThrow(
			"Bounded branch entry requires a non-main working branch.",
		);
		await expect(enterWorkingBranch(repoPath, "bad branch")).rejects.toThrow(
			"Invalid git branch name: bad branch",
		);
	});

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
			prTitle: "feat(openclaw-host-git-workflow): add host push and pr slice",
			prBody: [
				"Add bounded push and PR support to the host workflow package.",
				"- Keep current branch as the only allowed PR head.",
				"- Fix PR base to main and derive metadata from the latest commit.",
				"- Cover the new runtime files with direct unit tests.",
				"- Preserve bounded behavior without arbitrary gh passthrough.",
			].join("\n"),
		});
		expect(ghLog).toContain("pr");
		expect(ghLog).toContain("create");
		expect(ghLog).toContain("--base");
		expect(ghLog).toContain("main");
		expect(ghLog).toContain("--head");
		expect(ghLog).toContain("feat/host-workflow-test");
		expect(ghLog).toContain("--fill-verbose");
	});

	it("waits for required checks on the bounded current-branch PR", async () => {
		const { repoPath } = await createRepo();
		const { binDir, ghLogPath } = await createFakeGh(repoPath);

		process.env.OPENCLAW_HOST_GIT_WORKFLOW_GH_BIN = path.join(binDir, "gh");

		const result = await waitForPullRequestChecks(repoPath);
		const ghLog = await fs.readFile(ghLogPath, "utf8");

		expect(result).toMatchObject({
			status: "checks_passed",
			currentBranch: "feat/host-workflow-test",
			prNumber: 123,
			baseBranch: "main",
			checkScope: "required",
			watchMode: "poll_until_complete",
			watchIntervalSeconds: 10,
		});
		expect(ghLog).toContain("pr");
		expect(ghLog).toContain("view");
		expect(ghLog).toContain("--json");
		expect(ghLog).toContain("--json\nnumber");
		expect(ghLog).toContain("--json\nurl");
		expect(ghLog).toContain("--json\nheadRefName");
		expect(ghLog).toContain("--json\nbaseRefName");
		expect(ghLog).toContain("--json\nstate");
		expect(ghLog).toContain("checks");
		expect(ghLog).toContain("--required");
		expect(ghLog).toContain("--watch");
		expect(ghLog).toContain("--interval");
	});

	it("merges the bounded current-branch PR with head SHA matching", async () => {
		const { repoPath } = await createRepo();
		const { binDir, ghLogPath } = await createFakeGh(repoPath);

		process.env.OPENCLAW_HOST_GIT_WORKFLOW_GH_BIN = path.join(binDir, "gh");

		const result = await mergePullRequest(repoPath);
		const ghLog = await fs.readFile(ghLogPath, "utf8");
		const headSha = await execFileAsync("git", ["rev-parse", "HEAD"], {
			cwd: repoPath,
		});

		expect(result).toMatchObject({
			status: "merged",
			currentBranch: "feat/host-workflow-test",
			prNumber: 123,
			baseBranch: "main",
			mergeMethod: "merge",
			headCommitSha: headSha.stdout.trim(),
		});
		expect(ghLog).toContain("pr");
		expect(ghLog).toContain("view");
		expect(ghLog).toContain("merge");
		expect(ghLog).toContain("--merge");
		expect(ghLog).toContain("--match-head-commit");
		expect(ghLog).toContain(headSha.stdout.trim());
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

	it("syncs local main from origin/main with fast-forward-only behavior", async () => {
		const { repoPath, remotePath } = await createRepo();

		await execFileAsync(
			"git",
			["push", "--set-upstream", "origin", "HEAD~1:refs/heads/main"],
			{
				cwd: repoPath,
			},
		);
		await cloneAndAdvanceMain(remotePath);

		const result = await syncMainBranch(repoPath);
		const currentBranch = await execFileAsync(
			"git",
			["rev-parse", "--abbrev-ref", "HEAD"],
			{ cwd: repoPath },
		);
		const localMainHead = await execFileAsync(
			"git",
			["rev-parse", "refs/heads/main"],
			{ cwd: repoPath },
		);
		const remoteMainHead = await execFileAsync(
			"git",
			["rev-parse", "refs/heads/main"],
			{ cwd: remotePath },
		);

		expect(result).toMatchObject({
			status: "synced_main",
			baseBranch: "main",
			startingBranch: "feat/host-workflow-test",
			currentBranch: "main",
			localBranchCreated: false,
			syncMode: "checkout_and_fast_forward",
		});
		expect(currentBranch.stdout.trim()).toBe("main");
		expect(localMainHead.stdout.trim()).toBe(remoteMainHead.stdout.trim());
	});

	it("blocks sync_main when the working tree is dirty", async () => {
		const { repoPath } = await createRepo();

		await fs.writeFile(path.join(repoPath, "dirty.txt"), "dirty\n", "utf8");

		await expect(syncMainBranch(repoPath)).rejects.toThrow(
			"Working tree must be clean before bounded sync_main can update local main.",
		);
	});
});
