import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { type HostPreflight, preflightHostOps } from "./preflight.js";

const execFileAsync = promisify(execFile);

export type LatestCommit = {
	title: string;
	body: string;
};

export type PushPreflight = HostPreflight;

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

export type SyncMainResult = HostPreflight & {
	status: "synced_main";
	baseBranch: "main";
	startingBranch: string;
	currentBranch: "main";
	localBranchCreated: boolean;
	syncMode: "checkout_and_fast_forward" | "create_and_track";
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

async function readGit(repoPath: string, args: string[]): Promise<string> {
	const result = await runBinary(resolveGitBin(), args, repoPath);
	return result.stdout;
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

async function assertCleanWorktree(repoPath: string) {
	const status = await readGit(repoPath, ["status", "--short"]);
	if (status.trim() !== "") {
		throw new Error(
			"Working tree must be clean before bounded sync_main can update local main.",
		);
	}
}

async function localBranchExists(
	repoPath: string,
	branchName: string,
): Promise<boolean> {
	try {
		await readGit(repoPath, [
			"rev-parse",
			"--verify",
			`refs/heads/${branchName}`,
		]);
		return true;
	} catch {
		return false;
	}
}

export async function preflightPushPr(
	repoPath: string,
): Promise<PushPreflight> {
	return preflightHostOps(repoPath, {
		requireGhAuth: true,
		requireNonMainBranch: true,
	});
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

export async function syncMainBranch(
	repoPath: string,
): Promise<SyncMainResult> {
	const preflight = await preflightHostOps(repoPath, {
		requireGhAuth: false,
		requireNonMainBranch: false,
	});

	await assertCleanWorktree(repoPath);
	await runBinary(resolveGitBin(), ["fetch", "origin", "main"], repoPath);

	const mainExists = await localBranchExists(repoPath, "main");
	if (!mainExists) {
		const createResult = await runBinary(
			resolveGitBin(),
			["checkout", "-b", "main", "--track", "origin/main"],
			repoPath,
		);

		return {
			...preflight,
			status: "synced_main",
			baseBranch: "main",
			startingBranch: preflight.currentBranch,
			currentBranch: "main",
			localBranchCreated: true,
			syncMode: "create_and_track",
			stdout: createResult.stdout,
			stderr: createResult.stderr,
		};
	}

	const checkoutResult = await runBinary(
		resolveGitBin(),
		["checkout", "main"],
		repoPath,
	);
	const mergeResult = await runBinary(
		resolveGitBin(),
		["merge", "--ff-only", "origin/main"],
		repoPath,
	);

	return {
		...preflight,
		status: "synced_main",
		baseBranch: "main",
		startingBranch: preflight.currentBranch,
		currentBranch: "main",
		localBranchCreated: false,
		syncMode: "checkout_and_fast_forward",
		stdout: [checkoutResult.stdout, mergeResult.stdout]
			.filter((value) => value !== "")
			.join("\n")
			.trim(),
		stderr: [checkoutResult.stderr, mergeResult.stderr]
			.filter((value) => value !== "")
			.join("\n")
			.trim(),
	};
}
