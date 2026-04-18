import { describe, expect, it } from "vitest";
import { runHostWorkflowDoctor } from "../runtime/host/doctor.js";
import type { HostCommandRunner } from "../runtime/node/execution.js";

describe("runHostWorkflowDoctor", () => {
	it("reports node-selection blockers without attempting host execution", async () => {
		const result = await runHostWorkflowDoctor({
			repoResolution: {
				repoPath: "/Users/tester/repo",
				requestedRepoPath: "/Users/tester/repo",
				resolutionSource: "OPENCLAW_HOST_GIT_WORKFLOW_REPO",
				usedDefault: false,
			},
			nodeSelection: {
				requestedSelector: "auto-select-host-node",
				normalizedSelector: null,
				selectionSource: "default",
				selectionMode: "default_placeholder",
				usedDefault: true,
				runtimeBindingStatus: "selection_required",
				runtimeBindingTarget: null,
				note: "Multiple host nodes are available; configure nodeSelector so the bounded workflow can bind to one concrete host.",
			},
			runner: null,
		});

		expect(result.status).toBe("needs_attention");
		expect(result.hostPreflight).toBeNull();
		expect(result.nextSuggestedAction).toBe("fix_doctor_findings");
		expect(result.checks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "node_binding",
					status: "attention",
				}),
			]),
		);
	});

	it("returns ready status when host preflight succeeds", async () => {
		const runner: HostCommandRunner = {
			async run(command, args) {
				if (args[0] === "--version") {
					return { stdout: `${command} version test`, stderr: "" };
				}
				if (args[0] === "rev-parse" && args[1] === "--show-toplevel") {
					return { stdout: "/Users/tester/repo", stderr: "" };
				}
				if (args[0] === "rev-parse" && args[1] === "--abbrev-ref") {
					return {
						stdout: "feat/openclaw-host-git-workflow-doctor",
						stderr: "",
					};
				}
				if (args[0] === "remote" && args[1] === "get-url") {
					return {
						stdout: "git@github.com:TeodorArg/openclaw-automation-tools.git",
						stderr: "",
					};
				}
				if (args[0] === "auth" && args[1] === "status") {
					return { stdout: "github.com\n  ✓ Logged in", stderr: "" };
				}
				throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
			},
		};

		const result = await runHostWorkflowDoctor({
			repoResolution: {
				repoPath: "/Users/tester/repo",
				requestedRepoPath: "/Users/tester/repo",
				resolutionSource: "OPENCLAW_HOST_GIT_WORKFLOW_REPO",
				usedDefault: false,
			},
			nodeSelection: {
				requestedSelector: "host-node",
				normalizedSelector: "host-node",
				selectionSource: "pluginConfig.nodeSelector",
				selectionMode: "configured",
				usedDefault: false,
				runtimeBindingStatus: "bound",
				runtimeBindingTarget: {
					nodeId: "node-1",
					displayName: "host-node",
					platform: "darwin",
					connected: true,
					bindingSource: "selector",
					commandSurface: "node.invoke.system.run",
				},
				note: "Host workflow is bound to node node-1.",
			},
			runner,
		});

		expect(result.status).toBe("ready");
		expect(result.nextSuggestedAction).toBe("plan_with_branches");
		expect(result.hostPreflight).toMatchObject({
			repoRoot: "/Users/tester/repo",
			currentBranch: "feat/openclaw-host-git-workflow-doctor",
			ghAuthStatus: "ready",
		});
		expect(result.checks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "github_cli_auth",
					status: "ready",
				}),
			]),
		);
	});
});
