export const URL_TAILWIND_SCAFFOLD_TOOL_NAME =
	"url_tailwind_scaffold_action" as const;
export const URL_TAILWIND_SCAFFOLD_FLOW = "analyze_reference_page" as const;
export const URL_TAILWIND_SCAFFOLD_SKILL_NAME =
	"openclaw-url-tailwind-scaffold" as const;

export const SUPPORTED_COMPONENT_SPLIT = [
	"app-shell",
	"sidebar",
	"header",
	"content",
	"footer",
] as const;

export type ComponentSplit = (typeof SUPPORTED_COMPONENT_SPLIT)[number];
export type AcquisitionMode =
	| "fetch-backed"
	| "browser-assisted"
	| "unresolved";

export type ReferencePageRequest = {
	url: string;
	goal?: string;
	outputMode?: "scaffold_summary";
	componentSplit?: ComponentSplit[];
	frameworkHint?: "html";
	acquisitionMode?: AcquisitionMode;
};

export type UrlTailwindScaffoldRequest = {
	action?: typeof URL_TAILWIND_SCAFFOLD_FLOW;
	command: string;
	commandName: string;
	skillName: typeof URL_TAILWIND_SCAFFOLD_SKILL_NAME;
	url?: string;
	goal?: string;
	outputMode?: "scaffold_summary";
	componentSplit?: ComponentSplit[];
	frameworkHint?: "html";
	acquisitionMode?: AcquisitionMode;
};

export type NormalizedUrlTailwindScaffoldRequest = {
	action: typeof URL_TAILWIND_SCAFFOLD_FLOW;
	command: string;
	commandName: string;
	skillName: typeof URL_TAILWIND_SCAFFOLD_SKILL_NAME;
	url: string;
	goal?: string;
	outputMode: "scaffold_summary";
	componentSplit: ComponentSplit[];
	frameworkHint: "html";
	acquisitionMode: AcquisitionMode;
};

export const UrlTailwindScaffoldRequestSchema = {
	type: "object",
	additionalProperties: false,
	required: ["command", "commandName", "skillName"],
	properties: {
		action: {
			type: "string",
			enum: [URL_TAILWIND_SCAFFOLD_FLOW],
		},
		command: {
			type: "string",
			minLength: 1,
		},
		commandName: {
			type: "string",
			minLength: 1,
		},
		skillName: {
			type: "string",
			enum: [URL_TAILWIND_SCAFFOLD_SKILL_NAME],
		},
		url: {
			type: "string",
			minLength: 1,
		},
		goal: {
			type: "string",
			minLength: 1,
		},
		outputMode: {
			type: "string",
			enum: ["scaffold_summary"],
		},
		componentSplit: {
			type: "array",
			items: {
				type: "string",
				enum: [...SUPPORTED_COMPONENT_SPLIT],
			},
		},
		frameworkHint: {
			type: "string",
			enum: ["html"],
		},
		acquisitionMode: {
			type: "string",
			enum: ["fetch-backed", "browser-assisted", "unresolved"],
		},
	},
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, fieldName: string): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new Error(`Expected ${fieldName} to be a non-empty string.`);
	}

	return value.trim();
}

function requireUrl(value: unknown, fieldName: string): string {
	const normalized = requireString(value, fieldName);

	try {
		return new URL(normalized).toString();
	} catch {
		throw new Error(`Expected ${fieldName} to be a valid URL.`);
	}
}

function optionalStringArray(
	value: unknown,
	fieldName: string,
): string[] | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (!Array.isArray(value)) {
		throw new Error(`Expected ${fieldName} to be an array of strings.`);
	}

	const normalized = value.map((item) => requireString(item, fieldName));

	return normalized.length > 0 ? normalized : [];
}

function isComponentSplit(value: string): value is ComponentSplit {
	return (SUPPORTED_COMPONENT_SPLIT as readonly string[]).includes(value);
}

function optionalComponentSplit(value: unknown): ComponentSplit[] | undefined {
	const entries = optionalStringArray(value, "componentSplit");
	if (!entries) {
		return undefined;
	}

	for (const entry of entries) {
		if (!isComponentSplit(entry)) {
			throw new Error(`Unsupported componentSplit entry: ${entry}.`);
		}
	}

	return entries as ComponentSplit[];
}

function parseCommandObject(
	command: string,
): Record<string, unknown> | undefined {
	const trimmed = command.trim();
	if (trimmed.length === 0) {
		return undefined;
	}

	if (!(trimmed.startsWith("{") && trimmed.endsWith("}"))) {
		return undefined;
	}

	try {
		const parsed = JSON.parse(trimmed);
		return isRecord(parsed) ? parsed : undefined;
	} catch {
		throw new Error(
			"command must be valid JSON when JSON raw-command mode is used.",
		);
	}
}

function resolveCommandUrl(
	command: string,
	urlField: unknown,
	commandObject?: Record<string, unknown>,
): string {
	if (urlField !== undefined) {
		return requireUrl(urlField, "url");
	}

	if (commandObject && commandObject.url !== undefined) {
		return requireUrl(commandObject.url, "command.url");
	}

	const trimmed = command.trim();
	if (trimmed.length > 0 && !trimmed.startsWith("{")) {
		return requireUrl(trimmed, "command");
	}

	throw new Error(
		"url_tailwind_scaffold_action requires a valid URL in `url` or raw `command`.",
	);
}

function resolveOptionalString(
	value: unknown,
	commandObject: Record<string, unknown> | undefined,
	_fieldName: string,
	commandFieldName: string,
): string | undefined {
	if (typeof value === "string" && value.trim().length > 0) {
		return value.trim();
	}

	const commandValue = commandObject?.[commandFieldName];
	if (typeof commandValue === "string" && commandValue.trim().length > 0) {
		return commandValue.trim();
	}

	return undefined;
}

function resolveAcquisitionMode(
	value: unknown,
	commandObject?: Record<string, unknown>,
): AcquisitionMode | undefined {
	const candidate =
		typeof value === "string" && value.trim().length > 0
			? value
			: typeof commandObject?.acquisitionMode === "string"
				? commandObject.acquisitionMode
				: undefined;

	if (
		candidate === "browser-assisted" ||
		candidate === "unresolved" ||
		candidate === "fetch-backed"
	) {
		return candidate;
	}

	return undefined;
}

function resolveFrameworkHint(
	value: unknown,
	commandObject?: Record<string, unknown>,
): "html" | undefined {
	const candidate =
		value === "html"
			? value
			: commandObject?.frameworkHint === "html"
				? "html"
				: undefined;

	return candidate;
}

function resolveOutputMode(
	value: unknown,
	commandObject?: Record<string, unknown>,
): "scaffold_summary" | undefined {
	const candidate =
		value === "scaffold_summary"
			? value
			: commandObject?.outputMode === "scaffold_summary"
				? "scaffold_summary"
				: undefined;

	return candidate;
}

function resolveComponentSplit(
	value: unknown,
	commandObject?: Record<string, unknown>,
): ComponentSplit[] | undefined {
	return optionalComponentSplit(value ?? commandObject?.componentSplit);
}

export function validateUrlTailwindScaffoldRequest(
	value: unknown,
): NormalizedUrlTailwindScaffoldRequest {
	if (!isRecord(value)) {
		throw new Error("Expected a request object.");
	}

	const action =
		value.action === undefined
			? URL_TAILWIND_SCAFFOLD_FLOW
			: requireString(value.action, "action");
	if (action !== URL_TAILWIND_SCAFFOLD_FLOW) {
		throw new Error(
			`Unsupported url_tailwind_scaffold_action request action: ${action}.`,
		);
	}

	const commandName = requireString(value.commandName, "commandName");
	if (
		commandName !== URL_TAILWIND_SCAFFOLD_TOOL_NAME &&
		commandName !== URL_TAILWIND_SCAFFOLD_SKILL_NAME
	) {
		throw new Error(
			`commandName must be ${URL_TAILWIND_SCAFFOLD_TOOL_NAME} or ${URL_TAILWIND_SCAFFOLD_SKILL_NAME}.`,
		);
	}

	const skillName = requireString(value.skillName, "skillName");
	if (skillName !== URL_TAILWIND_SCAFFOLD_SKILL_NAME) {
		throw new Error(`skillName must be ${URL_TAILWIND_SCAFFOLD_SKILL_NAME}.`);
	}

	const command = requireString(value.command, "command");
	const commandObject = parseCommandObject(command);

	return {
		action: URL_TAILWIND_SCAFFOLD_FLOW,
		command,
		commandName,
		skillName: URL_TAILWIND_SCAFFOLD_SKILL_NAME,
		url: resolveCommandUrl(command, value.url, commandObject),
		goal: resolveOptionalString(value.goal, commandObject, "goal", "goal"),
		outputMode:
			resolveOutputMode(value.outputMode, commandObject) ?? "scaffold_summary",
		componentSplit: resolveComponentSplit(
			value.componentSplit,
			commandObject,
		) ?? [...SUPPORTED_COMPONENT_SPLIT],
		frameworkHint:
			resolveFrameworkHint(value.frameworkHint, commandObject) ?? "html",
		acquisitionMode:
			resolveAcquisitionMode(value.acquisitionMode, commandObject) ??
			"fetch-backed",
	};
}
