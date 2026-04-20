import {
	loadOpenClawBrowserSupport,
	type OpenClawNodeListEntry,
} from "./browser-support.js";
import { describeNodeBindingTarget } from "./execution.js";

export const DEFAULT_NODE_SELECTOR_PLACEHOLDER = "auto-select-host-node";

export type NodeSelectionSource =
	| "pluginConfig.nodeSelector"
	| "OPENCLAW_HOST_GIT_WORKFLOW_NODE_SELECTOR"
	| "OPENCLAW_NODE_SELECTOR"
	| "default";

export type NodeSelectionMode =
	| "configured"
	| "environment"
	| "default_placeholder";

export type HostNodeSelection = {
	requestedSelector: string;
	normalizedSelector: string | null;
	selectionSource: NodeSelectionSource;
	selectionMode: NodeSelectionMode;
	usedDefault: boolean;
	runtimeBindingStatus:
		| "bound"
		| "selection_required"
		| "selector_unresolved"
		| "no_node_available"
		| "node_disconnected"
		| "unsupported_system_run";
	runtimeBindingTarget: ReturnType<typeof describeNodeBindingTarget> | null;
	note: string;
	blocker: {
		code:
			| "selection_required"
			| "selector_unresolved"
			| "no_node_available"
			| "node_disconnected"
			| "unsupported_system_run";
		message: string;
		remediation: string[];
	} | null;
};

export type HostNodeSelectionConfig = {
	nodeSelector?: unknown;
};

type HostNodeSelectionEnv = {
	OPENCLAW_HOST_GIT_WORKFLOW_NODE_SELECTOR?: string;
	OPENCLAW_NODE_SELECTOR?: string;
};

type NodeSelectionInput = {
	pluginConfig?: HostNodeSelectionConfig;
	env?: HostNodeSelectionEnv;
	nodes?: NodeListNode[];
};

export type NodeListNode = {
	nodeId: string;
	displayName?: string;
	platform?: string;
	commands?: string[];
	connected?: boolean;
};

type NormalizedHostNodeSelection = {
	requestedSelector: string;
	normalizedSelector: string | null;
	selectionSource: NodeSelectionSource;
	selectionMode: NodeSelectionMode;
	usedDefault: boolean;
};

function resolveNodeIdLocally(
	nodes: NodeListNode[],
	query?: string,
	allowDefault?: boolean,
): string {
	if (query) {
		const normalizedQuery = query.trim().toLowerCase();
		const matches = nodes.filter((node) => {
			return (
				node.nodeId.toLowerCase() === normalizedQuery ||
				node.displayName?.trim().toLowerCase() === normalizedQuery
			);
		});

		if (matches.length === 1) {
			return matches[0].nodeId;
		}

		if (matches.length === 0) {
			throw new Error(`No node matches selector '${query}'.`);
		}

		throw new Error(`Selector '${query}' matches multiple nodes.`);
	}

	if (allowDefault && nodes.length === 1) {
		return nodes[0].nodeId;
	}

	throw new Error(
		"Node selector is required when multiple nodes are available.",
	);
}

function readConfiguredSelector(
	pluginConfig: HostNodeSelectionConfig | undefined,
): string | null {
	if (typeof pluginConfig?.nodeSelector !== "string") {
		return null;
	}

	const trimmed = pluginConfig.nodeSelector.trim();
	return trimmed === "" ? null : trimmed;
}

function readEnvSelector(env: HostNodeSelectionEnv): {
	source: "OPENCLAW_HOST_GIT_WORKFLOW_NODE_SELECTOR" | "OPENCLAW_NODE_SELECTOR";
	value: string;
} | null {
	const candidates = [
		{
			source: "OPENCLAW_HOST_GIT_WORKFLOW_NODE_SELECTOR" as const,
			value: env.OPENCLAW_HOST_GIT_WORKFLOW_NODE_SELECTOR,
		},
		{
			source: "OPENCLAW_NODE_SELECTOR" as const,
			value: env.OPENCLAW_NODE_SELECTOR,
		},
	];

	for (const candidate of candidates) {
		if (candidate.value && candidate.value.trim() !== "") {
			return {
				source: candidate.source,
				value: candidate.value.trim(),
			};
		}
	}

	return null;
}

function normalizeHostNodeSelection(
	input: NodeSelectionInput = {},
): NormalizedHostNodeSelection {
	const configuredSelector = readConfiguredSelector(input.pluginConfig);
	if (configuredSelector) {
		return {
			requestedSelector: configuredSelector,
			normalizedSelector: configuredSelector,
			selectionSource: "pluginConfig.nodeSelector",
			selectionMode: "configured",
			usedDefault: false,
		};
	}

	const envSelector = readEnvSelector(input.env ?? process.env);
	if (envSelector) {
		return {
			requestedSelector: envSelector.value,
			normalizedSelector: envSelector.value,
			selectionSource: envSelector.source,
			selectionMode: "environment",
			usedDefault: false,
		};
	}

	return {
		requestedSelector: DEFAULT_NODE_SELECTOR_PLACEHOLDER,
		normalizedSelector: null,
		selectionSource: "default",
		selectionMode: "default_placeholder",
		usedDefault: true,
	};
}

export async function resolveHostNodeSelection(
	input: NodeSelectionInput = {},
): Promise<HostNodeSelection> {
	const normalized = normalizeHostNodeSelection(input);
	const availableNodes: NodeListNode[] =
		input.nodes ??
		(
			await loadOpenClawBrowserSupport().then((runtime) =>
				runtime.listNodes({}),
			)
		).map((node: OpenClawNodeListEntry) => ({ ...node }));

	if (availableNodes.length === 0) {
		return {
			...normalized,
			runtimeBindingStatus: "no_node_available",
			runtimeBindingTarget: null,
			note: "No paired host node is available for the bounded host workflow runtime.",
			blocker: {
				code: "no_node_available",
				message:
					"No paired host node is currently available for host-backed git execution.",
				remediation: [
					"Start or reconnect the intended host node.",
					"Then retry the bounded host git workflow.",
				],
			},
		};
	}

	const requestedSelector = normalized.normalizedSelector ?? undefined;

	try {
		const nodeId = resolveNodeIdLocally(
			availableNodes,
			requestedSelector,
			requestedSelector === undefined,
		);
		const node = availableNodes.find(
			(candidate) => candidate.nodeId === nodeId,
		);

		if (!node) {
			return {
				...normalized,
				runtimeBindingStatus: "selector_unresolved",
				runtimeBindingTarget: null,
				note: `Node selector resolved to ${nodeId}, but that node is no longer present in the gateway node list.`,
				blocker: {
					code: "selector_unresolved",
					message:
						"Configured node selector did not resolve to a currently visible node.",
					remediation: [
						"Check the configured nodeSelector value.",
						"Reconnect the intended host node if it went away.",
					],
				},
			};
		}

		const bindingTarget = describeNodeBindingTarget(
			node,
			requestedSelector ? "selector" : "implicit_singleton",
		);

		if (node.connected !== true) {
			return {
				...normalized,
				runtimeBindingStatus: "node_disconnected",
				runtimeBindingTarget: bindingTarget,
				note: `Resolved node ${node.nodeId} is currently disconnected, so host-backed git execution cannot continue until it reconnects.`,
				blocker: {
					code: "node_disconnected",
					message:
						"The selected host node is visible but disconnected, so it is not usable for host-backed execution.",
					remediation: [
						"Reconnect or restart the selected host node.",
						"Verify the gateway shows connected=true for that node.",
					],
				},
			};
		}

		if (!node.commands?.includes("system.run")) {
			return {
				...normalized,
				runtimeBindingStatus: "unsupported_system_run",
				runtimeBindingTarget: bindingTarget,
				note: `Resolved node ${node.nodeId} does not advertise system.run, so host-backed git execution cannot continue on that node.`,
				blocker: {
					code: "unsupported_system_run",
					message:
						"The selected host node does not expose system.run, so bounded host execution is unavailable.",
					remediation: [
						"Use a host node that exposes system.run.",
						"Or adjust nodeSelector to a compatible node.",
					],
				},
			};
		}

		return {
			...normalized,
			runtimeBindingStatus: "bound",
			runtimeBindingTarget: bindingTarget,
			note: requestedSelector
				? `Host workflow is bound to node ${node.nodeId} via the configured selector and executes shell commands through node.invoke system.run.`
				: `Host workflow is bound to the only available node ${node.nodeId} and executes shell commands through node.invoke system.run.`,
			blocker: null,
		};
	} catch (error) {
		return {
			...normalized,
			runtimeBindingStatus: normalized.usedDefault
				? "selection_required"
				: "selector_unresolved",
			runtimeBindingTarget: null,
			note: normalized.usedDefault
				? "Multiple host nodes are available; configure nodeSelector so the bounded workflow can bind to one concrete host."
				: `Configured node selector could not be resolved against the current gateway node list: ${error instanceof Error ? error.message : String(error)}`,
			blocker: normalized.usedDefault
				? {
						code: "selection_required",
						message:
							"Multiple host nodes are available, so bounded execution needs an explicit nodeSelector.",
						remediation: [
							"Set plugin config nodeSelector to the intended host node.",
							"Then retry the bounded host git workflow.",
						],
					}
				: {
						code: "selector_unresolved",
						message:
							"Configured node selector could not be resolved against the current gateway node list.",
						remediation: [
							"Check the configured nodeSelector value.",
							"Ensure the intended host node is paired, visible, and connected=true.",
						],
					},
		};
	}
}
