import * as cheerio from "cheerio";
import type { ComponentSplit } from "../contract/request.js";

export type ExtractedDomKeyNode = {
	id: string;
	role: string;
	label: string;
	selector: string;
};

export type ExtractedDomIsland = {
	regionType: ComponentSplit;
	islandType: string;
	detectedRole: string;
	label: string;
	selectors: {
		css: string;
		xpath: string;
		domPath: string[];
	};
	anchors: {
		textMarkers: string[];
		landmarks: string[];
	};
	keyNodes: ExtractedDomKeyNode[];
	confidence: number;
	evidence: string[];
	note: string;
	sourceBacked: true;
};

export type ExtractedDomIslands = {
	islands: ExtractedDomIsland[];
};

const REGION_SELECTORS: Record<ComponentSplit, string[]> = {
	"app-shell": ["body"],
	sidebar: [
		"aside",
		'[role="complementary"]',
		".sidebar",
		".sidenav",
		'[class*="sidebar"]',
		'[class*="sidenav"]',
	],
	header: [
		"header",
		'[role="banner"]',
		".topbar",
		".header",
		'[class*="topbar"]',
		'[class*="header"]',
	],
	content: [
		"main",
		'[role="main"]',
		"#content",
		".content",
		'[class*="content"]',
	],
	footer: ["footer", '[role="contentinfo"]', ".footer", '[class*="footer"]'],
};

const REGION_META: Record<
	ComponentSplit,
	{ islandType: string; detectedRole: string; label: string }
> = {
	"app-shell": {
		islandType: "shell",
		detectedRole: "application-shell",
		label: "Application shell",
	},
	sidebar: {
		islandType: "nav",
		detectedRole: "navigation",
		label: "Sidebar navigation",
	},
	header: {
		islandType: "topbar",
		detectedRole: "page-header",
		label: "Header bar",
	},
	content: {
		islandType: "content",
		detectedRole: "primary-content",
		label: "Primary content",
	},
	footer: {
		islandType: "footer",
		detectedRole: "page-footer",
		label: "Footer",
	},
};

function isTagNode(node: unknown): node is {
	type: string;
	tagName?: string;
	parent?: unknown;
	prev?: unknown;
	next?: unknown;
	attribs?: Record<string, string>;
} {
	return typeof node === "object" && node !== null && "type" in node;
}

function isElementNode(node: unknown): node is {
	type: string;
	tagName: string;
	parent?: unknown;
	prev?: unknown;
	next?: unknown;
	attribs?: Record<string, string>;
} {
	return (
		isTagNode(node) &&
		typeof node.tagName === "string" &&
		(node.type === "tag" || node.type === "script" || node.type === "style")
	);
}

function hasTagName(
	node: unknown,
	tagName: string,
): node is {
	type: string;
	tagName: string;
	parent?: unknown;
	prev?: unknown;
	next?: unknown;
	attribs?: Record<string, string>;
} {
	return isElementNode(node) && node.tagName === tagName;
}

function nthOfType(node: { tagName: string; prev?: unknown }): number {
	let index = 1;
	let cursor = node.prev;

	while (cursor) {
		if (hasTagName(cursor, node.tagName)) {
			index += 1;
		}

		cursor = isTagNode(cursor) ? cursor.prev : undefined;
	}

	return index;
}

function cssSegment(node: {
	tagName: string;
	attribs?: Record<string, string>;
	prev?: unknown;
}): string {
	const attribs = node.attribs ?? {};
	if (typeof attribs.id === "string" && attribs.id.trim().length > 0) {
		return `${node.tagName}#${attribs.id.trim()}`;
	}

	if (typeof attribs.role === "string" && attribs.role.trim().length > 0) {
		return `${node.tagName}[role="${attribs.role.trim()}"]`;
	}

	if (
		typeof attribs["aria-label"] === "string" &&
		attribs["aria-label"].trim().length > 0
	) {
		return `${node.tagName}[aria-label="${attribs["aria-label"].trim().replace(/"/g, '\\"')}"]`;
	}

	const className =
		typeof attribs.class === "string" ? attribs.class.trim() : "";
	const firstClasses = className
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((entry) => `.${entry}`)
		.join("");

	return `${node.tagName}${firstClasses}:nth-of-type(${nthOfType(node)})`;
}

function xpathSegment(node: { tagName: string; prev?: unknown }): string {
	return `${node.tagName}[${nthOfType(node)}]`;
}

function buildSelectors(node: {
	tagName: string;
	parent?: unknown;
	prev?: unknown;
	attribs?: Record<string, string>;
}): {
	css: string;
	xpath: string;
	domPath: string[];
} {
	const cssParts: string[] = [];
	const xpathParts: string[] = [];
	const domPath: string[] = [];
	let cursor: unknown = node;

	while (isElementNode(cursor)) {
		cssParts.unshift(cssSegment(cursor));
		xpathParts.unshift(xpathSegment(cursor));
		domPath.unshift(cssSegment(cursor));
		cursor = cursor.parent;
	}

	return {
		css: cssParts.join(" > "),
		xpath: `/${xpathParts.join("/")}`,
		domPath,
	};
}

function normalizeText(value: string): string | undefined {
	const normalized = value.replace(/\s+/g, " ").trim();
	return normalized.length > 0 ? normalized : undefined;
}

function collectTextMarkers(
	_elementApi: cheerio.CheerioAPI,
	element: ReturnType<cheerio.CheerioAPI>,
): string[] {
	const markers = [
		normalizeText(element.attr("aria-label") ?? ""),
		normalizeText(element.attr("data-title") ?? ""),
		normalizeText(element.find("h1, h2, h3").first().text()),
		normalizeText(element.find("nav a").first().text()),
		normalizeText(element.find("button").first().text()),
	].filter((value): value is string => Boolean(value));

	return [...new Set(markers)].slice(0, 3);
}

function collectKeyNodes(
	$: cheerio.CheerioAPI,
	element: ReturnType<cheerio.CheerioAPI>,
): ExtractedDomKeyNode[] {
	const keyNodes: ExtractedDomKeyNode[] = [];
	const candidates = element
		.find("h1, h2, h3, nav, a, button, form, table")
		.slice(0, 8);

	candidates.each((index, node) => {
		if (!isElementNode(node)) {
			return;
		}

		const entry = $(node);
		const tagName = node.tagName;
		const label =
			normalizeText(entry.attr("aria-label") ?? "") ??
			normalizeText(entry.text()) ??
			tagName;

		keyNodes.push({
			id: `key-node-${index + 1}`,
			role: tagName,
			label,
			selector: buildSelectors(node).css,
		});
	});

	return keyNodes;
}

function extractRegion(
	$: cheerio.CheerioAPI,
	regionType: ComponentSplit,
): ExtractedDomIsland | undefined {
	for (const selector of REGION_SELECTORS[regionType]) {
		const element = $(selector).first();
		if (element.length === 0) {
			continue;
		}

		const node = element.get(0);
		if (!isElementNode(node)) {
			continue;
		}

		const selectors = buildSelectors(node);
		const meta = REGION_META[regionType];
		return {
			regionType,
			islandType: meta.islandType,
			detectedRole: meta.detectedRole,
			label: meta.label,
			selectors,
			anchors: {
				textMarkers: collectTextMarkers($, element),
				landmarks: [node.tagName],
			},
			keyNodes: collectKeyNodes($, element),
			confidence: regionType === "app-shell" ? 0.95 : 0.72,
			evidence: ["fetched-html", "dom-parse", "semantic-selector"],
			note: `Matched ${regionType} from selector \`${selector}\` in fetched HTML.`,
			sourceBacked: true,
		};
	}

	return undefined;
}

export function extractDomIslands(input: {
	html?: string;
	componentSplit: ComponentSplit[];
}): ExtractedDomIslands {
	if (!input.html) {
		return { islands: [] };
	}

	const $ = cheerio.load(input.html);
	const islands = input.componentSplit
		.map((regionType) => extractRegion($, regionType))
		.filter((entry): entry is ExtractedDomIsland => Boolean(entry));

	return { islands };
}
