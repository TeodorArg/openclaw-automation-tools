import {
	URL_TAILWIND_SCAFFOLD_TOOL_NAME,
	type UrlTailwindScaffoldRequest,
	UrlTailwindScaffoldRequestSchema,
	validateUrlTailwindScaffoldRequest,
} from "../contract/request.js";
import { analyzeReferencePage } from "./analyze-reference-page.js";

export type UrlTailwindScaffoldToolResult = {
	content: Array<{
		type: "text";
		text: string;
	}>;
};

export type UrlTailwindScaffoldTool = {
	name: typeof URL_TAILWIND_SCAFFOLD_TOOL_NAME;
	description: string;
	parameters: typeof UrlTailwindScaffoldRequestSchema;
	execute(
		_toolCallId: string,
		params: UrlTailwindScaffoldRequest,
	): Promise<UrlTailwindScaffoldToolResult>;
};

type UrlTailwindScaffoldToolOptions = {
	pluginConfig?: Record<string, unknown>;
	toolContext?: {
		agentId?: string;
		sessionKey?: string;
	};
};

function formatJsonContent(payload: unknown) {
	return {
		content: [
			{
				type: "text" as const,
				text: JSON.stringify(payload, null, 2),
			},
		],
	};
}

export function createUrlTailwindScaffoldTool(
	_options: UrlTailwindScaffoldToolOptions = {},
): UrlTailwindScaffoldTool {
	return {
		name: URL_TAILWIND_SCAFFOLD_TOOL_NAME,
		description:
			"Accepts a reference page URL and returns a bounded Tailwind CSS v4 scaffold summary or page contract.",
		parameters: UrlTailwindScaffoldRequestSchema,
		async execute(_toolCallId: string, params: UrlTailwindScaffoldRequest) {
			const request = validateUrlTailwindScaffoldRequest(params);
			return formatJsonContent(await analyzeReferencePage(request));
		},
	};
}
