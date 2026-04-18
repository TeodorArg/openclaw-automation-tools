import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { HostCommandRunner } from "../node/execution.js";
import { resolveHostGhBin, resolveHostGitBin } from "./binaries.js";
import { type HostPreflight, preflightHostOps } from "./preflight.js";

const execFileAsync = promisify(execFile);

export type LatestCommit = {
	title: string;
	body: string;
};

export type PushPreflight = HostPreflight;

export type EnterBranchResult = HostPreflight & {
	status: "entered_branch";
	requestedBranch: string;
	startingBranch: string;
	currentBranch: string;
	branchCreated: boolean;
	carriedUncommittedChanges: boolean;
	entryMode:
		| "created_and_checked_out"
		| "checked_out_existing"
		| "already_on_branch";
	stdout: string;
	stderr: string;
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

export type CurrentPullRequest = {
	number: number;
	url: string;
	headRefName: string;
	baseRefName: string;
	state: "OPEN" | "CLOSED" | "MERGED";
};

export type WaitForChecksResult = PushPreflight & {
	status: "checks_passed";
	prNumber: number;
	prUrl: string;
	baseBranch: "main";
	checkScope: "required";
	watchMode: "poll_until_complete";
	watchIntervalSeconds: number;
	stdout: string;
	stderr: string;
};

export type MergePrResult = PushPreflight & {
	status: "merged";
	prNumber: number;
	prUrl: string;
	baseBranch: "main";
	mergeMethod: "merge";
	headCommitSha: string;
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

const CHECKS_WATCH_INTERVAL_SECONDS = 10;

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

function createLocalCommandRunner(): HostCommandRunner {
	return {
		run(command, args, options) {
			return runBinary(command, args, options.cwd);
		},
	};
}

async function readLatestCommit(
	repoPath: string,
	runner: HostCommandRunner,
): Promise<LatestCommit> {
	const commit = await runner.run(
		resolveHostGitBin(),
		["cat-file", "-p", "HEAD"],
		{
			cwd: repoPath,
		},
	);
	const raw = commit.stdout.replace(/\r\n/g, "\n");
	const message = raw.includes("\n\n") ? raw.slice(raw.indexOf("\n\n") + 2) : "";
	const [titleLine = "", ...bodyLines] = message.split("\n");
	const title = titleLine.trim();
	const body = bodyLines.join("\n").trim();

	if (title === "") {
		throw new Error(
			"Latest commit title is empty; cannot create a bounded PR.",
		);
	}

	return {
		title,
		body,
	};
}

async function readHeadCommitSha(
	repoPath: string,
	runner: HostCommandRunner,
): Promise<string> {
	const sha = await runner.run(resolveHostGitBin(), ["rev-parse", "HEAD"], {
		cwd: repoPath,
	});

	if (sha.stdout.trim() === "") {
		throw new Error("Failed to resolve HEAD commit SHA for bounded PR merge.");
	}

	return sha.stdout.trim();
}

async function assertCleanWorktree(
	repoPath: string,
	runner: HostCommandRunner,
	context: string,
) {
	if (await hasWorktreeChanges(repoPath, runner)) {
		throw new Error(`Working tree must be clean before ${context}.`);
	}
}

async function hasWorktreeChanges(
	repoPath: string,
	runner: HostCommandRunner,
): Promise<boolean> {
	const status = await runner.run(resolveHostGitBin(), ["status", "--short"], {
		cwd: repoPath,
	});
	return status.stdout.trim() !== "";
}

async function localBranchExists(
	repoPath: string,
	branchName: string,
	runner: HostCommandRunner,
): Promise<boolean> {
	try {
		await runner.run(
			resolveHostGitBin(),
			["rev-parse", "--verify", `refs/heads/${branchName}`],
			{ cwd: repoPath },
		);
		return true;
	} catch {
		return false;
	}
}

async function assertValidWorkingBranchName(
	repoPath: string,
	branchName: string,
	runner: HostCommandRunner,
) {
	const normalizedBranch = branchName.trim();

	if (normalizedBranch === "") {
		throw new Error("branchName is required for bounded branch entry.");
	}

	if (normalizedBranch === "main") {
		throw new Error("Bounded branch entry requires a non-main working branch.");
	}

	try {
		await runner.run(
			resolveHostGitBin(),
			["check-ref-format", "--branch", normalizedBranch],
			{ cwd: repoPath },
		);
	} catch {
		throw new Error(`Invalid git branch name: ${normalizedBranch}`);
	}
}

export async function enterWorkingBranch(
	repoPath: string,
	branchName: string,
	runner: HostCommandRunner = createLocalCommandRunner(),
): Promise<EnterBranchResult> {
	await assertValidWorkingBranchName(repoPath, branchName, runner);

	const preflight = await preflightHostOps(
		repoPath,
		{
			requireGhAuth: false,
			requireNonMainBranch: false,
		},
		runner,
	);
	const requestedBranch = branchName.trim();
	const branchExists = await localBranchExists(
		repoPath,
		requestedBranch,
		runner,
	);
	const worktreeDirty = await hasWorktreeChanges(repoPath, runner);

	if (preflight.currentBranch === requestedBranch) {
		return {
			...preflight,
			status: "entered_branch",
			requestedBranch,
			startingBranch: preflight.currentBranch,
			currentBranch: requestedBranch,
			branchCreated: false,
			carriedUncommittedChanges: false,
			entryMode: "already_on_branch",
			stdout: "",
			stderr: "",
		};
	}

	if (worktreeDirty && (preflight.currentBranch !== "main" || branchExists)) {
		throw new Error(
			"Working tree must be clean before bounded branch entry can switch branches; only main -> new branch creation may carry uncommitted changes.",
		);
	}

	const args = branchExists
		? ["checkout", requestedBranch]
		: ["checkout", "-b", requestedBranch];
	const result = await runner.run(resolveHostGitBin(), args, {
		cwd: repoPath,
	});

	return {
		...preflight,
		status: "entered_branch",
		requestedBranch,
		startingBranch: preflight.currentBranch,
		currentBranch: requestedBranch,
		branchCreated: !branchExists,
		carriedUncommittedChanges: worktreeDirty,
		entryMode: branchExists
			? "checked_out_existing"
			: "created_and_checked_out",
		stdout: result.stdout,
		stderr: result.stderr,
	};
}

export async function preflightPushPr(
	repoPath: string,
	runner: HostCommandRunner = createLocalCommandRunner(),
): Promise<PushPreflight> {
	return preflightHostOps(
		repoPath,
		{
			requireGhAuth: true,
			requireNonMainBranch: true,
		},
		runner,
	);
}

export async function pushCurrentBranch(
	repoPath: string,
	runner: HostCommandRunner = createLocalCommandRunner(),
): Promise<PushResult> {
	const preflight = await preflightPushPr(repoPath, runner);
	const result = await runner.run(
		resolveHostGitBin(),
		["push", "--set-upstream", "origin", preflight.currentBranch],
		{ cwd: repoPath },
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
	runner: HostCommandRunner = createLocalCommandRunner(),
): Promise<CreatePrResult> {
	const preflight = await preflightPushPr(repoPath, runner);
	const latestCommit = await readLatestCommit(repoPath, runner);
	const result = await runner.run(
		resolveHostGhBin(),
		[
			"pr",
			"create",
			"--base",
			"main",
			"--head",
			preflight.currentBranch,
			"--fill-verbose",
		],
		{ cwd: repoPath },
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

async function readCurrentPullRequest(
	repoPath: string,
	currentBranch: string,
	runner: HostCommandRunner,
): Promise<CurrentPullRequest> {
	const result = await runner.run(
		resolveHostGhBin(),
		[
			"pr",
			"view",
			currentBranch,
			"--json",
			"number,url,headRefName,baseRefName,state",
		],
		{ cwd: repoPath },
	);
	const pr = JSON.parse(result.stdout) as CurrentPullRequest;

	if (pr.headRefName !== currentBranch) {
		throw new Error(
			`Bounded PR lookup resolved head ${pr.headRefName} instead of current branch ${currentBranch}.`,
		);
	}

	if (pr.baseRefName !== "main") {
		throw new Error(
			`Bounded PR actions require base branch main, received ${pr.baseRefName}.`,
		);
	}

	if (pr.state !== "OPEN") {
		throw new Error(
			`Bounded PR actions require an open pull request, received state ${pr.state}.`,
		);
	}

	return pr;
}

export async function waitForPullRequestChecks(
	repoPath: string,
	runner: HostCommandRunner = createLocalCommandRunner(),
): Promise<WaitForChecksResult> {
	const preflight = await preflightPushPr(repoPath, runner);
	const pullRequest = await readCurrentPullRequest(
		repoPath,
		preflight.currentBranch,
		runner,
	);
	const result = await runner.run(
		resolveHostGhBin(),
		[
			"pr",
			"checks",
			String(pullRequest.number),
			"--required",
			"--watch",
			"--interval",
			String(CHECKS_WATCH_INTERVAL_SECONDS),
		],
		{ cwd: repoPath },
	);

	return {
		...preflight,
		status: "checks_passed",
		prNumber: pullRequest.number,
		prUrl: pullRequest.url,
		baseBranch: "main",
		checkScope: "required",
		watchMode: "poll_until_complete",
		watchIntervalSeconds: CHECKS_WATCH_INTERVAL_SECONDS,
		stdout: result.stdout,
		stderr: result.stderr,
	};
}

export async function mergePullRequest(
	repoPath: string,
	runner: HostCommandRunner = createLocalCommandRunner(),
): Promise<MergePrResult> {
	const preflight = await preflightPushPr(repoPath, runner);
	const pullRequest = await readCurrentPullRequest(
		repoPath,
		preflight.currentBranch,
		runner,
	);
	const headCommitSha = await readHeadCommitSha(repoPath, runner);
	const result = await runner.run(
		resolveHostGhBin(),
		[
			"pr",
			"merge",
			String(pullRequest.number),
			"--merge",
			"--match-head-commit",
			headCommitSha,
		],
		{ cwd: repoPath },
	);

	return {
		...preflight,
		status: "merged",
		prNumber: pullRequest.number,
		prUrl: pullRequest.url,
		baseBranch: "main",
		mergeMethod: "merge",
		headCommitSha,
		stdout: result.stdout,
		stderr: result.stderr,
	};
}

export async function syncMainBranch(
	repoPath: string,
	runner: HostCommandRunner = createLocalCommandRunner(),
): Promise<SyncMainResult> {
	const preflight = await preflightHostOps(
		repoPath,
		{
			requireGhAuth: false,
			requireNonMainBranch: false,
		},
		runner,
	);

	await assertCleanWorktree(
		repoPath,
		runner,
		"bounded sync_main can update local main",
	);
	await runner.run(resolveHostGitBin(), ["fetch", "origin", "main"], {
		cwd: repoPath,
	});

	const mainExists = await localBranchExists(repoPath, "main", runner);
	if (!mainExists) {
		const createResult = await runner.run(
			resolveHostGitBin(),
			["checkout", "-b", "main", "--track", "origin/main"],
			{ cwd: repoPath },
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

	const checkoutResult = await runner.run(
		resolveHostGitBin(),
		["checkout", "main"],
		{ cwd: repoPath },
	);
	const mergeResult = await runner.run(
		resolveHostGitBin(),
		["merge", "--ff-only", "origin/main"],
		{ cwd: repoPath },
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
