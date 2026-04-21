import type { HostCommandRunner } from "../node/execution.js";
import { resolveHostGhBin, resolveHostGitBin } from "./binaries.js";

export type HostPreflightOptions = {
	requireNonMainBranch?: boolean;
	requireGhAuth?: boolean;
	requireRemotePushReadiness?: boolean;
};

export type HostRemoteReadiness = {
	protocol: "ssh" | "https" | "other";
	sshAuthStatus: "ready" | "blocked" | "skipped";
	knownHostsStatus: "ready" | "blocked" | "skipped";
	issues: string[];
	remediationCommands: string[];
	githubRepoStatus: "ready" | "blocked";
	githubRepoSlug: string | null;
	ghRepoAccessStatus: "ready" | "blocked" | "skipped";
	existingPullRequest: {
		number: number;
		url: string;
		headRefName: string;
		baseRefName: string;
		state: "OPEN" | "CLOSED" | "MERGED";
	} | null;
};

export type HostPreflightBlocker = {
	code:
		| "repo_not_git"
		| "origin_missing"
		| "branch_invalid"
		| "github_auth"
		| "remote_not_github"
		| "remote_transport"
		| "gh_repo_access"
		| "ssh_readiness";
	message: string;
	remediation: string[];
};

export type HostPreflight = {
	repoPath: string;
	repoRoot: string;
	gitBin: string;
	ghBin: string;
	currentBranch: string;
	originUrl: string;
	ghAuthStatus: "ready" | "skipped";
	remoteReadiness: HostRemoteReadiness;
	blocker: HostPreflightBlocker | null;
};

export class HostWorkflowBlockerError extends Error {
	readonly blocker: HostPreflightBlocker;

	constructor(blocker: HostPreflightBlocker) {
		super(
			[
				blocker.message,
				blocker.remediation.length > 0
					? `Run on the host:\n${blocker.remediation.map((command) => `- ${command}`).join("\n")}`
					: "",
				`Blocker code: ${blocker.code}`,
			]
				.filter(Boolean)
				.join("\n"),
		);
		this.name = "HostWorkflowBlockerError";
		this.blocker = blocker;
	}
}

export function isHostWorkflowBlockerError(
	error: unknown,
): error is HostWorkflowBlockerError {
	return error instanceof HostWorkflowBlockerError;
}

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

function classifyOriginProtocol(originUrl: string): "ssh" | "https" | "other" {
	if (
		originUrl.startsWith("git@github.com:") ||
		originUrl.startsWith("ssh://git@github.com/")
	) {
		return "ssh";
	}

	if (originUrl.startsWith("https://github.com/")) {
		return "https";
	}

	return "other";
}

function parseGithubRepoSlug(originUrl: string): string | null {
	const sshMatch = originUrl.match(/^git@github\.com:(.+?)(?:\.git)?$/);
	if (sshMatch) {
		return sshMatch[1];
	}

	const httpsMatch = originUrl.match(
		/^https:\/\/github\.com\/(.+?)(?:\.git)?$/,
	);
	if (httpsMatch) {
		return httpsMatch[1];
	}

	const sshUrlMatch = originUrl.match(
		/^ssh:\/\/git@github\.com\/(.+?)(?:\.git)?$/,
	);
	if (sshUrlMatch) {
		return sshUrlMatch[1];
	}

	return null;
}

async function checkGithubSshAuth(
	repoPath: string,
	runner: HostCommandRunner,
): Promise<{ status: "ready" | "blocked"; issue?: string }> {
	function readCombinedOutput(error: unknown, fallback: string): string {
		if (!error || typeof error !== "object") {
			return fallback;
		}

		const candidate = error as {
			message?: string;
			stdout?: unknown;
			stderr?: unknown;
		};
		return [candidate.stdout, candidate.stderr, candidate.message, fallback]
			.filter(
				(value): value is string => typeof value === "string" && value !== "",
			)
			.join("\n");
	}

	try {
		const result = await runner.run("ssh", ["-T", "git@github.com"], {
			cwd: repoPath,
			timeoutMs: 15000,
		});
		const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
		if (
			combined.includes("successfully authenticated") ||
			combined.includes("does not provide shell access")
		) {
			return { status: "ready" };
		}
		return {
			status: "blocked",
			issue:
				combined.trim() || "SSH auth to github.com did not report success.",
		};
	} catch (error) {
		const message = readCombinedOutput(error, String(error));
		if (
			message.includes("successfully authenticated") ||
			message.includes("does not provide shell access")
		) {
			return { status: "ready" };
		}
		return { status: "blocked", issue: message };
	}
}

async function assertGhRepoAccess(
	repoPath: string,
	repoSlug: string,
	runner: HostCommandRunner,
): Promise<void> {
	try {
		await runner.run(
			resolveHostGhBin(),
			["repo", "view", repoSlug, "--json", "nameWithOwner"],
			{ cwd: repoPath },
		);
	} catch {
		throw new Error(
			`GitHub CLI cannot read repo metadata for ${repoSlug} from the bound host node.`,
		);
	}
}

export async function lookupExistingPullRequest(
	repoPath: string,
	currentBranch: string,
	runner: HostCommandRunner,
): Promise<HostRemoteReadiness["existingPullRequest"]> {
	try {
		const result = await runner.run(
			resolveHostGhBin(),
			[
				"pr",
				"list",
				"--head",
				currentBranch,
				"--base",
				"main",
				"--state",
				"open",
				"--json",
				"number,url,headRefName,baseRefName,state",
				"--limit",
				"2",
			],
			{ cwd: repoPath },
		);
		const payload = JSON.parse(result.stdout) as Array<{
			number?: number;
			url?: string;
			headRefName?: string;
			baseRefName?: string;
			state?: "OPEN" | "CLOSED" | "MERGED";
		}>;
		if (!Array.isArray(payload) || payload.length === 0) {
			return null;
		}
		const candidate = payload.find(
			(entry) =>
				typeof entry.number === "number" &&
				typeof entry.url === "string" &&
				entry.headRefName === currentBranch &&
				entry.baseRefName === "main" &&
				entry.state === "OPEN",
		);
		if (!candidate) {
			return null;
		}
		return {
			number: candidate.number as number,
			url: candidate.url as string,
			headRefName: candidate.headRefName as string,
			baseRefName: candidate.baseRefName as string,
			state: candidate.state as "OPEN",
		};
	} catch {
		return null;
	}
}

function buildRemoteReadiness(params: {
	originUrl: string;
	sshAuthIssue?: string;
	repoSlug: string | null;
	ghRepoAccessIssue?: string;
	existingPullRequest: HostRemoteReadiness["existingPullRequest"];
}): HostRemoteReadiness {
	const protocol = classifyOriginProtocol(params.originUrl);
	const remediationCommands: string[] = [];
	const issues: string[] = [];
	const githubRepoStatus = params.repoSlug ? "ready" : "blocked";
	const ghRepoAccessStatus = params.repoSlug
		? params.ghRepoAccessIssue
			? "blocked"
			: "ready"
		: "skipped";

	if (!params.repoSlug) {
		issues.push(
			"Git remote origin does not resolve to a supported GitHub repository, so bounded push/PR readiness cannot proceed.",
		);
		remediationCommands.push("git remote -v");
		return {
			protocol,
			sshAuthStatus: "skipped",
			knownHostsStatus: "skipped",
			issues,
			remediationCommands,
			githubRepoStatus,
			githubRepoSlug: null,
			ghRepoAccessStatus,
			existingPullRequest: params.existingPullRequest,
		};
	}

	if (params.ghRepoAccessIssue) {
		issues.push(params.ghRepoAccessIssue);
		remediationCommands.push(
			`gh repo view ${params.repoSlug} --json nameWithOwner`,
		);
	}

	if (protocol === "https") {
		issues.push(
			"Git remote origin uses HTTPS, so bounded host push/PR actions may fail if the host runner has no HTTPS credential flow.",
		);
		remediationCommands.push(
			"git remote -v",
			"git remote set-url origin git@github.com:<owner>/<repo>.git",
			"git remote -v",
			"ssh -T git@github.com",
		);
		return {
			protocol,
			sshAuthStatus: "skipped",
			knownHostsStatus: "skipped",
			issues,
			remediationCommands,
			githubRepoStatus,
			githubRepoSlug: params.repoSlug,
			ghRepoAccessStatus,
			existingPullRequest: params.existingPullRequest,
		};
	}

	if (protocol === "ssh") {
		if (params.sshAuthIssue) {
			issues.push(
				"SSH auth or host trust for github.com is not ready for bounded host push/PR actions.",
			);
			issues.push(params.sshAuthIssue);
			if (params.sshAuthIssue.includes("Host key verification failed")) {
				remediationCommands.push(
					"ssh -T git@github.com",
					"ssh-keyscan github.com >> ~/.ssh/known_hosts",
					"ssh -T git@github.com",
					"git ls-remote --heads origin",
				);
			} else if (
				params.sshAuthIssue.includes("Permission denied (publickey)")
			) {
				remediationCommands.push(
					"ls -la ~/.ssh",
					"ssh -vT git@github.com",
					"docker cp ~/.ssh/<working_github_key> <container>:/home/node/.ssh/id_ed25519",
					"docker cp ~/.ssh/<working_github_key>.pub <container>:/home/node/.ssh/id_ed25519.pub",
					"docker exec -u 0 <container> sh -lc 'chown -R node:node /home/node/.ssh && chmod 700 /home/node/.ssh && chmod 600 /home/node/.ssh/id_ed25519 /home/node/.ssh/config /home/node/.ssh/known_hosts && chmod 644 /home/node/.ssh/id_ed25519.pub'",
					"docker exec -u node <container> sh -lc 'HOME=/home/node ssh -T git@github.com'",
					"docker exec -u node <container> sh -lc 'HOME=/home/node git -C /home/node/tools ls-remote --heads origin | sed -n \"1,10p\"'",
				);
			} else {
				remediationCommands.push(
					"ssh -T git@github.com",
					"ssh-keyscan github.com >> ~/.ssh/known_hosts",
					"ssh-add ~/.ssh/<working_github_key>",
				);
			}
			return {
				protocol,
				sshAuthStatus: "blocked",
				knownHostsStatus: params.sshAuthIssue.includes(
					"Host key verification failed",
				)
					? "blocked"
					: "ready",
				issues,
				remediationCommands,
				githubRepoStatus,
				githubRepoSlug: params.repoSlug,
				ghRepoAccessStatus,
				existingPullRequest: params.existingPullRequest,
			};
		}

		return {
			protocol,
			sshAuthStatus: "ready",
			knownHostsStatus: "ready",
			issues,
			remediationCommands,
			githubRepoStatus,
			githubRepoSlug: params.repoSlug,
			ghRepoAccessStatus,
			existingPullRequest: params.existingPullRequest,
		};
	}

	issues.push(
		"Git remote origin does not use a recognized GitHub SSH or HTTPS format, so bounded push/PR readiness cannot be trusted.",
	);
	remediationCommands.push("git remote -v");
	return {
		protocol,
		sshAuthStatus: "skipped",
		knownHostsStatus: "skipped",
		issues,
		remediationCommands,
		githubRepoStatus,
		githubRepoSlug: params.repoSlug,
		ghRepoAccessStatus,
		existingPullRequest: params.existingPullRequest,
	};
}

function buildBlocker(
	code: HostPreflightBlocker["code"],
	message: string,
	remediation: string[],
): HostPreflightBlocker {
	return {
		code,
		message,
		remediation,
	};
}

function throwBlocker(blocker: HostPreflightBlocker): never {
	throw new HostWorkflowBlockerError(blocker);
}

export async function preflightHostOps(
	repoPath: string,
	options: HostPreflightOptions = {},
	runner: HostCommandRunner,
): Promise<HostPreflight> {
	const {
		requireGhAuth = true,
		requireNonMainBranch = false,
		requireRemotePushReadiness = false,
	} = options;

	await assertBinaryAvailable(resolveHostGitBin(), repoPath, runner);
	if (requireGhAuth) {
		await assertBinaryAvailable(resolveHostGhBin(), repoPath, runner);
	}

	let repoRoot: string;
	try {
		repoRoot = (await readRepoRoot(repoPath, runner)).trim();
	} catch {
		throwBlocker(
			buildBlocker(
				"repo_not_git",
				"Repository path is not inside a git work tree.",
				["git rev-parse --show-toplevel"],
			),
		);
	}
	const currentBranch = (await readCurrentBranch(repoPath, runner)).trim();

	if (currentBranch === "" || currentBranch === "HEAD") {
		throwBlocker(
			buildBlocker(
				"branch_invalid",
				"Current branch is not a named local branch.",
				["git status -sb", "git checkout <non-main-branch>"],
			),
		);
	}

	if (requireNonMainBranch && currentBranch === "main") {
		throwBlocker(
			buildBlocker(
				"branch_invalid",
				"This host workflow action requires a non-main working branch.",
				["git checkout <non-main-branch>"],
			),
		);
	}

	let originUrl: string;
	try {
		originUrl = (await readOriginUrl(repoPath, runner)).trim();
	} catch {
		throwBlocker(
			buildBlocker("origin_missing", "Git remote 'origin' is not configured.", [
				"git remote -v",
				"git remote add origin <github-repo-url>",
			]),
		);
	}
	if (originUrl === "") {
		throwBlocker(
			buildBlocker("origin_missing", "Git remote 'origin' is not configured.", [
				"git remote -v",
				"git remote add origin <github-repo-url>",
			]),
		);
	}

	if (requireGhAuth) {
		try {
			await assertGhAuthReady(repoPath, runner);
		} catch {
			throwBlocker(
				buildBlocker(
					"github_auth",
					"GitHub CLI auth is not ready for bounded host workflow actions.",
					["gh auth status", "gh auth login"],
				),
			);
		}
	}

	const repoSlug = parseGithubRepoSlug(originUrl);
	let ghRepoAccessIssue: string | undefined;
	if (requireRemotePushReadiness && repoSlug && requireGhAuth) {
		try {
			await assertGhRepoAccess(repoPath, repoSlug, runner);
		} catch (error) {
			ghRepoAccessIssue =
				error instanceof Error ? error.message : String(error);
		}
	}

	let sshAuthIssue: string | undefined;
	if (
		requireRemotePushReadiness &&
		classifyOriginProtocol(originUrl) === "ssh"
	) {
		const sshAuth = await checkGithubSshAuth(repoPath, runner);
		if (sshAuth.status === "blocked") {
			sshAuthIssue = sshAuth.issue;
		}
	}

	const existingPullRequest =
		requireGhAuth && currentBranch !== "main"
			? await lookupExistingPullRequest(repoPath, currentBranch, runner)
			: null;

	const remoteReadiness = buildRemoteReadiness({
		originUrl,
		sshAuthIssue,
		repoSlug,
		ghRepoAccessIssue,
		existingPullRequest,
	});

	let blocker: HostPreflightBlocker | null = null;
	if (requireRemotePushReadiness && remoteReadiness.issues.length > 0) {
		blocker = !repoSlug
			? buildBlocker(
					"remote_not_github",
					"Remote push/PR readiness is blocked because origin is not a supported GitHub remote.",
					remoteReadiness.remediationCommands,
				)
			: remoteReadiness.protocol === "https"
				? buildBlocker(
						"remote_transport",
						"Remote push/PR readiness is blocked because origin uses HTTPS instead of the bounded GitHub SSH transport expected for host-backed execution.",
						remoteReadiness.remediationCommands,
					)
				: ghRepoAccessIssue
					? buildBlocker(
							"gh_repo_access",
							"Remote push/PR readiness is blocked because GitHub CLI cannot read the target repo from the bound host node.",
							remoteReadiness.remediationCommands,
						)
					: sshAuthIssue
						? buildBlocker(
								"ssh_readiness",
								"Remote push/PR readiness is blocked because SSH trust or auth to github.com is not ready on the bound host node.",
								remoteReadiness.remediationCommands,
							)
						: buildBlocker(
								"remote_transport",
								"Remote push/PR readiness did not pass.",
								remoteReadiness.remediationCommands,
							);
		throwBlocker(blocker);
	}

	return {
		repoPath,
		repoRoot,
		gitBin: resolveHostGitBin(),
		ghBin: resolveHostGhBin(),
		currentBranch,
		originUrl,
		ghAuthStatus: requireGhAuth ? "ready" : "skipped",
		remoteReadiness,
		blocker,
	};
}
