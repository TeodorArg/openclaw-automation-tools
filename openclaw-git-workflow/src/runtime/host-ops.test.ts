import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import {
	createPullRequest,
	mergePullRequest,
	pushCurrentBranch,
	syncMain,
	waitForChecks,
} from "./host-ops.js";

const execFileAsync = promisify(execFile);
const tempDirs: string[] = [];

async function makeExecutable(filePath: string, content: string) {
	await fs.writeFile(filePath, content, "utf8");
	await fs.chmod(filePath, 0o755);
}

async function createRepo() {
	const repoPath = await fs.mkdtemp(
		path.join(os.tmpdir(), "openclaw-git-workflow-host-ops-"),
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
		path.join(os.tmpdir(), "openclaw-git-workflow-host-ops-remote-"),
	);
	tempDirs.push(remotePath);
	await execFileAsync("git", ["init", "--bare"], { cwd: remotePath });
	await execFileAsync("git", ["remote", "add", "origin", remotePath], {
		cwd: repoPath,
	});
	await execFileAsync("git", ["push", "--set-upstream", "origin", "main"], {
		cwd: repoPath,
	});
	await execFileAsync("git", ["checkout", "-b", "feat/host-workflow-test"], {
		cwd: repoPath,
	});
	await fs.writeFile(path.join(repoPath, "notes.md"), "next\n", "utf8");
	await execFileAsync("git", ["add", "notes.md"], { cwd: repoPath });
	await execFileAsync(
		"git",
		[
			"commit",
			"-m",
			"feat(workflow): add host-backed finish flow",
			"-m",
			[
				"Add bounded host-backed finish steps to the workflow package.",
				"- Push only the current non-main branch to origin.",
				"- Open and manage the current branch PR into main.",
				"- Poll required checks until pass or fix-needed failure.",
				"- Sync local main with a fast-forward-only pull after merge.",
			].join("\n"),
		],
		{ cwd: repoPath },
	);

	return { repoPath, remotePath };
}

async function createFakeGh(
	repoPath: string,
	options?: {
		checkBuckets?: string[][];
		mergeStdout?: string;
	},
) {
	const binDir = path.join(repoPath, "fake-bin");
	await fs.mkdir(binDir, { recursive: true });
	const ghLogPath = path.join(repoPath, "gh-invocations.log");
	const checkStatePath = path.join(repoPath, "gh-check-state");
	const checkSequences = JSON.stringify(
		options?.checkBuckets ?? [["pending"], ["pass"]],
	);

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
if [ "$1" = "pr" ] && [ "$2" = "checks" ]; then
  count=0
  if [ -f "${checkStatePath}" ]; then
    count=$(cat "${checkStatePath}")
  fi
  node -e '
const fs = require("fs");
const statePath = process.argv[1];
const count = Number(process.argv[2]);
const sequences = ${checkSequences};
const buckets = sequences[Math.min(count, sequences.length - 1)];
const checks = buckets.map((bucket, index) => ({
  name: "check-" + (index + 1),
  state: bucket === "pending" ? "IN_PROGRESS" : bucket === "pass" ? "SUCCESS" : "FAILED",
  bucket,
  workflow: "ci",
}));
process.stdout.write(JSON.stringify(checks));
fs.writeFileSync(statePath, String(count + 1));
' "${checkStatePath}" "$count"
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "merge" ]; then
  echo "${options?.mergeStdout ?? "Merged pull request"}"
  exit 0
fi
exit 0
`,
	);

	return { binDir, ghLogPath };
}

afterEach(async () => {
	delete process.env.OPENCLAW_GIT_WORKFLOW_GIT_BIN;
	delete process.env.OPENCLAW_GIT_WORKFLOW_GH_BIN;
	delete process.env.OPENCLAW_GIT_WORKFLOW_CHECKS_INTERVAL_MS;

	await Promise.all(
		tempDirs
			.splice(0)
			.map((dir) => fs.rm(dir, { recursive: true, force: true })),
	);
});

describe("host-backed finish ops", () => {
	it("pushes the current branch to origin with bounded args", async () => {
		const { repoPath, remotePath } = await createRepo();
		const { binDir } = await createFakeGh(repoPath);

		process.env.OPENCLAW_GIT_WORKFLOW_GH_BIN = path.join(binDir, "gh");

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

		process.env.OPENCLAW_GIT_WORKFLOW_GH_BIN = path.join(binDir, "gh");

		const result = await createPullRequest(repoPath);
		const ghLog = await fs.readFile(ghLogPath, "utf8");

		expect(result).toMatchObject({
			status: "pr_opened",
			baseBranch: "main",
			currentBranch: "feat/host-workflow-test",
			prTitle: "feat(workflow): add host-backed finish flow",
		});
		expect(ghLog).toContain("pr");
		expect(ghLog).toContain("create");
		expect(ghLog).toContain("--base");
		expect(ghLog).toContain("main");
		expect(ghLog).toContain("--head");
		expect(ghLog).toContain("feat/host-workflow-test");
	});

	it("polls required checks until they pass", async () => {
		const { repoPath } = await createRepo();
		const { binDir } = await createFakeGh(repoPath, {
			checkBuckets: [["pending"], ["pending"], ["pass"]],
		});

		process.env.OPENCLAW_GIT_WORKFLOW_GH_BIN = path.join(binDir, "gh");
		process.env.OPENCLAW_GIT_WORKFLOW_CHECKS_INTERVAL_MS = "0";

		const result = await waitForChecks(repoPath);

		expect(result).toMatchObject({
			status: "checks_passed",
			currentBranch: "feat/host-workflow-test",
			polls: 3,
		});
		expect(result.checks).toHaveLength(1);
		expect(result.checks[0]?.bucket).toBe("pass");
	});

	it("stops checks polling when a required check fails", async () => {
		const { repoPath } = await createRepo();
		const { binDir } = await createFakeGh(repoPath, {
			checkBuckets: [["pending"], ["fail"]],
		});

		process.env.OPENCLAW_GIT_WORKFLOW_GH_BIN = path.join(binDir, "gh");
		process.env.OPENCLAW_GIT_WORKFLOW_CHECKS_INTERVAL_MS = "0";

		const result = await waitForChecks(repoPath);

		expect(result).toMatchObject({
			status: "checks_failed",
			polls: 2,
		});
		expect(result.checks[0]?.bucket).toBe("fail");
	});

	it("merges the current branch PR after checks pass", async () => {
		const { repoPath } = await createRepo();
		const { binDir, ghLogPath } = await createFakeGh(repoPath, {
			checkBuckets: [["pass"]],
		});

		process.env.OPENCLAW_GIT_WORKFLOW_GH_BIN = path.join(binDir, "gh");
		process.env.OPENCLAW_GIT_WORKFLOW_CHECKS_INTERVAL_MS = "0";

		const result = await mergePullRequest(repoPath);
		const ghLog = await fs.readFile(ghLogPath, "utf8");

		expect(result).toMatchObject({
			status: "merged",
			baseBranch: "main",
			currentBranch: "feat/host-workflow-test",
		});
		expect(ghLog).toContain("checks");
		expect(ghLog).toContain("merge");
		expect(ghLog).toContain("--squash");
		expect(ghLog).toContain("--delete-branch");
	});

	it("syncs local main with an ff-only pull from origin", async () => {
		const { repoPath, remotePath } = await createRepo();
		const upstreamClone = await fs.mkdtemp(
			path.join(os.tmpdir(), "openclaw-git-workflow-upstream-"),
		);
		tempDirs.push(upstreamClone);

		await execFileAsync("git", ["clone", remotePath, upstreamClone]);
		await execFileAsync(
			"git",
			["switch", "-c", "main", "--track", "origin/main"],
			{
				cwd: upstreamClone,
			},
		);
		await execFileAsync("git", ["config", "user.name", "Upstream User"], {
			cwd: upstreamClone,
		});
		await execFileAsync(
			"git",
			["config", "user.email", "upstream@example.com"],
			{
				cwd: upstreamClone,
			},
		);
		await fs.writeFile(
			path.join(upstreamClone, "upstream.txt"),
			"upstream change\n",
			"utf8",
		);
		await execFileAsync("git", ["add", "upstream.txt"], { cwd: upstreamClone });
		await execFileAsync(
			"git",
			["commit", "-m", "chore(main): advance upstream"],
			{
				cwd: upstreamClone,
			},
		);
		await execFileAsync("git", ["push", "origin", "main"], {
			cwd: upstreamClone,
		});

		const result = await syncMain(repoPath);
		const branch = await execFileAsync(
			"git",
			["rev-parse", "--abbrev-ref", "HEAD"],
			{ cwd: repoPath },
		);
		const upstreamFile = await fs.readFile(
			path.join(repoPath, "upstream.txt"),
			"utf8",
		);

		expect(result).toMatchObject({
			status: "main_synced",
			currentBranch: "main",
			originUrl: remotePath,
		});
		expect(branch.stdout.trim()).toBe("main");
		expect(upstreamFile).toContain("upstream change");
	});
});
