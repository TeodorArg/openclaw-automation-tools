import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const scriptPath = path.resolve(
	import.meta.dirname,
	"../../scripts/git-create-commit.sh",
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
		path.join(os.tmpdir(), "openclaw-git-workflow-commit-test-"),
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

describe("git-create-commit.sh", () => {
	it("stages only the requested files and creates the commit on the expected branch", async () => {
		const repoPath = await createRepo();

		await execFileAsync("git", ["checkout", "-b", "feat/test-commit"], {
			cwd: repoPath,
		});
		await fs.writeFile(path.join(repoPath, "docs.md"), "docs change\n", "utf8");
		await fs.writeFile(
			path.join(repoPath, "notes.md"),
			"notes change\n",
			"utf8",
		);

		const result = await execFileAsync(
			scriptPath,
			[
				"feat/test-commit",
				JSON.stringify(["docs.md"]),
				"docs(test): add docs",
				"Add docs coverage for direct commit script test.",
			],
			{
				cwd: repoPath,
				env: {
					...process.env,
					OPENCLAW_GIT_WORKFLOW_REPO: repoPath,
				},
			},
		);

		const showHead = await execFileAsync(
			"git",
			["show", "--stat", "--format=%s%n%b", "HEAD"],
			{ cwd: repoPath },
		);
		const stagedStatus = await execFileAsync("git", ["status", "--short"], {
			cwd: repoPath,
		});

		expect(result.stdout).toContain(
			"created commit on branch: feat/test-commit",
		);
		expect(showHead.stdout).toContain("docs(test): add docs");
		expect(showHead.stdout).toContain(
			"Add docs coverage for direct commit script test.",
		);
		expect(showHead.stdout).toContain("docs.md");
		expect(showHead.stdout).not.toContain("notes.md");
		expect(stagedStatus.stdout).toContain("?? notes.md");
	});

	it("fails when the current branch does not match the expected branch", async () => {
		const repoPath = await createRepo();

		await fs.writeFile(path.join(repoPath, "docs.md"), "docs change\n", "utf8");

		await expect(
			execFileAsync(
				scriptPath,
				[
					"feat/other-branch",
					JSON.stringify(["docs.md"]),
					"docs(test): add docs",
					"Branch mismatch should fail.",
				],
				{
					cwd: repoPath,
					env: {
						...process.env,
						OPENCLAW_GIT_WORKFLOW_REPO: repoPath,
					},
				},
			),
		).rejects.toMatchObject({
			stderr: expect.stringContaining(
				"current branch 'main' does not match expected 'feat/other-branch'",
			),
		});
	});
});
