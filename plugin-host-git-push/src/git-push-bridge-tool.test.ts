import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createGitPushBridgeTool,
	resolveTargetRepo,
} from "./git-push-bridge-tool.js";

const readyCapabilities = {
	version: 1,
	push: {
		ready: true,
		status: "ready" as const,
		message: "push ready",
	},
	pr: {
		ready: false,
		status: "blocked" as const,
		message: "pr blocked",
	},
};

function parseToolText(
	result: Awaited<
		ReturnType<ReturnType<typeof createGitPushBridgeTool>["execute"]>
	>,
) {
	const item = result.content[0];
	if (!item || item.type !== "text") {
		throw new Error("Expected text tool response");
	}
	return JSON.parse(item.text) as Record<string, unknown>;
}

afterEach(() => {
	delete process.env.OPENCLAW_GIT_TARGET_REPO;
	delete process.env.OPENCLAW_GIT_WORKFLOW_REPO_DIR;
	delete process.env.OPENCLAW_PROJECT_DIR;
});

describe("git_push_bridge_action", () => {
	it("resolves the workflow repo target from host coordinates", () => {
		process.env.OPENCLAW_GIT_WORKFLOW_REPO_DIR =
			"/Users/svarnoy85/teodorArg/openclaw-git-workflow";

		expect(resolveTargetRepo()).toBe("/home/node/repos/openclaw-git-workflow");
	});

	it("passes the resolved target repo into capability preflight and repo-state collection", async () => {
		const readCapabilities = vi.fn(async () => readyCapabilities);
		const collectRepoState = vi.fn(async () => ({
			cwd: "/home/node/repos/openclaw-git-workflow",
			branch: "feat/x",
			head: "abc123",
			remote: "origin",
		}));
		const tool = createGitPushBridgeTool({
			readCapabilities,
			collectRepoState,
			writeJob: async () => ({
				jobId: "job-123",
				jobPath: "/spool/queue/job-123-push-current-branch.json",
			}),
			waitForResult: async () => ({
				jobId: "job-123",
				status: "done",
				ok: true,
			}),
			resolveTargetRepo: () => "/home/node/repos/openclaw-git-workflow",
		});

		await tool.execute("call-target", {
			action: "push-current-branch",
			command: "/git-push current-branch",
			commandName: "/git-push",
			skillName: "openclaw-host-git-push",
		});

		expect(readCapabilities).toHaveBeenCalledWith(
			"/home/node/repos/openclaw-git-workflow",
		);
		expect(collectRepoState).toHaveBeenCalledWith(
			"/home/node/repos/openclaw-git-workflow",
		);
	});

	it("returns blocked response and does not write a job when push capability is blocked", async () => {
		const writeJob = vi.fn();
		const collectRepoState = vi.fn();
		const waitForResult = vi.fn();
		const tool = createGitPushBridgeTool({
			readCapabilities: async () => ({
				version: 1,
				push: {
					ready: false,
					status: "blocked",
					message: "host push unavailable",
				},
				pr: {
					ready: false,
					status: "blocked",
					message: "pr unavailable",
				},
			}),
			collectRepoState,
			writeJob,
			waitForResult,
			resolveTargetRepo: () => "/repo",
		});

		const result = await tool.execute("call-1", {
			action: "push-current-branch",
			command: "/git-push current-branch",
			commandName: "/git-push",
			skillName: "openclaw-host-git-push",
		});
		const payload = parseToolText(result);

		expect(payload).toMatchObject({
			ok: false,
			action: "push-current-branch",
			status: "blocked",
			message: "host push unavailable",
			prStatus: "blocked",
		});
		expect(collectRepoState).not.toHaveBeenCalled();
		expect(writeJob).not.toHaveBeenCalled();
		expect(waitForResult).not.toHaveBeenCalled();
	});

	it("writes a typed push_current_branch job with repo state", async () => {
		const repoState = {
			cwd: "/repo",
			branch: "feat/x",
			head: "abc123",
			remote: "origin",
		};
		const writeJob = vi.fn(async () => ({
			jobId: "job-123",
			jobPath: "/spool/queue/job-123-push-current-branch.json",
		}));
		const waitForResult = vi.fn(async () => ({
			jobId: "job-123",
			status: "done",
			ok: true,
			message: "pushed",
		}));
		const tool = createGitPushBridgeTool({
			readCapabilities: async () => readyCapabilities,
			collectRepoState: async () => repoState,
			writeJob,
			waitForResult,
			resolveTargetRepo: () => "/repo",
		});

		const result = await tool.execute("call-2", {
			action: "push-current-branch",
			command: "/git-push current-branch",
			commandName: "/git-push",
			skillName: "openclaw-host-git-push",
		});
		const payload = parseToolText(result);

		expect(writeJob).toHaveBeenCalledWith(repoState);
		expect(payload).toMatchObject({
			ok: true,
			action: "push-current-branch",
			jobId: "job-123",
			jobPath: "/spool/queue/job-123-push-current-branch.json",
			repo: repoState,
			result: {
				jobId: "job-123",
				status: "done",
				ok: true,
				message: "pushed",
			},
		});
	});

	it("passes timeoutMs through to result waiting", async () => {
		const waitForResult = vi.fn(async () => ({
			jobId: "job-timeout",
			status: "timeout",
			ok: false,
			message: "timed out",
		}));
		const tool = createGitPushBridgeTool({
			readCapabilities: async () => readyCapabilities,
			collectRepoState: async () => ({
				cwd: "/repo",
				branch: "feat/x",
				head: "abc123",
				remote: "origin",
			}),
			writeJob: async () => ({
				jobId: "job-timeout",
				jobPath: "/spool/queue/job-timeout-push-current-branch.json",
			}),
			waitForResult,
			resolveTargetRepo: () => "/repo",
		});

		const result = await tool.execute("call-3", {
			action: "push-current-branch",
			command: "/git-push current-branch",
			commandName: "/git-push",
			skillName: "openclaw-host-git-push",
			timeoutMs: 4321,
		});
		const payload = parseToolText(result);

		expect(waitForResult).toHaveBeenCalledWith("job-timeout", 4321);
		expect(payload).toMatchObject({
			ok: false,
			action: "push-current-branch",
			jobId: "job-timeout",
			result: {
				status: "timeout",
				ok: false,
				message: "timed out",
			},
		});
	});
});
