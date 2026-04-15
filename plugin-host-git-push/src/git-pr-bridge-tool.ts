import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Type } from "@sinclair/typebox";
import {
	type CapabilitySummary,
	collectRepoState,
	type JobResult,
	type RepoState,
	readCapabilities,
	resolveTargetRepo,
	waitForResult,
} from "./git-push-bridge-tool.js";

const DEFAULT_SPOOL_ROOT = "/home/node/.openclaw/host-jobs/git";
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

const ToolSchema = Type.Object(
	{
		action: Type.Union([
			Type.Literal("assert-pr-ready"),
			Type.Literal("create-pr-to-main"),
		]),
		command: Type.String(),
		commandName: Type.String(),
		skillName: Type.String(),
		title: Type.Optional(Type.String({ minLength: 1 })),
		body: Type.Optional(Type.String({ minLength: 1 })),
		timeoutMs: Type.Optional(Type.Number({ minimum: 1000 })),
	},
	{ additionalProperties: false },
);

type ToolParams = {
	action: "assert-pr-ready" | "create-pr-to-main";
	command: string;
	commandName: string;
	skillName: string;
	title?: string;
	body?: string;
	timeoutMs?: number;
};

type PrBridgeDeps = {
	readCapabilities: (repoPath: string) => Promise<CapabilitySummary>;
	collectRepoState: (repoPath: string) => Promise<RepoState>;
	writeJob: (
		repoState: RepoState,
		request: { title: string; body: string },
	) => Promise<{ jobId: string; jobPath: string }>;
	waitForResult: (jobId: string, timeoutMs: number) => Promise<JobResult>;
	resolveTargetRepo: () => string;
};

function resolveSpoolRoot(): string {
	return path.resolve(
		process.env.OPENCLAW_HOST_GIT_SPOOL_ROOT ?? DEFAULT_SPOOL_ROOT,
	);
}

function buildBlockedResponse(capabilities: CapabilitySummary) {
	return {
		ok: false,
		action: "create-pr-to-main",
		status: "blocked",
		message: capabilities.pr.message,
		note: "PR job was not written because capability preflight reported the host-backed gh path as blocked.",
		pushStatus: capabilities.push.status,
	};
}

function buildReadinessResponse(capabilities: CapabilitySummary) {
	return {
		ok: capabilities.pr.ready,
		action: "assert-pr-ready",
		status: capabilities.pr.status,
		message: capabilities.pr.message,
		pushStatus: capabilities.push.status,
	};
}

async function writeJob(
	repoState: RepoState,
	request: { title: string; body: string },
) {
	const spoolRoot = resolveSpoolRoot();
	const queueDir = path.join(spoolRoot, "queue");
	await fs.mkdir(queueDir, { recursive: true });

	const jobId = randomUUID();
	const payload = {
		version: 1,
		jobId,
		kind: "create_pull_request",
		action: "create-pr-to-main",
		createdAt: new Date().toISOString(),
		repo: repoState,
		request: {
			sessionKey: "openclaw-git-workflow",
			base: "main",
			head: repoState.branch,
			title: request.title,
			body: request.body,
		},
	};
	const fileName = `${jobId}-create-pr-to-main.json`;
	const tempPath = path.join(queueDir, `${fileName}.tmp`);
	const finalPath = path.join(queueDir, fileName);

	await fs.writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
	await fs.rename(tempPath, finalPath);

	return { jobId, jobPath: finalPath };
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

function createDefaultDeps(): PrBridgeDeps {
	return {
		readCapabilities,
		collectRepoState,
		writeJob,
		waitForResult,
		resolveTargetRepo,
	};
}

export function createGitPrBridgeTool(overrides: Partial<PrBridgeDeps> = {}) {
	const deps: PrBridgeDeps = { ...createDefaultDeps(), ...overrides };

	return {
		name: "git_pr_bridge_action",
		description:
			"Bounded bridge for PR readiness checks and create-pr-to-main using capability preflight and host-jobs spool.",
		parameters: ToolSchema,
		async execute(_toolCallId: string, params: ToolParams) {
			if (params.skillName !== "openclaw-host-git-pr") {
				throw new Error(
					"git_pr_bridge_action only accepts requests from skill openclaw-host-git-pr.",
				);
			}

			const targetRepo = deps.resolveTargetRepo();
			const capabilities = await deps.readCapabilities(targetRepo);

			if (params.action === "assert-pr-ready") {
				return toToolText(buildReadinessResponse(capabilities));
			}

			if (!capabilities.pr.ready) {
				return toToolText(buildBlockedResponse(capabilities));
			}

			if (!params.title?.trim()) {
				throw new Error("create-pr-to-main requires a non-empty title.");
			}

			if (!params.body?.trim()) {
				throw new Error("create-pr-to-main requires a non-empty body.");
			}

			const repoState = await deps.collectRepoState(targetRepo);
			const { jobId, jobPath } = await deps.writeJob(repoState, {
				title: params.title.trim(),
				body: params.body.trim(),
			});
			const result = await deps.waitForResult(
				jobId,
				params.timeoutMs ?? DEFAULT_TIMEOUT_MS,
			);

			return toToolText({
				ok: result.status === "done",
				action: params.action,
				jobId,
				jobPath,
				repo: repoState,
				request: {
					base: "main",
					head: repoState.branch,
					title: params.title.trim(),
				},
				result,
			});
		},
	};
}

export const __testables = {
	buildBlockedResponse,
	buildReadinessResponse,
	toToolText,
};
