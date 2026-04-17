import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type HostPreflightOptions = {
	requireNonMainBranch?: boolean;
	requireGhAuth?: boolean;
};

export type HostPreflight = {
	repoPath: string;
	repoRoot: string;
	gitBin: string;
	ghBin: string;
	currentBranch: string;
	originUrl: string;
	ghAuthStatus: "ready" | "skipped";
};

export function resolveGitBin(): string {
	return process.env.OPENCLAW_HOST_GIT_WORKFLOW_GIT_BIN || "git";
}

export function resolveGhBin(): string {
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

async function assertRepoPathReadable(repoPath: string) {
	try {
		await access(repoPath, constants.R_OK | constants.X_OK);
	} catch {
		throw new Error(`Repository path is not accessible: ${repoPath}`);
	}
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

async function readRepoRoot(repoPath: string): Promise<string> {
	try {
		return await readGit(repoPath, ["rev-parse", "--show-toplevel"]);
	} catch {
		throw new Error("Repository path is not inside a git work tree.");
	}
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

async function assertGhAuthReady(repoPath: string) {
	try {
		await runBinary(resolveGhBin(), ["auth", "status"], repoPath);
	} catch {
		throw new Error(
			"GitHub CLI auth is not ready for bounded host workflow actions.",
		);
	}
}

export async function preflightHostOps(
	repoPath: string,
	options: HostPreflightOptions = {},
): Promise<HostPreflight> {
	const { requireGhAuth = true, requireNonMainBranch = false } = options;

	await assertRepoPathReadable(repoPath);
	await assertBinaryAvailable(resolveGitBin(), repoPath);
	if (requireGhAuth) {
		await assertBinaryAvailable(resolveGhBin(), repoPath);
	}

	const repoRoot = (await readRepoRoot(repoPath)).trim();
	const currentBranch = (await readCurrentBranch(repoPath)).trim();

	if (currentBranch === "" || currentBranch === "HEAD") {
		throw new Error("Current branch is not a named local branch.");
	}

	if (requireNonMainBranch && currentBranch === "main") {
		throw new Error(
			"This host workflow action requires a non-main working branch.",
		);
	}

	const originUrl = (await readOriginUrl(repoPath)).trim();
	if (originUrl === "") {
		throw new Error("Git remote 'origin' is not configured.");
	}

	if (requireGhAuth) {
		await assertGhAuthReady(repoPath);
	}

	return {
		repoPath,
		repoRoot,
		gitBin: resolveGitBin(),
		ghBin: resolveGhBin(),
		currentBranch,
		originUrl,
		ghAuthStatus: requireGhAuth ? "ready" : "skipped",
	};
}
