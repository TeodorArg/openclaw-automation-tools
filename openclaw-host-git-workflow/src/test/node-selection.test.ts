import { describe, expect, it } from "vitest";
import {
	DEFAULT_NODE_SELECTOR_PLACEHOLDER,
	resolveHostNodeSelection,
} from "../runtime/node/selection.js";

describe("host node selection", () => {
	it("prefers plugin config nodeSelector over environment values", async () => {
		const result = await resolveHostNodeSelection({
			pluginConfig: {
				nodeSelector: "  mac-mini-host  ",
			},
			env: {
				OPENCLAW_HOST_GIT_WORKFLOW_NODE_SELECTOR: "env-node",
				OPENCLAW_NODE_SELECTOR: "generic-env-node",
			},
			nodes: [
				{
					nodeId: "node-1",
					displayName: "mac-mini-host",
					commands: ["system.run"],
					connected: true,
				},
			],
		});

		expect(result).toMatchObject({
			requestedSelector: "mac-mini-host",
			normalizedSelector: "mac-mini-host",
			selectionSource: "pluginConfig.nodeSelector",
			selectionMode: "configured",
			usedDefault: false,
			runtimeBindingStatus: "bound",
			runtimeBindingTarget: {
				nodeId: "node-1",
			},
		});
	});

	it("falls back to the package-specific environment selector", async () => {
		const result = await resolveHostNodeSelection({
			pluginConfig: {
				nodeSelector: "   ",
			},
			env: {
				OPENCLAW_HOST_GIT_WORKFLOW_NODE_SELECTOR: " host-lane-node ",
				OPENCLAW_NODE_SELECTOR: "generic-env-node",
			},
			nodes: [
				{
					nodeId: "node-2",
					displayName: "host-lane-node",
					commands: ["system.run"],
					connected: true,
				},
			],
		});

		expect(result).toMatchObject({
			requestedSelector: "host-lane-node",
			normalizedSelector: "host-lane-node",
			selectionSource: "OPENCLAW_HOST_GIT_WORKFLOW_NODE_SELECTOR",
			selectionMode: "environment",
			usedDefault: false,
			runtimeBindingStatus: "bound",
		});
	});

	it("uses the generic node selector env when the package-specific env is empty", async () => {
		const result = await resolveHostNodeSelection({
			env: {
				OPENCLAW_HOST_GIT_WORKFLOW_NODE_SELECTOR: "   ",
				OPENCLAW_NODE_SELECTOR: " gateway-node-a ",
			},
			nodes: [
				{
					nodeId: "node-3",
					displayName: "gateway-node-a",
					commands: ["system.run"],
					connected: true,
				},
			],
		});

		expect(result).toMatchObject({
			requestedSelector: "gateway-node-a",
			normalizedSelector: "gateway-node-a",
			selectionSource: "OPENCLAW_NODE_SELECTOR",
			selectionMode: "environment",
			usedDefault: false,
			runtimeBindingStatus: "bound",
		});
	});

	it("binds implicitly when exactly one node is available", async () => {
		const result = await resolveHostNodeSelection({
			pluginConfig: {},
			env: {},
			nodes: [
				{
					nodeId: "node-4",
					displayName: "solo-host",
					commands: ["system.run"],
					connected: true,
				},
			],
		});

		expect(result).toMatchObject({
			requestedSelector: DEFAULT_NODE_SELECTOR_PLACEHOLDER,
			normalizedSelector: null,
			selectionSource: "default",
			selectionMode: "default_placeholder",
			usedDefault: true,
			runtimeBindingStatus: "bound",
			runtimeBindingTarget: {
				nodeId: "node-4",
				bindingSource: "implicit_singleton",
			},
		});
	});

	it("requires an explicit selector when multiple nodes are available", async () => {
		const result = await resolveHostNodeSelection({
			pluginConfig: {},
			env: {},
			nodes: [
				{ nodeId: "node-a", displayName: "host-a", commands: ["system.run"] },
				{ nodeId: "node-b", displayName: "host-b", commands: ["system.run"] },
			],
		});

		expect(result).toMatchObject({
			runtimeBindingStatus: "selection_required",
			runtimeBindingTarget: null,
			usedDefault: true,
		});
	});
});
