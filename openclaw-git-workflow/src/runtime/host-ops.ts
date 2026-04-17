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

export type CheckBucket = "pass" | "fail" | "pending" | "skipping" | "cancel";

export type RequiredCheck = {
	name: string;
	state: string;
	bucket: CheckBucket;
	link?: string;
	description?: string;
	event?: string;
	workflow?: string;
	startedAt?: string;
	completedAt?: string;
};

export type WaitForChecksResult = PushPreflight & {
	status: "checks_passed" | "checks_failed";
	polls: number;
	checks: RequiredCheck[];
};

export type MergePrResult = PushPreflight & {
	status: "merged";
	baseBranch: "main";
	stdout: string;
	stderr: string;
};

export type SyncMainResult = {
	repoPath: string;
	status: "main_synced";
	currentBranch: "main";
	originUrl: string;
	stdout: string;
	stderr: string;
};

function resolveGitBin(): string {
	return process.env.OPENCLAW_GIT_WORKFLOW_GIT_BIN || "git";
}

function resolveGhBin(): string {
	return process.env.OPENCLAW_GIT_WORKFLOW_GH_BIN || "gh";
}

function resolveChecksIntervalMs(): number {
	const raw = process.env.OPENCLAW_GIT_WORKFLOW_CHECKS_INTERVAL_MS;
	const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

	if (!Number.isFinite(parsed) || parsed < 0) {
		return 10_000;
	}

	return parsed;
}

async function sleep(ms: number) {
	if (ms <= 0) {
		return;
	}

	await new Promise((resolve) => setTimeout(resolve, ms));
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

async function ensureCleanWorktree(repoPath: string) {
	const status = await readGit(repoPath, ["status", "--short"]);

	if (status.trim() !== "") {
		throw new Error(
			"Working tree is not clean; sync_main requires no local changes.",
		);
	}
}

async function readRequiredChecks(repoPath: string): Promise<RequiredCheck[]> {
	const result = await runBinary(
		resolveGhBin(),
		[
			"pr",
			"checks",
			"--required",
			"--json",
			"bucket,completedAt,description,event,link,name,startedAt,state,workflow",
		],
		repoPath,
	);

	try {
		return JSON.parse(result.stdout) as RequiredCheck[];
	} catch {
		throw new Error("Failed to parse required check status from GitHub CLI.");
	}
}

function summarizeChecks(checks: RequiredCheck[]) {
	const hasFailing = checks.some(
		(check) => check.bucket === "fail" || check.bucket === "cancel",
	);
	const hasPending = checks.some((check) => check.bucket === "pending");

	if (hasFailing) {
		return "checks_failed" as const;
	}

	if (hasPending) {
		return "pending" as const;
	}

	return "checks_passed" as const;
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

export async function waitForChecks(
	repoPath: string,
): Promise<WaitForChecksResult> {
	const preflight = await preflightPushPr(repoPath);
	const pollIntervalMs = resolveChecksIntervalMs();
	let polls = 0;

	for (;;) {
		if (polls > 0) {
			await sleep(pollIntervalMs);
		}

		const checks = await readRequiredChecks(repoPath);
		polls += 1;
		const summary = summarizeChecks(checks);

		if (summary === "pending") {
			continue;
		}

		return {
			...preflight,
			status: summary,
			polls,
			checks,
		};
	}
}

export async function mergePullRequest(
	repoPath: string,
): Promise<MergePrResult> {
	const preflight = await preflightPushPr(repoPath);
	const checksResult = await waitForChecks(repoPath);

	if (checksResult.status !== "checks_passed") {
		throw new Error("Required checks did not pass; merge_pr cannot continue.");
	}

	const result = await runBinary(
		resolveGhBin(),
		["pr", "merge", "--squash", "--delete-branch"],
		repoPath,
	);

	return {
		...preflight,
		status: "merged",
		baseBranch: "main",
		stdout: result.stdout,
		stderr: result.stderr,
	};
}

export async function syncMain(repoPath: string): Promise<SyncMainResult> {
	await assertBinaryAvailable(resolveGitBin(), repoPath);
	await ensureCleanWorktree(repoPath);

	const originUrl = (await readOriginUrl(repoPath)).trim();
	if (originUrl === "") {
		throw new Error("Git remote 'origin' is not configured.");
	}

	await runBinary(resolveGitBin(), ["switch", "main"], repoPath);
	const result = await runBinary(
		resolveGitBin(),
		["pull", "--ff-only", "origin", "main"],
		repoPath,
	);

	return {
		repoPath,
		status: "main_synced",
		currentBranch: "main",
		originUrl,
		stdout: result.stdout,
		stderr: result.stderr,
	};
}
