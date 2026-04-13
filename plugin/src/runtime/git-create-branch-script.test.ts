import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const scriptPath = path.resolve(
	import.meta.dirname,
	"../../../scripts/git-create-branch.sh",
);

const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(
		tempDirs
			.splice(0)
			.map((dir) => fs.rm(dir, { recursive: true, force: true })),
	);
});

async function createRepo() {
	const repoPath = await fs.mkdtemp(
		path.join(os.tmpdir(), "openclaw-git-workflow-branch-test-"),
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

	return repoPath;
}

describe("git-create-branch.sh", () => {
	it("checks out an existing branch instead of leaving HEAD on the current branch", async () => {
		const repoPath = await createRepo();

		await execFileAsync("git", ["checkout", "-b", "docs/test-branch"], {
			cwd: repoPath,
		});
		await execFileAsync("git", ["checkout", "main"], { cwd: repoPath });

		const result = await execFileAsync(scriptPath, ["docs/test-branch"], {
			cwd: repoPath,
			env: {
				...process.env,
				OPENCLAW_GIT_WORKFLOW_REPO: repoPath,
			},
		});

		const branch = await execFileAsync(
			"git",
			["rev-parse", "--abbrev-ref", "HEAD"],
			{ cwd: repoPath },
		);

		expect(result.stdout).toContain(
			"checked out existing branch: docs/test-branch",
		);
		expect(branch.stdout.trim()).toBe("docs/test-branch");
	});

	it("creates a new branch from the provided base ref instead of stacking on HEAD", async () => {
		const repoPath = await createRepo();
		const mainHead = (
			await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: repoPath })
		).stdout.trim();

		await execFileAsync(scriptPath, ["docs/test-base-branch", mainHead], {
			cwd: repoPath,
			env: {
				...process.env,
				OPENCLAW_GIT_WORKFLOW_REPO: repoPath,
			},
		});
		await fs.writeFile(path.join(repoPath, "docs.txt"), "branch one\n", "utf8");
		await execFileAsync("git", ["add", "docs.txt"], { cwd: repoPath });
		await execFileAsync("git", ["commit", "-m", "docs(test): branch one"], {
			cwd: repoPath,
		});

		const firstBranchHead = (
			await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: repoPath })
		).stdout.trim();
		expect(firstBranchHead).not.toBe(mainHead);

		await execFileAsync(scriptPath, ["feat/test-second-branch", mainHead], {
			cwd: repoPath,
			env: {
				...process.env,
				OPENCLAW_GIT_WORKFLOW_REPO: repoPath,
			},
		});

		const secondBranchHead = (
			await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: repoPath })
		).stdout.trim();
		expect(secondBranchHead).toBe(mainHead);
	});
});
