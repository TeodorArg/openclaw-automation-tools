import { describe, expect, it } from "vitest";
import {
	DEFAULT_NODE_SELECTOR_PLACEHOLDER,
	resolveHostNodeSelection,
} from "./node-selection.js";

describe("host node selection", () => {
	it("prefers plugin config nodeSelector over environment values", () => {
		const result = resolveHostNodeSelection({
			pluginConfig: {
				nodeSelector: "  mac-mini-host  ",
			},
			env: {
				OPENCLAW_HOST_GIT_WORKFLOW_NODE_SELECTOR: "env-node",
				OPENCLAW_NODE_SELECTOR: "generic-env-node",
			},
		});

		expect(result).toMatchObject({
			requestedSelector: "mac-mini-host",
			normalizedSelector: "mac-mini-host",
			selectionSource: "pluginConfig.nodeSelector",
			selectionMode: "configured",
			usedDefault: false,
			runtimeBindingStatus: "not_bound",
			runtimeBindingTarget: null,
		});
	});

	it("falls back to the package-specific environment selector", () => {
		const result = resolveHostNodeSelection({
			pluginConfig: {
				nodeSelector: "   ",
			},
			env: {
				OPENCLAW_HOST_GIT_WORKFLOW_NODE_SELECTOR: " host-lane-node ",
				OPENCLAW_NODE_SELECTOR: "generic-env-node",
			},
		});

		expect(result).toMatchObject({
			requestedSelector: "host-lane-node",
			normalizedSelector: "host-lane-node",
			selectionSource: "OPENCLAW_HOST_GIT_WORKFLOW_NODE_SELECTOR",
			selectionMode: "environment",
			usedDefault: false,
			runtimeBindingStatus: "not_bound",
			runtimeBindingTarget: null,
		});
	});

	it("uses the generic node selector env when the package-specific env is empty", () => {
		const result = resolveHostNodeSelection({
			env: {
				OPENCLAW_HOST_GIT_WORKFLOW_NODE_SELECTOR: "   ",
				OPENCLAW_NODE_SELECTOR: " gateway-node-a ",
			},
		});

		expect(result).toMatchObject({
			requestedSelector: "gateway-node-a",
			normalizedSelector: "gateway-node-a",
			selectionSource: "OPENCLAW_NODE_SELECTOR",
			selectionMode: "environment",
			usedDefault: false,
			runtimeBindingStatus: "not_bound",
			runtimeBindingTarget: null,
		});
	});

	it("returns an explicit placeholder contract when no selector is configured", () => {
		const result = resolveHostNodeSelection({
			pluginConfig: {},
			env: {},
		});

		expect(result).toMatchObject({
			requestedSelector: DEFAULT_NODE_SELECTOR_PLACEHOLDER,
			normalizedSelector: DEFAULT_NODE_SELECTOR_PLACEHOLDER,
			selectionSource: "default",
			selectionMode: "default_placeholder",
			usedDefault: true,
			runtimeBindingStatus: "not_bound",
			runtimeBindingTarget: null,
		});
	});
});
