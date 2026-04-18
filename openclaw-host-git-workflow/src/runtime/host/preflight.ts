import type { HostCommandRunner } from "../node/execution.js";
import { resolveHostGhBin, resolveHostGitBin } from "./binaries.js";

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

async function assertBinaryAvailable(
	command: string,
	repoPath: string,
	runner: HostCommandRunner,
) {
	try {
		await runner.run(command, ["--version"], { cwd: repoPath });
	} catch {
		throw new Error(`Required binary '${command}' is not available.`);
	}
}

async function readGit(
	repoPath: string,
	args: string[],
	runner: HostCommandRunner,
): Promise<string> {
	const result = await runner.run(resolveHostGitBin(), args, {
		cwd: repoPath,
	});
	return result.stdout;
}

async function readRepoRoot(
	repoPath: string,
	runner: HostCommandRunner,
): Promise<string> {
	try {
		return await readGit(repoPath, ["rev-parse", "--show-toplevel"], runner);
	} catch {
		throw new Error("Repository path is not inside a git work tree.");
	}
}

async function readCurrentBranch(
	repoPath: string,
	runner: HostCommandRunner,
): Promise<string> {
	return readGit(repoPath, ["rev-parse", "--abbrev-ref", "HEAD"], runner);
}

async function readOriginUrl(
	repoPath: string,
	runner: HostCommandRunner,
): Promise<string> {
	try {
		return await readGit(repoPath, ["remote", "get-url", "origin"], runner);
	} catch {
		throw new Error("Git remote 'origin' is not configured.");
	}
}

async function assertGhAuthReady(repoPath: string, runner: HostCommandRunner) {
	try {
		await runner.run(resolveHostGhBin(), ["auth", "status"], {
			cwd: repoPath,
		});
	} catch {
		throw new Error(
			"GitHub CLI auth is not ready for bounded host workflow actions.",
		);
	}
}

export async function preflightHostOps(
	repoPath: string,
	options: HostPreflightOptions = {},
	runner: HostCommandRunner,
): Promise<HostPreflight> {
	const { requireGhAuth = true, requireNonMainBranch = false } = options;

	await assertBinaryAvailable(resolveHostGitBin(), repoPath, runner);
	if (requireGhAuth) {
		await assertBinaryAvailable(resolveHostGhBin(), repoPath, runner);
	}

	const repoRoot = (await readRepoRoot(repoPath, runner)).trim();
	const currentBranch = (await readCurrentBranch(repoPath, runner)).trim();

	if (currentBranch === "" || currentBranch === "HEAD") {
		throw new Error("Current branch is not a named local branch.");
	}

	if (requireNonMainBranch && currentBranch === "main") {
		throw new Error(
			"This host workflow action requires a non-main working branch.",
		);
	}

	const originUrl = (await readOriginUrl(repoPath, runner)).trim();
	if (originUrl === "") {
		throw new Error("Git remote 'origin' is not configured.");
	}

	if (requireGhAuth) {
		await assertGhAuthReady(repoPath, runner);
	}

	return {
		repoPath,
		repoRoot,
		gitBin: resolveHostGitBin(),
		ghBin: resolveHostGhBin(),
		currentBranch,
		originUrl,
		ghAuthStatus: requireGhAuth ? "ready" : "skipped",
	};
}
