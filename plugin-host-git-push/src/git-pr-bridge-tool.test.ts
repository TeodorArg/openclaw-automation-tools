import { afterEach, describe, expect, it, vi } from "vitest";
import { createGitPrBridgeTool } from "./git-pr-bridge-tool.js";
import { resolveTargetRepo } from "./git-push-bridge-tool.js";

const readyCapabilities = {
	version: 1,
	push: {
		ready: true,
		status: "ready" as const,
		message: "push ready",
	},
	pr: {
		ready: true,
		status: "ready" as const,
		message: "pr ready",
	},
};

function parseToolText(
	result: Awaited<
		ReturnType<ReturnType<typeof createGitPrBridgeTool>["execute"]>
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

describe("git_pr_bridge_action", () => {
	it("resolves the workflow repo target from explicit target env", () => {
		process.env.OPENCLAW_GIT_TARGET_REPO =
			"/home/node/repos/openclaw-git-workflow";

		expect(resolveTargetRepo()).toBe("/home/node/repos/openclaw-git-workflow");
	});

	it("passes the resolved target repo into PR capability preflight and repo-state collection", async () => {
		const readCapabilities = vi.fn(async () => readyCapabilities);
		const collectRepoState = vi.fn(async () => ({
			cwd: "/home/node/repos/openclaw-git-workflow",
			branch: "feat/x",
			head: "abc123",
			remote: "origin",
		}));
		const tool = createGitPrBridgeTool({
			readCapabilities,
			collectRepoState,
			writeJob: async () => ({
				jobId: "job-123",
				jobPath: "/spool/queue/job-123-create-pr-to-main.json",
			}),
			waitForResult: async () => ({
				jobId: "job-123",
				status: "done",
				ok: true,
			}),
			resolveTargetRepo: () => "/home/node/repos/openclaw-git-workflow",
		});

		await tool.execute("call-target", {
			action: "create-pr-to-main",
			command: "open_pr",
			commandName: "open_pr",
			skillName: "openclaw-host-git-pr",
			title: "Bridge PR",
			body: "Summary",
		});

		expect(readCapabilities).toHaveBeenCalledWith(
			"/home/node/repos/openclaw-git-workflow",
		);
		expect(collectRepoState).toHaveBeenCalledWith(
			"/home/node/repos/openclaw-git-workflow",
		);
	});
	it("accepts supported human alias routing for open_pr", async () => {
		const tool = createGitPrBridgeTool({
			readCapabilities: async () => readyCapabilities,
			collectRepoState: async () => ({
				cwd: "/repo",
				branch: "feat/x",
				head: "abc123",
				remote: "origin",
			}),
			writeJob: async () => ({
				jobId: "job-readiness",
				jobPath: "/spool/queue/job-readiness-create-pr-to-main.json",
			}),
			waitForResult: async () => ({
				jobId: "job-readiness",
				status: "done",
				ok: true,
			}),
			resolveTargetRepo: () => "/repo",
		});

		const result = await tool.execute("call-readiness", {
			action: "assert-pr-ready",
			command: "make a PR",
			commandName: "",
			skillName: "openclaw-host-git-pr",
		});
		const payload = parseToolText(result);

		expect(payload).toMatchObject({
			ok: true,
			action: "assert-pr-ready",
			intent: "open_pr",
		});
	});

	it("rejects unsupported pr intent text", async () => {
		const tool = createGitPrBridgeTool({
			readCapabilities: async () => readyCapabilities,
			collectRepoState: async () => ({
				cwd: "/repo",
				branch: "feat/x",
				head: "abc123",
				remote: "origin",
			}),
			writeJob: async () => ({
				jobId: "job-ignored",
				jobPath: "/spool/queue/job-ignored-create-pr-to-main.json",
			}),
			waitForResult: async () => ({
				jobId: "job-ignored",
				status: "done",
			}),
			resolveTargetRepo: () => "/repo",
		});

		await expect(
			tool.execute("call-bad-alias", {
				action: "assert-pr-ready",
				command: "push it",
				commandName: "",
				skillName: "openclaw-host-git-pr",
			}),
		).rejects.toThrow(
			"git_pr_bridge_action accepts only the canonical open_pr intent or its supported aliases.",
		);
	});

	it("returns pr readiness without writing a job", async () => {
		const writeJob = vi.fn();
		const tool = createGitPrBridgeTool({
			readCapabilities: async () => ({
				version: 1,
				push: {
					ready: true,
					status: "ready",
					message: "push ready",
				},
				pr: {
					ready: false,
					status: "blocked",
					message: "host pr unavailable",
				},
			}),
			writeJob,
			collectRepoState: async () => ({
				cwd: "/repo",
				branch: "feat/x",
				head: "abc123",
				remote: "origin",
			}),
			waitForResult: async () => ({
				jobId: "noop",
				status: "done",
			}),
			resolveTargetRepo: () => "/repo",
		});

		const result = await tool.execute("call-1", {
			action: "assert-pr-ready",
			command: "/git-pr ready",
			commandName: "open_pr",
			skillName: "openclaw-host-git-pr",
		});
		const payload = parseToolText(result);

		expect(payload).toMatchObject({
			ok: false,
			action: "assert-pr-ready",
			status: "blocked",
			message: "host pr unavailable",
			pushStatus: "ready",
		});
		expect(writeJob).not.toHaveBeenCalled();
	});

	it("returns blocked response and does not write a job when pr capability is blocked", async () => {
		const writeJob = vi.fn();
		const collectRepoState = vi.fn();
		const waitForResult = vi.fn();
		const tool = createGitPrBridgeTool({
			readCapabilities: async () => ({
				version: 1,
				push: {
					ready: true,
					status: "ready",
					message: "push ready",
				},
				pr: {
					ready: false,
					status: "blocked",
					message: "host pr unavailable",
				},
			}),
			collectRepoState,
			writeJob,
			waitForResult,
			resolveTargetRepo: () => "/repo",
		});

		const result = await tool.execute("call-2", {
			action: "create-pr-to-main",
			command: "open_pr",
			commandName: "open_pr",
			skillName: "openclaw-host-git-pr",
			title: "Bridge PR",
			body: "Summary\n\n- item",
		});
		const payload = parseToolText(result);

		expect(payload).toMatchObject({
			ok: false,
			action: "create-pr-to-main",
			status: "blocked",
			message: "host pr unavailable",
			pushStatus: "ready",
		});
		expect(collectRepoState).not.toHaveBeenCalled();
		expect(writeJob).not.toHaveBeenCalled();
		expect(waitForResult).not.toHaveBeenCalled();
	});

	it("writes a typed create_pull_request job with repo state and request metadata", async () => {
		const repoState = {
			cwd: "/repo",
			branch: "feat/x",
			head: "abc123",
			remote: "origin",
		};
		const writeJob = vi.fn(async () => ({
			jobId: "job-123",
			jobPath: "/spool/queue/job-123-create-pr-to-main.json",
		}));
		const waitForResult = vi.fn(async () => ({
			jobId: "job-123",
			status: "done",
			ok: true,
			message: "pr opened",
		}));
		const tool = createGitPrBridgeTool({
			readCapabilities: async () => readyCapabilities,
			collectRepoState: async () => repoState,
			writeJob,
			waitForResult,
			resolveTargetRepo: () => "/repo",
		});

		const result = await tool.execute("call-3", {
			action: "create-pr-to-main",
			command: "open_pr",
			commandName: "open_pr",
			skillName: "openclaw-host-git-pr",
			title: "Bridge PR",
			body: "Summary\n\n- item",
		});
		const payload = parseToolText(result);

		expect(writeJob).toHaveBeenCalledWith(repoState, {
			title: "Bridge PR",
			body: "Summary\n\n- item",
		});
		expect(payload).toMatchObject({
			ok: true,
			action: "create-pr-to-main",
			jobId: "job-123",
			jobPath: "/spool/queue/job-123-create-pr-to-main.json",
			repo: repoState,
			request: {
				base: "main",
				head: "feat/x",
				title: "Bridge PR",
			},
			result: {
				jobId: "job-123",
				status: "done",
				ok: true,
				message: "pr opened",
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
		const tool = createGitPrBridgeTool({
			readCapabilities: async () => readyCapabilities,
			collectRepoState: async () => ({
				cwd: "/repo",
				branch: "feat/x",
				head: "abc123",
				remote: "origin",
			}),
			writeJob: async () => ({
				jobId: "job-timeout",
				jobPath: "/spool/queue/job-timeout-create-pr-to-main.json",
			}),
			waitForResult,
			resolveTargetRepo: () => "/repo",
		});

		const result = await tool.execute("call-4", {
			action: "create-pr-to-main",
			command: "open_pr",
			commandName: "open_pr",
			skillName: "openclaw-host-git-pr",
			title: "Bridge PR",
			body: "Summary\n\n- item",
			timeoutMs: 4321,
		});
		const payload = parseToolText(result);

		expect(waitForResult).toHaveBeenCalledWith("job-timeout", 4321);
		expect(payload).toMatchObject({
			ok: false,
			action: "create-pr-to-main",
			jobId: "job-timeout",
			result: {
				status: "timeout",
				ok: false,
				message: "timed out",
			},
		});
	});
});
