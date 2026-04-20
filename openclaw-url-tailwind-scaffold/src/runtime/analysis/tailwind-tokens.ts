import type { ComponentSplit } from "../contract/request.js";
import type { AcquisitionMetadata } from "./acquisition.js";
import type {
	ExtractedDomIsland,
	ExtractedDomIslands,
	ExtractedDomKeyNode,
} from "./extract-dom-islands.js";

export type TailwindTokenCandidate = {
	id: string;
	label: string;
	themeVariable?: string;
	valueHint: string;
	utilityCandidates: string[];
	evidence: string[];
	confidence: number;
	source: "source-backed-dom" | "inferred-shell-pattern";
	note: string;
};

export type TailwindTokenGroup = {
	status: "source-backed" | "inferred";
	note: string;
	candidates: TailwindTokenCandidate[];
};

export type TailwindTokenSet = {
	colors: TailwindTokenGroup;
	spacing: TailwindTokenGroup;
	typography: TailwindTokenGroup;
	radius: TailwindTokenGroup;
	shadows: TailwindTokenGroup;
};

export type TailwindKeyNodeMapping = {
	keyNodeId: string;
	role: string;
	utilities: string[];
};

export type TailwindIslandMapping = {
	container: string[];
	surface: string[];
	spacing: string[];
	typography: string[];
	keyNodes: TailwindKeyNodeMapping[];
	tokenRefs: string[];
	note: string;
};

function hasMatchedRegion(
	extraction: ExtractedDomIslands,
	regionType: ComponentSplit,
): boolean {
	return extraction.islands.some((island) => island.regionType === regionType);
}

function buildEvidence(
	sourceBacked: boolean,
	regionType: ComponentSplit | "global",
): string[] {
	return sourceBacked
		? ["fetched-html", "dom-parse", regionType]
		: ["normalized-shell", "inferred-region", regionType];
}

function createCandidate(input: {
	id: string;
	label: string;
	themeVariable?: string;
	valueHint: string;
	utilityCandidates: string[];
	sourceBacked: boolean;
	regionType: ComponentSplit | "global";
	confidence: number;
	note: string;
}): TailwindTokenCandidate {
	return {
		id: input.id,
		label: input.label,
		themeVariable: input.themeVariable,
		valueHint: input.valueHint,
		utilityCandidates: input.utilityCandidates,
		evidence: buildEvidence(input.sourceBacked, input.regionType),
		confidence: input.confidence,
		source: input.sourceBacked ? "source-backed-dom" : "inferred-shell-pattern",
		note: input.note,
	};
}

export function buildTailwindTokenSet(input: {
	acquisition: AcquisitionMetadata;
	extraction: ExtractedDomIslands;
	componentSplit: ComponentSplit[];
}): TailwindTokenSet {
	const hasDomEvidence = input.acquisition.sourceBacked;
	const hasAppShell = hasMatchedRegion(input.extraction, "app-shell");
	const hasHeader = hasMatchedRegion(input.extraction, "header");
	const hasSidebar = hasMatchedRegion(input.extraction, "sidebar");
	const hasContent = hasMatchedRegion(input.extraction, "content");
	const hasFooter = hasMatchedRegion(input.extraction, "footer");
	const hasHeading = input.extraction.islands.some((island) =>
		island.keyNodes.some((keyNode) => /^h[1-3]$/u.test(keyNode.role)),
	);
	const hasNav = input.extraction.islands.some((island) =>
		island.keyNodes.some((keyNode) => keyNode.role === "nav"),
	);
	const hasButton = input.extraction.islands.some((island) =>
		island.keyNodes.some((keyNode) => keyNode.role === "button"),
	);

	return {
		colors: {
			status: "inferred",
			note: hasDomEvidence
				? "Color tokens are bounded Tailwind v4 theme candidates inferred from the extracted shell structure, not computed-style clones."
				: "Color tokens stay inferred until usable HTML evidence is available.",
			candidates: [
				createCandidate({
					id: "color-shell-bg",
					label: "Shell background",
					themeVariable: "--color-shell-bg",
					valueHint: "slate-950",
					utilityCandidates: ["bg-slate-950"],
					sourceBacked: hasAppShell,
					regionType: "app-shell",
					confidence: hasAppShell ? 0.62 : 0.38,
					note: "Primary app-shell surface candidate for the outer layout container.",
				}),
				createCandidate({
					id: "color-shell-fg",
					label: "Shell foreground",
					themeVariable: "--color-shell-fg",
					valueHint: "slate-50",
					utilityCandidates: ["text-slate-50"],
					sourceBacked: hasAppShell,
					regionType: "app-shell",
					confidence: hasAppShell ? 0.58 : 0.36,
					note: "High-contrast text candidate for shell chrome.",
				}),
				createCandidate({
					id: "color-shell-border",
					label: "Shell border",
					themeVariable: "--color-shell-border",
					valueHint: "white/10",
					utilityCandidates: ["border-white/10"],
					sourceBacked: hasHeader || hasSidebar || hasFooter,
					regionType: hasSidebar ? "sidebar" : hasHeader ? "header" : "footer",
					confidence: hasHeader || hasSidebar || hasFooter ? 0.56 : 0.34,
					note: "Low-contrast divider candidate for shell separators.",
				}),
				createCandidate({
					id: "color-panel-surface",
					label: "Panel surface",
					themeVariable: "--color-panel-surface",
					valueHint: "slate-900/60",
					utilityCandidates: ["bg-slate-900/60"],
					sourceBacked: hasContent || hasSidebar,
					regionType: hasContent ? "content" : "sidebar",
					confidence: hasContent || hasSidebar ? 0.52 : 0.32,
					note: "Secondary surface candidate for inner panels and content cards.",
				}),
			],
		},
		spacing: {
			status: "inferred",
			note: hasDomEvidence
				? "Spacing tokens are synthesized from shell composition and node density, then mapped to Tailwind scale candidates."
				: "Spacing tokens remain inferred because static acquisition did not produce usable HTML evidence.",
			candidates: [
				createCandidate({
					id: "space-shell-gutter",
					label: "Shell gutter",
					themeVariable: "--spacing-shell-gutter",
					valueHint: "6",
					utilityCandidates: ["p-6", "px-6", "py-6"],
					sourceBacked: hasHeader || hasContent || hasFooter,
					regionType: hasContent ? "content" : hasHeader ? "header" : "footer",
					confidence: hasHeader || hasContent || hasFooter ? 0.61 : 0.37,
					note: "Primary shell padding candidate for header, content, and footer framing.",
				}),
				createCandidate({
					id: "space-region-gap",
					label: "Region gap",
					themeVariable: "--spacing-region-gap",
					valueHint: "6",
					utilityCandidates: ["gap-6", "space-y-6"],
					sourceBacked: hasContent,
					regionType: "content",
					confidence: hasContent ? 0.6 : 0.35,
					note: "Vertical rhythm candidate for stacked content regions.",
				}),
				createCandidate({
					id: "space-control-inline",
					label: "Control inline padding",
					themeVariable: "--spacing-control-inline",
					valueHint: "4",
					utilityCandidates: ["px-4"],
					sourceBacked: hasButton || hasNav,
					regionType: hasButton ? "content" : "header",
					confidence: hasButton || hasNav ? 0.54 : 0.33,
					note: "Inline padding candidate for buttons and compact controls.",
				}),
				createCandidate({
					id: "space-control-block",
					label: "Control block padding",
					themeVariable: "--spacing-control-block",
					valueHint: "2",
					utilityCandidates: ["py-2"],
					sourceBacked: hasButton,
					regionType: "content",
					confidence: hasButton ? 0.51 : 0.31,
					note: "Block padding candidate for buttons and compact action rows.",
				}),
			],
		},
		typography: {
			status: "inferred",
			note:
				hasHeading || hasNav
					? "Typography candidates are inferred from extracted headings, nav, and action nodes rather than from donor CSS."
					: "Typography candidates stay generic until the extractor sees usable heading or navigation cues.",
			candidates: [
				createCandidate({
					id: "type-shell-title",
					label: "Shell title",
					themeVariable: "--font-shell-display",
					valueHint: "text-3xl font-semibold tracking-tight",
					utilityCandidates: ["text-3xl", "font-semibold", "tracking-tight"],
					sourceBacked: hasHeading,
					regionType: "content",
					confidence: hasHeading ? 0.63 : 0.34,
					note: "Large heading candidate for primary page titles.",
				}),
				createCandidate({
					id: "type-nav-label",
					label: "Navigation label",
					themeVariable: "--font-shell-nav",
					valueHint: "text-sm font-medium",
					utilityCandidates: ["text-sm", "font-medium"],
					sourceBacked: hasNav,
					regionType: "header",
					confidence: hasNav ? 0.58 : 0.34,
					note: "Compact navigation label candidate for menus and topbar links.",
				}),
				createCandidate({
					id: "type-body-copy",
					label: "Body copy",
					valueHint: "text-base leading-7",
					utilityCandidates: ["text-base", "leading-7"],
					sourceBacked: hasContent,
					regionType: "content",
					confidence: hasContent ? 0.49 : 0.32,
					note: "Default body text candidate for primary content surfaces.",
				}),
				createCandidate({
					id: "type-meta-copy",
					label: "Meta copy",
					valueHint: "text-sm text-slate-400",
					utilityCandidates: ["text-sm", "text-slate-400"],
					sourceBacked: hasFooter || hasSidebar,
					regionType: hasFooter ? "footer" : "sidebar",
					confidence: hasFooter || hasSidebar ? 0.46 : 0.3,
					note: "Secondary text candidate for footer and shell metadata.",
				}),
			],
		},
		radius: {
			status: "inferred",
			note: "Radius tokens are conservative Tailwind candidates for shell panels and controls, not extracted border-radius values.",
			candidates: [
				createCandidate({
					id: "radius-panel",
					label: "Panel radius",
					themeVariable: "--radius-panel",
					valueHint: "xl",
					utilityCandidates: ["rounded-xl"],
					sourceBacked: hasContent || hasSidebar,
					regionType: hasContent ? "content" : "sidebar",
					confidence: hasContent || hasSidebar ? 0.44 : 0.28,
					note: "Large radius candidate for cards and panels inside the shell.",
				}),
				createCandidate({
					id: "radius-control",
					label: "Control radius",
					themeVariable: "--radius-control",
					valueHint: "lg",
					utilityCandidates: ["rounded-lg"],
					sourceBacked: hasButton,
					regionType: "content",
					confidence: hasButton ? 0.47 : 0.29,
					note: "Control radius candidate for buttons and compact inputs.",
				}),
			],
		},
		shadows: {
			status: "inferred",
			note: "Shadow tokens remain bounded utility candidates until later slices can inspect computed styles.",
			candidates: [
				createCandidate({
					id: "shadow-panel",
					label: "Panel shadow",
					themeVariable: "--shadow-panel",
					valueHint: "sm",
					utilityCandidates: ["shadow-sm"],
					sourceBacked: hasContent,
					regionType: "content",
					confidence: hasContent ? 0.41 : 0.26,
					note: "Light elevation candidate for content panels and data cards.",
				}),
				createCandidate({
					id: "shadow-elevated",
					label: "Elevated control shadow",
					themeVariable: "--shadow-elevated",
					valueHint: "md",
					utilityCandidates: ["shadow-md"],
					sourceBacked: hasButton || hasHeader,
					regionType: hasButton ? "content" : "header",
					confidence: hasButton || hasHeader ? 0.38 : 0.24,
					note: "Medium elevation candidate for action clusters and prominent shell chrome.",
				}),
			],
		},
	};
}

function keyNodeUtilities(role: string): string[] {
	switch (role) {
		case "h1":
			return ["text-3xl", "font-semibold", "tracking-tight"];
		case "h2":
			return ["text-2xl", "font-semibold", "tracking-tight"];
		case "h3":
			return ["text-lg", "font-medium"];
		case "nav":
			return ["flex", "items-center", "gap-4", "text-sm", "font-medium"];
		case "a":
			return ["text-sm", "font-medium", "text-slate-200"];
		case "button":
			return [
				"inline-flex",
				"items-center",
				"justify-center",
				"rounded-lg",
				"px-4",
				"py-2",
				"text-sm",
				"font-medium",
			];
		case "form":
			return ["space-y-4"];
		case "table":
			return ["w-full", "text-sm", "border-collapse"];
		default:
			return ["text-base"];
	}
}

function regionContainerUtilities(regionType: ComponentSplit): string[] {
	switch (regionType) {
		case "app-shell":
			return ["min-h-screen", "bg-slate-950", "text-slate-50"];
		case "sidebar":
			return [
				"w-72",
				"shrink-0",
				"border-r",
				"border-white/10",
				"px-4",
				"py-6",
			];
		case "header":
			return [
				"flex",
				"items-center",
				"justify-between",
				"gap-4",
				"border-b",
				"border-white/10",
				"px-6",
				"py-4",
			];
		case "content":
			return ["flex-1", "space-y-6", "p-6"];
		case "footer":
			return ["border-t", "border-white/10", "px-6", "py-4"];
		default:
			return ["space-y-4"];
	}
}

function regionSurfaceUtilities(regionType: ComponentSplit): string[] {
	switch (regionType) {
		case "app-shell":
			return ["bg-slate-950", "text-slate-50"];
		case "sidebar":
			return ["bg-slate-900/60", "text-slate-100"];
		case "header":
			return ["bg-slate-950/80", "backdrop-blur"];
		case "content":
			return ["bg-slate-900/60", "rounded-xl", "shadow-sm"];
		case "footer":
			return ["text-slate-400"];
		default:
			return [];
	}
}

function regionSpacingUtilities(regionType: ComponentSplit): string[] {
	switch (regionType) {
		case "app-shell":
			return ["gap-6"];
		case "sidebar":
			return ["space-y-4", "px-4", "py-6"];
		case "header":
			return ["gap-4", "px-6", "py-4"];
		case "content":
			return ["space-y-6", "p-6"];
		case "footer":
			return ["px-6", "py-4"];
		default:
			return ["space-y-4"];
	}
}

function regionTypographyUtilities(regionType: ComponentSplit): string[] {
	switch (regionType) {
		case "app-shell":
			return ["font-sans", "text-base"];
		case "sidebar":
			return ["text-sm", "font-medium"];
		case "header":
			return ["text-sm", "font-medium"];
		case "content":
			return ["text-base", "leading-7"];
		case "footer":
			return ["text-sm", "text-slate-400"];
		default:
			return ["text-base"];
	}
}

function regionTokenRefs(regionType: ComponentSplit): string[] {
	switch (regionType) {
		case "app-shell":
			return [
				"color-shell-bg",
				"color-shell-fg",
				"space-shell-gutter",
				"type-body-copy",
			];
		case "sidebar":
			return [
				"color-panel-surface",
				"color-shell-border",
				"space-control-inline",
				"type-nav-label",
			];
		case "header":
			return [
				"color-shell-border",
				"space-shell-gutter",
				"space-region-gap",
				"type-nav-label",
			];
		case "content":
			return [
				"color-panel-surface",
				"space-shell-gutter",
				"space-region-gap",
				"type-shell-title",
				"radius-panel",
				"shadow-panel",
			];
		case "footer":
			return ["color-shell-border", "space-shell-gutter", "type-meta-copy"];
		default:
			return ["type-body-copy"];
	}
}

export function buildTailwindIslandMapping(input: {
	regionType: ComponentSplit;
	island?: ExtractedDomIsland;
}): TailwindIslandMapping {
	const keyNodes = (input.island?.keyNodes ?? []).map(
		(keyNode: ExtractedDomKeyNode) => ({
			keyNodeId: keyNode.id,
			role: keyNode.role,
			utilities: keyNodeUtilities(keyNode.role),
		}),
	);

	return {
		container: regionContainerUtilities(input.regionType),
		surface: regionSurfaceUtilities(input.regionType),
		spacing: regionSpacingUtilities(input.regionType),
		typography: regionTypographyUtilities(input.regionType),
		keyNodes,
		tokenRefs: regionTokenRefs(input.regionType),
		note: input.island
			? "Tailwind v4 utility candidates were refined from the matched shell region and its extracted key nodes."
			: "Tailwind v4 utility candidates remain inferred because this shell region was not matched confidently in fetched HTML.",
	};
}
