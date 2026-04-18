import { describe, expect, it, vi } from "vitest";

const callGatewayToolMock = vi.fn();

vi.mock("../runtime/node/browser-support.js", () => ({
	loadOpenClawBrowserSupport: vi.fn(async () => ({
		callGatewayTool: callGatewayToolMock,
	})),
}));

const { createNodeHostCommandRunner } = await import(
	"../runtime/node/execution.js"
);

describe("node execution", () => {
	it("invokes system.run.prepare and system.run with the prepared payload", async () => {
		callGatewayToolMock.mockReset();
		callGatewayToolMock
			.mockResolvedValueOnce({
				payload: {
					plan: {
						argv: ["git", "status"],
						cwd: "/repo",
						commandText: "git status",
						agentId: "agent-1",
						sessionKey: "session-1",
					},
				},
			})
			.mockResolvedValueOnce({
				payload: {
					success: true,
					stdout: " ok \n",
					stderr: "",
				},
			});

		const runner = createNodeHostCommandRunner({
			nodeSelection: {
				runtimeBindingStatus: "bound",
				runtimeBindingTarget: {
					nodeId: "node-1",
				},
			} as never,
			agentId: "agent-1",
			sessionKey: "session-1",
		});
		const result = await runner.run("git", ["status"], { cwd: "/repo" });

		expect(result).toEqual({
			stdout: "ok",
			stderr: "",
		});
		expect(callGatewayToolMock).toHaveBeenNthCalledWith(
			1,
			"node.invoke",
			expect.objectContaining({ timeoutMs: 15000 }),
			expect.objectContaining({
				nodeId: "node-1",
				command: "system.run.prepare",
				params: expect.objectContaining({
					command: ["git", "status"],
					rawCommand: "git status",
					cwd: "/repo",
					agentId: "agent-1",
					sessionKey: "session-1",
				}),
			}),
		);
		expect(callGatewayToolMock).toHaveBeenNthCalledWith(
			2,
			"node.invoke",
			expect.objectContaining({ timeoutMs: 15000 }),
			expect.objectContaining({
				nodeId: "node-1",
				command: "system.run",
				params: expect.objectContaining({
					command: ["git", "status"],
					rawCommand: "git status",
					cwd: "/repo",
					agentId: "agent-1",
					sessionKey: "session-1",
					systemRunPlan: expect.objectContaining({
						commandText: "git status",
					}),
				}),
			}),
		);
	});

	it("surfaces node execution failures with the command text", async () => {
		callGatewayToolMock.mockReset();
		callGatewayToolMock
			.mockResolvedValueOnce({
				payload: {
					plan: {
						argv: ["git", "push"],
						cwd: "/repo",
						commandText: "git push",
						agentId: null,
						sessionKey: null,
					},
				},
			})
			.mockResolvedValueOnce({
				payload: {
					success: false,
					stderr: "permission denied",
					exitCode: 1,
				},
			});

		const runner = createNodeHostCommandRunner({
			nodeSelection: {
				runtimeBindingStatus: "bound",
				runtimeBindingTarget: {
					nodeId: "node-1",
				},
			} as never,
		});

		await expect(runner.run("git", ["push"], { cwd: "/repo" })).rejects.toThrow(
			"git push: permission denied",
		);
	});
});
