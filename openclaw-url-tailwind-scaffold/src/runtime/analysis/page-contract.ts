import type { NormalizedUrlTailwindScaffoldRequest } from "../contract/request.js";
import type { AcquisitionMetadata } from "./acquisition.js";
import type {
	ExtractedDomIsland,
	ExtractedDomIslands,
} from "./extract-dom-islands.js";
import type { NormalizedTailwindAppShell } from "./normalize-shell.js";

export type ReferencePageContract = {
	schemaVersion: 1;
	kind: "url-tailwind-page-contract";
	source: {
		url: string;
		requestedUrl: string;
		acquisitionMode: AcquisitionMetadata["mode"];
		fetchStatus: AcquisitionMetadata["fetchStatus"];
		sourceBacked: boolean;
		http: AcquisitionMetadata["http"];
		document: AcquisitionMetadata["document"];
		note: string;
		failure?: string;
	};
	page: {
		frameworkTarget: "html";
		layoutModel: "app-shell";
		pageType: "reference-url-shell";
		composition: string[];
	};
	islands: Array<{
		id: string;
		regionType: string;
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
		layout: {
			status: "source-backed-dom" | "synthetic-request-mode";
			note: string;
		};
		keyNodes: Array<{
			id: string;
			role: string;
			label: string;
			selector: string;
		}>;
		tailwindMapping: {
			container: string[];
		};
		confidence: number;
		evidence: string[];
	}>;
	tokens: {
		colors: {
			status: "source-backed" | "inferred";
			note: string;
		};
		spacing: {
			status: "source-backed" | "inferred";
			note: string;
		};
		typography: {
			status: "source-backed" | "inferred";
			note: string;
		};
	};
	boundaries: {
		multiAgentOrchestration: "external-only";
		filePersistence: "external-only";
		note: string;
	};
};

function toIslandType(regionType: string): string {
	switch (regionType) {
		case "app-shell":
			return "shell";
		case "sidebar":
			return "nav";
		case "header":
			return "topbar";
		case "content":
			return "content";
		case "footer":
			return "footer";
		default:
			return "section";
	}
}

function toDetectedRole(regionType: string): string {
	switch (regionType) {
		case "sidebar":
			return "navigation";
		case "header":
			return "page-header";
		case "content":
			return "primary-content";
		case "footer":
			return "page-footer";
		default:
			return "application-shell";
	}
}

function toContainerClasses(regionType: string): string[] {
	switch (regionType) {
		case "app-shell":
			return ["min-h-screen", "bg-slate-950", "text-slate-50"];
		case "sidebar":
			return ["w-72", "shrink-0", "border-r", "border-white/10"];
		case "header":
			return ["flex", "items-center", "justify-between", "gap-4"];
		case "content":
			return ["flex-1", "space-y-6", "p-6"];
		case "footer":
			return ["border-t", "border-white/10", "px-6", "py-4"];
		default:
			return ["space-y-4"];
	}
}

export function buildReferencePageContract(input: {
	request: NormalizedUrlTailwindScaffoldRequest;
	acquisition: AcquisitionMetadata;
	extraction: ExtractedDomIslands;
	normalizedShell: NormalizedTailwindAppShell;
}): ReferencePageContract {
	function fallbackIsland(
		region: NormalizedTailwindAppShell["regions"][number],
		index: number,
	) {
		return {
			id: `island-${region.name}-${index + 1}`,
			regionType: region.name,
			islandType: toIslandType(region.name),
			detectedRole: toDetectedRole(region.name),
			label: `${region.name} scaffold island`,
			selectors: {
				css: `[data-openclaw-region="${region.name}"]`,
				xpath: `//*[@data-openclaw-region='${region.name}']`,
				domPath: ["app-shell", region.name],
			},
			anchors: {
				textMarkers: [],
				landmarks: [region.name],
			},
			layout: {
				status: "synthetic-request-mode" as const,
				note: region.note,
			},
			keyNodes: [
				{
					id: `${region.name}-container`,
					role: region.name,
					label: `${region.name} container`,
					selector: `[data-openclaw-region="${region.name}"]`,
				},
			],
			tailwindMapping: {
				container: toContainerClasses(region.name),
			},
			confidence: input.acquisition.sourceBacked ? 0.3 : 0.2,
			evidence: input.acquisition.sourceBacked
				? ["fetched-html", "normalized-shell", "inferred-region"]
				: ["normalized-shell", "inferred-placeholder"],
		};
	}

	function extractedIslandToContract(
		island: ExtractedDomIsland,
	): ReferencePageContract["islands"][number] {
		return {
			id: `island-${island.regionType}-1`,
			regionType: island.regionType,
			islandType: island.islandType,
			detectedRole: island.detectedRole,
			label: island.label,
			selectors: island.selectors,
			anchors: island.anchors,
			layout: {
				status: "source-backed-dom",
				note: island.note,
			},
			keyNodes: island.keyNodes,
			tailwindMapping: {
				container: toContainerClasses(island.regionType),
			},
			confidence: island.confidence,
			evidence: island.evidence,
		};
	}

	return {
		schemaVersion: 1,
		kind: "url-tailwind-page-contract",
		source: {
			url: input.acquisition.sourceUrl,
			requestedUrl: input.acquisition.requestedUrl,
			acquisitionMode: input.acquisition.mode,
			fetchStatus: input.acquisition.fetchStatus,
			sourceBacked: input.acquisition.sourceBacked,
			http: input.acquisition.http,
			document: input.acquisition.document,
			note: input.acquisition.note,
			failure: input.acquisition.failure,
		},
		page: {
			frameworkTarget: input.request.frameworkHint,
			layoutModel: "app-shell",
			pageType: "reference-url-shell",
			composition: input.normalizedShell.regions.map((region) => region.name),
		},
		islands: input.normalizedShell.regions.map((region, index) => {
			const extractedIsland = input.extraction.islands.find(
				(island) => island.regionType === region.name,
			);

			return extractedIsland
				? extractedIslandToContract(extractedIsland)
				: fallbackIsland(region, index);
		}),
		tokens: input.normalizedShell.tokens,
		boundaries: {
			multiAgentOrchestration: "external-only",
			filePersistence: "external-only",
			note: "This plugin may feed a wider skill or agent workflow, but spawning subagents, coordinating multi-step analysis, and writing artifact files stay outside the plugin boundary.",
		},
	};
}
