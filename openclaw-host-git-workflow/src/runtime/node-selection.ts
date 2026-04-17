export const DEFAULT_NODE_SELECTOR_PLACEHOLDER =
	"pending-host-node-runtime-binding";

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
	normalizedSelector: string;
	selectionSource: NodeSelectionSource;
	selectionMode: NodeSelectionMode;
	usedDefault: boolean;
	runtimeBindingStatus: "not_bound";
	runtimeBindingTarget: null;
	note: string;
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
};

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

export function resolveHostNodeSelection(
	input: NodeSelectionInput = {},
): HostNodeSelection {
	const configuredSelector = readConfiguredSelector(input.pluginConfig);
	if (configuredSelector) {
		return {
			requestedSelector: configuredSelector,
			normalizedSelector: configuredSelector,
			selectionSource: "pluginConfig.nodeSelector",
			selectionMode: "configured",
			usedDefault: false,
			runtimeBindingStatus: "not_bound",
			runtimeBindingTarget: null,
			note: "Node selector is configured, but this package slice is not yet bound to runtime node.invoke.",
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
			runtimeBindingStatus: "not_bound",
			runtimeBindingTarget: null,
			note: "Node selector came from environment fallback, but this package slice is not yet bound to runtime node.invoke.",
		};
	}

	return {
		requestedSelector: DEFAULT_NODE_SELECTOR_PLACEHOLDER,
		normalizedSelector: DEFAULT_NODE_SELECTOR_PLACEHOLDER,
		selectionSource: "default",
		selectionMode: "default_placeholder",
		usedDefault: true,
		runtimeBindingStatus: "not_bound",
		runtimeBindingTarget: null,
		note: "Node selection falls back to a placeholder contract until runtime node.invoke binding lands in a later slice.",
	};
}
