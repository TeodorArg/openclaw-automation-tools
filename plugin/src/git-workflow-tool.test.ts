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
	delete process.env.OPENCLAW_GIT_WORKFLOW_REPO;

	await Promise.all(
		tempDirs
			.splice(0)
			.map((dir) => fs.rm(dir, { recursive: true, force: true })),
	);
});

const fixtureRepoRoot = path.resolve(import.meta.dirname, "..");

async function createRepo(options?: {
	withGitConfig?: boolean;
	withWorkflowScripts?: boolean;
}) {
	const repoPath = await fs.mkdtemp(
		path.join(os.tmpdir(), "openclaw-git-workflow-identity-test-"),
	);
	tempDirs.push(repoPath);

	await execFileAsync("git", ["init", "-b", "main"], { cwd: repoPath });
	await fs.writeFile(path.join(repoPath, "README.md"), "hello\n", "utf8");

	if (options?.withWorkflowScripts) {
		const scriptsDir = path.join(repoPath, "plugin", "scripts");
		await fs.mkdir(scriptsDir, { recursive: true });
		await fs.copyFile(
			path.join(fixtureRepoRoot, "scripts", "git-create-branch.sh"),
			path.join(scriptsDir, "git-create-branch.sh"),
		);
		await fs.copyFile(
			path.join(fixtureRepoRoot, "scripts", "git-create-commit.sh"),
			path.join(scriptsDir, "git-create-commit.sh"),
		);
		await fs.chmod(path.join(scriptsDir, "git-create-branch.sh"), 0o755);
		await fs.chmod(path.join(scriptsDir, "git-create-commit.sh"), 0o755);
	}

	if (options?.withGitConfig ?? true) {
		await execFileAsync("git", ["config", "user.name", "Repo Config User"], {
			cwd: repoPath,
		});
		await execFileAsync(
			"git",
			["config", "user.email", "repo-config@example.test"],
			{ cwd: repoPath },
		);
	}

	return repoPath;
}

async function commitAll(
	repoPath: string,
	message: string,
	env?: NodeJS.ProcessEnv,
) {
	await execFileAsync("git", ["add", "."], { cwd: repoPath });
	await execFileAsync("git", ["commit", "-m", message], {
		cwd: repoPath,
		env: {
			...process.env,
			...env,
		},
	});
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

describe("createGitWorkflowTool execute", () => {
	it("runs the full confirmed-plan execute path across multiple groups", async () => {
		const repoPath = await createRepo({
			withGitConfig: false,
			withWorkflowScripts: true,
		});
		const initialIdentity = {
			GIT_AUTHOR_NAME: "Initial Test User",
			GIT_AUTHOR_EMAIL: "initial@example.test",
			GIT_COMMITTER_NAME: "Initial Test User",
			GIT_COMMITTER_EMAIL: "initial@example.test",
		};

		await commitAll(repoPath, "chore(repo): init", initialIdentity);
		await fs.writeFile(path.join(repoPath, "docs.md"), "docs change\n", "utf8");
		await fs.writeFile(
			path.join(repoPath, "runtime.txt"),
			"runtime change\n",
			"utf8",
		);

		process.env.OPENCLAW_GIT_WORKFLOW_REPO = repoPath;
		const tool = createGitWorkflowTool();
		const response = await tool.execute("call-1", {
			action: "execute-groups-with-branches",
			command: "send_to_git",
			commandName: "send_to_git",
			skillName: "openclaw-git-workflow",
			confirmedPlan: {
				version: 1,
				repoPath,
				status: "confirmed",
				sourceCommand: "send_to_git",
				groups: [
					{
						id: "group-1",
						branch: "docs/test-e2e-docs",
						files: ["docs.md"],
						commit: {
							title: "docs(workflow): add e2e execute coverage",
							body: [
								"Add end-to-end execute coverage for confirmed plans.",
								"- Verify bounded execute creates the docs branch.",
								"- Verify only the requested docs file is committed.",
								"- Keep the confirmed-plan handoff explicit in the test.",
								"- Preserve no-push behavior in the execute flow.",
							].join("\n"),
						},
					},
					{
						id: "group-2",
						branch: "feat/test-e2e-runtime",
						files: ["runtime.txt"],
						commit: {
							title: "feat(workflow): cover confirmed execute e2e",
							body: [
								"Exercise the full execute path through the tool runtime.",
								"- Verify each group starts from the initial base commit.",
								"- Verify the runtime branch does not stack on prior work.",
								"- Verify fallback git identity is deterministic.",
								"- Verify execute returns structured success payloads.",
							].join("\n"),
						},
					},
				],
			},
		});

		const payload = JSON.parse(response.content[0]?.text ?? "{}");
		expect(payload.ok, JSON.stringify(payload, null, 2)).toBe(true);
		const initialHead = (
			await execFileAsync("git", ["rev-parse", "main"], { cwd: repoPath })
		).stdout.trim();
		const docsCommit = (
			await execFileAsync("git", ["rev-parse", "docs/test-e2e-docs"], {
				cwd: repoPath,
			})
		).stdout.trim();
		const runtimeCommit = (
			await execFileAsync("git", ["rev-parse", "feat/test-e2e-runtime"], {
				cwd: repoPath,
			})
		).stdout.trim();
		const docsParent = (
			await execFileAsync("git", ["rev-parse", "docs/test-e2e-docs^"], {
				cwd: repoPath,
			})
		).stdout.trim();
		const runtimeParent = (
			await execFileAsync("git", ["rev-parse", "feat/test-e2e-runtime^"], {
				cwd: repoPath,
			})
		).stdout.trim();
		const docsShow = await execFileAsync(
			"git",
			["show", "--stat", "--format=%an%n%ae%n%s%n%b", "docs/test-e2e-docs"],
			{ cwd: repoPath },
		);
		const runtimeShow = await execFileAsync(
			"git",
			["show", "--stat", "--format=%an%n%ae%n%s%n%b", "feat/test-e2e-runtime"],
			{ cwd: repoPath },
		);
		const status = await execFileAsync("git", ["status", "--short"], {
			cwd: repoPath,
		});
		const headBranch = await execFileAsync(
			"git",
			["rev-parse", "--abbrev-ref", "HEAD"],
			{ cwd: repoPath },
		);

		expect(payload).toMatchObject({
			ok: true,
			status: "executed",
			initialBranch: "main",
			executedGroups: [
				{ id: "group-1", branch: "docs/test-e2e-docs", status: "executed" },
				{
					id: "group-2",
					branch: "feat/test-e2e-runtime",
					status: "executed",
				},
			],
		});
		expect(docsCommit).not.toBe(initialHead);
		expect(runtimeCommit).not.toBe(initialHead);
		expect(docsParent).toBe(initialHead);
		expect(runtimeParent).toBe(initialHead);
		expect(runtimeCommit).not.toBe(docsCommit);
		expect(docsShow.stdout).toContain("OpenClaw Agent");
		expect(docsShow.stdout).toContain("openclaw@example.test");
		expect(docsShow.stdout).toContain(
			"docs(workflow): add e2e execute coverage",
		);
		expect(docsShow.stdout).toContain("docs.md");
		expect(docsShow.stdout).not.toContain("runtime.txt");
		expect(runtimeShow.stdout).toContain("OpenClaw Agent");
		expect(runtimeShow.stdout).toContain("openclaw@example.test");
		expect(runtimeShow.stdout).toContain(
			"feat(workflow): cover confirmed execute e2e",
		);
		expect(runtimeShow.stdout).toContain("runtime.txt");
		expect(runtimeShow.stdout).not.toContain("docs.md");
		expect(status.stdout.trim()).toBe("");
		expect(headBranch.stdout.trim()).toBe("feat/test-e2e-runtime");
	});
});
