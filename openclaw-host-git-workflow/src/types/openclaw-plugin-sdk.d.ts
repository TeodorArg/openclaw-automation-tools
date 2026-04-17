declare module "openclaw/plugin-sdk/plugin-entry" {
	type OpenClawPluginApi = {
		pluginConfig?: Record<string, unknown>;
		runtime: unknown;
		registerTool(
			tool:
				| unknown
				| ((context: { agentId?: string; sessionKey?: string }) => unknown),
			opts?: { optional?: boolean },
		): void;
	};

	export function definePluginEntry(entry: {
		id: string;
		name: string;
		description: string;
		register(api: OpenClawPluginApi): void;
	}): unknown;
}

declare module "openclaw/plugin-sdk/browser-support" {
	export type NodeListNode = {
		nodeId: string;
		displayName?: string;
		platform?: string;
		commands?: string[];
		connected?: boolean;
	};

	export function listNodes(opts?: {
		gatewayUrl?: string;
		gatewayToken?: string;
		timeoutMs?: number;
	}): Promise<NodeListNode[]>;

	export function resolveNodeIdFromList(
		nodes: NodeListNode[],
		query?: string,
		allowDefault?: boolean,
	): string;

	export function callGatewayTool<T = Record<string, unknown>>(
		method: string,
		opts: {
			gatewayUrl?: string;
			gatewayToken?: string;
			timeoutMs?: number;
		},
		params?: unknown,
		extra?: {
			expectFinal?: boolean;
		},
	): Promise<T>;
}
