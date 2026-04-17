declare module "@openclaw/plugin-sdk" {
	export type AnyAgentTool = unknown;
	export type PluginRuntime = unknown;
	export type OpenClawPluginToolContext = {
		agentId?: string;
		sessionKey?: string;
	};
	export type OpenClawPluginApi = {
		pluginConfig?: Record<string, unknown>;
		runtime: PluginRuntime;
		registerTool(
			tool: unknown | ((context: OpenClawPluginToolContext) => unknown),
			opts?: { optional?: boolean },
		): void;
	};
}

declare module "openclaw/plugin-sdk/plugin-entry" {
	export function definePluginEntry(entry: {
		id: string;
		name: string;
		description: string;
		register(api: import("@openclaw/plugin-sdk").OpenClawPluginApi): void;
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
