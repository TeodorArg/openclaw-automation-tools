export type OpenClawNodeListEntry = {
	nodeId: string;
	displayName?: string;
	platform?: string;
	commands?: string[];
	connected?: boolean;
};

export type OpenClawBrowserSupport = {
	callGatewayTool<T = Record<string, unknown>>(
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
	listNodes(opts?: {
		gatewayUrl?: string;
		gatewayToken?: string;
		timeoutMs?: number;
	}): Promise<OpenClawNodeListEntry[]>;
	resolveNodeIdFromList(
		nodes: OpenClawNodeListEntry[],
		query?: string,
		allowDefault?: boolean,
	): string;
};

export async function loadOpenClawBrowserSupport(): Promise<OpenClawBrowserSupport> {
	return (await import(
		"openclaw/plugin-sdk/browser-support"
	)) as OpenClawBrowserSupport;
}
