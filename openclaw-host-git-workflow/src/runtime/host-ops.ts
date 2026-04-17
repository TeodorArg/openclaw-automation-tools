import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type LatestCommit = {
	title: string;
	body: string;
};

export type PushPreflight = {
	repoPath: string;
	currentBranch: string;
	originUrl: string;
};

export type PushResult = PushPreflight & {
	status: "pushed";
	stdout: string;
	stderr: string;
};

export type CreatePrResult = PushPreflight & {
	status: "pr_opened";
	baseBranch: "main";
	prTitle: string;
	prBody: string;
	stdout: string;
	stderr: string;
};

function resolveGitBin(): string {
	return process.env.OPENCLAW_HOST_GIT_WORKFLOW_GIT_BIN || "git";
}

function resolveGhBin(): string {
	return process.env.OPENCLAW_HOST_GIT_WORKFLOW_GH_BIN || "gh";
}

async function runBinary(
	command: string,
	args: string[],
	repoPath: string,
): Promise<{ stdout: string; stderr: string }> {
	const result = await execFileAsync(command, args, {
		cwd: repoPath,
		env: process.env,
	});

	return {
		stdout: result.stdout?.trim() ?? "",
		stderr: result.stderr?.trim() ?? "",
	};
}

async function assertBinaryAvailable(command: string, repoPath: string) {
	try {
		await execFileAsync(command, ["--version"], {
			cwd: repoPath,
			env: process.env,
		});
	} catch {
		throw new Error(`Required binary '${command}' is not available.`);
	}
}

async function readGit(repoPath: string, args: string[]): Promise<string> {
	const result = await runBinary(resolveGitBin(), args, repoPath);
	return result.stdout;
}

async function readCurrentBranch(repoPath: string): Promise<string> {
	return readGit(repoPath, ["rev-parse", "--abbrev-ref", "HEAD"]);
}

async function readOriginUrl(repoPath: string): Promise<string> {
	try {
		return await readGit(repoPath, ["remote", "get-url", "origin"]);
	} catch {
		throw new Error("Git remote 'origin' is not configured.");
	}
}

async function readLatestCommit(repoPath: string): Promise<LatestCommit> {
	const title = await readGit(repoPath, ["log", "-1", "--pretty=%s"]);
	const body = await readGit(repoPath, ["log", "-1", "--pretty=%b"]);

	if (title.trim() === "") {
		throw new Error(
			"Latest commit title is empty; cannot create a bounded PR.",
		);
	}

	return {
		title: title.trim(),
		body: body.trim(),
	};
}

export async function preflightPushPr(
	repoPath: string,
): Promise<PushPreflight> {
	await assertBinaryAvailable(resolveGitBin(), repoPath);
	await assertBinaryAvailable(resolveGhBin(), repoPath);

	const currentBranch = (await readCurrentBranch(repoPath)).trim();
	if (currentBranch === "" || currentBranch === "HEAD") {
		throw new Error("Current branch is not a named local branch.");
	}

	if (currentBranch === "main") {
		throw new Error("Push and PR flow require a non-main working branch.");
	}

	const originUrl = (await readOriginUrl(repoPath)).trim();
	if (originUrl === "") {
		throw new Error("Git remote 'origin' is not configured.");
	}

	try {
		await runBinary(resolveGhBin(), ["auth", "status"], repoPath);
	} catch {
		throw new Error("GitHub CLI auth is not ready for bounded PR creation.");
	}

	return {
		repoPath,
		currentBranch,
		originUrl,
	};
}

export async function pushCurrentBranch(repoPath: string): Promise<PushResult> {
	const preflight = await preflightPushPr(repoPath);
	const result = await runBinary(
		resolveGitBin(),
		["push", "--set-upstream", "origin", preflight.currentBranch],
		repoPath,
	);

	return {
		...preflight,
		status: "pushed",
		stdout: result.stdout,
		stderr: result.stderr,
	};
}

export async function createPullRequest(
	repoPath: string,
): Promise<CreatePrResult> {
	const preflight = await preflightPushPr(repoPath);
	const latestCommit = await readLatestCommit(repoPath);
	const result = await runBinary(
		resolveGhBin(),
		[
			"pr",
			"create",
			"--base",
			"main",
			"--head",
			preflight.currentBranch,
			"--title",
			latestCommit.title,
			"--body",
			latestCommit.body || latestCommit.title,
		],
		repoPath,
	);

	return {
		...preflight,
		status: "pr_opened",
		baseBranch: "main",
		prTitle: latestCommit.title,
		prBody: latestCommit.body || latestCommit.title,
		stdout: result.stdout,
		stderr: result.stderr,
	};
}
