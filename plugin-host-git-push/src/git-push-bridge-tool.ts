import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { Type } from "@sinclair/typebox";
import { resolveWorkflowIntent } from "./intent-routing.js";

const execFileAsync = promisify(execFile);
const DEFAULT_CORE_REPO = "/home/node/project";
const DEFAULT_TARGET_REPO = "/home/node/repos/openclaw-git-workflow";
const DEFAULT_SPOOL_ROOT = "/home/node/.openclaw/host-jobs/git";
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_POLL_MS = 1500;

const ToolSchema = Type.Object(
	{
		action: Type.Union([
			Type.Literal("inspect-capabilities"),
			Type.Literal("push-current-branch"),
		]),
		command: Type.String(),
		commandName: Type.String(),
		skillName: Type.String(),
		timeoutMs: Type.Optional(Type.Number({ minimum: 1000 })),
	},
	{ additionalProperties: false },
);

type ToolParams = {
	action: "inspect-capabilities" | "push-current-branch";
	command: string;
	commandName: string;
	skillName: string;
	timeoutMs?: number;
};

export type CapabilitySummary = {
	version: 1;
	push: {
		ready: boolean;
		status: "ready" | "blocked";
		message: string;
	};
	pr: {
		ready: boolean;
		status: "ready" | "blocked";
		message: string;
	};
};

export type JobResult = {
	jobId: string;
	status: string;
	ok?: boolean;
	exitCode?: number;
	message?: string;
};

export type RepoState = {
	cwd: string;
	branch: string;
	head: string;
	remote: string;
};

type BridgeDeps = {
	readCapabilities: (repoPath: string) => Promise<CapabilitySummary>;
	collectRepoState: (repoPath: string) => Promise<RepoState>;
	writeJob: (
		repoState: RepoState,
	) => Promise<{ jobId: string; jobPath: string }>;
	waitForResult: (jobId: string, timeoutMs: number) => Promise<JobResult>;
	resolveTargetRepo: () => string;
};

function resolveCoreRepo(): string {
	return path.resolve(
		process.env.OPENCLAW_HOST_GIT_CORE_REPO ?? DEFAULT_CORE_REPO,
	);
}

function resolveSpoolRoot(): string {
	return path.resolve(
		process.env.OPENCLAW_HOST_GIT_SPOOL_ROOT ?? DEFAULT_SPOOL_ROOT,
	);
}

export function resolveTargetRepo(): string {
	const rawTarget =
		process.env.OPENCLAW_GIT_TARGET_REPO ??
		process.env.OPENCLAW_GIT_WORKFLOW_REPO_DIR ??
		process.env.OPENCLAW_PROJECT_DIR ??
		DEFAULT_TARGET_REPO;

	if (
		rawTarget === "/Users/svarnoy85/teodorArg/openclaw-git-workflow" ||
		rawTarget === process.env.OPENCLAW_GIT_WORKFLOW_REPO_DIR
	) {
		return DEFAULT_TARGET_REPO;
	}

	if (
		rawTarget === "/Users/svarnoy85/teodorArg/OpenClaw" ||
		rawTarget === process.env.OPENCLAW_PROJECT_DIR
	) {
		return "/home/node/project";
	}

	return path.resolve(rawTarget);
}

export async function readCapabilities(
	repoPath: string,
): Promise<CapabilitySummary> {
	const coreRepo = resolveCoreRepo();
	const result = await execFileAsync(
		"./scripts/openclaw-host-git.sh",
		["print-capabilities-json"],
		{
			cwd: coreRepo,
			env: {
				...process.env,
				OPENCLAW_GIT_TARGET_REPO: repoPath,
			},
		},
	);

	return JSON.parse(result.stdout) as CapabilitySummary;
}

export async function collectRepoState(repoPath: string): Promise<RepoState> {
	const branchResult = await execFileAsync(
		"git",
		["rev-parse", "--abbrev-ref", "HEAD"],
		{ cwd: repoPath },
	);
	const headResult = await execFileAsync("git", ["rev-parse", "HEAD"], {
		cwd: repoPath,
	});

	let remote = "";
	const branch = branchResult.stdout.trim();
	try {
		const configuredRemote = await execFileAsync(
			"git",
			["config", "--get", `branch.${branch}.remote`],
			{ cwd: repoPath },
		);
		remote = configuredRemote.stdout.trim();
	} catch {
		// noop
	}

	if (!remote) {
		try {
			await execFileAsync("git", ["remote", "get-url", "origin"], {
				cwd: repoPath,
			});
			remote = "origin";
		} catch {
			const remotes = await execFileAsync("git", ["remote"], {
				cwd: repoPath,
			});
			remote = remotes.stdout.split(/\r?\n/).find(Boolean)?.trim() ?? "";
		}
	}

	if (!remote) {
		throw new Error(
			"Unable to determine a git remote for push-current-branch.",
		);
	}

	return {
		cwd: repoPath,
		branch,
		head: headResult.stdout.trim(),
		remote,
	};
}

function buildBlockedResponse(capabilities: CapabilitySummary) {
	return {
		ok: false,
		action: "push-current-branch",
		status: "blocked",
		message: capabilities.push.message,
		note: "Push job was not written because capability preflight reported the Plan A push path as blocked.",
		prStatus: capabilities.pr.status,
	};
}

async function writeJob(repoState: RepoState) {
	const spoolRoot = resolveSpoolRoot();
	const queueDir = path.join(spoolRoot, "queue");
	await fs.mkdir(queueDir, { recursive: true });

	const jobId = randomUUID();
	const payload = {
		version: 1,
		jobId,
		kind: "push_current_branch",
		createdAt: new Date().toISOString(),
		repo: repoState,
		request: {
			sessionKey: "openclaw-git-workflow",
		},
	};
	const fileName = `${jobId}-push-current-branch.json`;
	const tempPath = path.join(queueDir, `${fileName}.tmp`);
	const finalPath = path.join(queueDir, fileName);

	await fs.writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
	await fs.rename(tempPath, finalPath);

	return { jobId, jobPath: finalPath };
}

export async function waitForResult(
	jobId: string,
	timeoutMs: number,
): Promise<JobResult> {
	const resultsPath = path.join(resolveSpoolRoot(), "results", `${jobId}.json`);
	const startedAt = Date.now();

	while (Date.now() - startedAt < timeoutMs) {
		try {
			const raw = await fs.readFile(resultsPath, "utf8");
			return JSON.parse(raw) as JobResult;
		} catch (error) {
			const fsError = error as NodeJS.ErrnoException;
			if (fsError?.code !== "ENOENT") {
				throw error;
			}
		}

		await new Promise((resolve) => setTimeout(resolve, DEFAULT_POLL_MS));
	}

	throw new Error(
		`Timed out while waiting for host git result for job ${jobId}.`,
	);
}

function toToolText(payload: unknown) {
	return {
		content: [
			{
				type: "text",
				text: JSON.stringify(payload, null, 2),
			},
		],
	};
}

function createDefaultDeps(): BridgeDeps {
	return {
		readCapabilities,
		collectRepoState,
		writeJob,
		waitForResult,
		resolveTargetRepo,
	};
}

export function createGitPushBridgeTool(overrides: Partial<BridgeDeps> = {}) {
	const deps: BridgeDeps = { ...createDefaultDeps(), ...overrides };

	return {
		name: "git_push_bridge_action",
		description:
			"Bounded bridge for the send_to_git push finish step using capability preflight and host-jobs spool.",
		parameters: ToolSchema,
		async execute(_toolCallId: string, params: ToolParams) {
			if (params.skillName !== "openclaw-host-git-push") {
				throw new Error(
					"git_push_bridge_action only accepts requests from skill openclaw-host-git-push.",
				);
			}

			const intent = resolveWorkflowIntent({
				commandName: params.commandName,
				command: params.command,
			});

			if (intent !== "send_to_git") {
				throw new Error(
					"git_push_bridge_action accepts only the canonical send_to_git intent or its supported aliases.",
				);
			}

			const targetRepo = deps.resolveTargetRepo();
			const capabilities = await deps.readCapabilities(targetRepo);

			if (params.action === "inspect-capabilities") {
				return toToolText({
					ok: true,
					action: params.action,
					intent,
					capabilities,
				});
			}

			if (!capabilities.push.ready) {
				return toToolText(buildBlockedResponse(capabilities));
			}

			const repoState = await deps.collectRepoState(targetRepo);
			const { jobId, jobPath } = await deps.writeJob(repoState);
			const result = await deps.waitForResult(
				jobId,
				params.timeoutMs ?? DEFAULT_TIMEOUT_MS,
			);

			return toToolText({
				ok: result.status === "done",
				action: params.action,
				intent,
				jobId,
				jobPath,
				repo: repoState,
				result,
			});
		},
	};
}

export const __testables = {
	buildBlockedResponse,
	toToolText,
};
