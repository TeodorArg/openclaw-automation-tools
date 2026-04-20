import type {
	ComponentSplit,
	NormalizedUrlTailwindScaffoldRequest,
} from "../contract/request.js";
import type { AcquisitionMetadata } from "./acquisition.js";
import type { ExtractedDomIslands } from "./extract-dom-islands.js";

export type NormalizedTailwindAppShell = {
	schemaVersion: 1;
	kind: "normalized-url-tailwind-shell";
	frameworkTarget: "html";
	tailwindVersion: "v4";
	source: {
		url: string;
		acquisitionMode: AcquisitionMetadata["mode"];
	};
	regions: Array<{
		name: ComponentSplit;
		sourceBacked: boolean;
		note: string;
	}>;
	tokens: {
		colors: { status: "source-backed" | "inferred"; note: string };
		spacing: { status: "source-backed" | "inferred"; note: string };
		typography: { status: "source-backed" | "inferred"; note: string };
	};
	componentPlan: {
		generatedFiles: string[];
	};
	optionalSurfaces: string[];
	unresolvedAreas: string[];
};

export function buildNormalizedTailwindAppShell(
	request: NormalizedUrlTailwindScaffoldRequest,
	acquisition: AcquisitionMetadata,
	extraction: ExtractedDomIslands,
): NormalizedTailwindAppShell {
	const componentSplit = request.componentSplit ?? [
		"app-shell",
		"sidebar",
		"header",
		"content",
		"footer",
	];
	return {
		schemaVersion: 1,
		kind: "normalized-url-tailwind-shell",
		frameworkTarget: request.frameworkHint ?? "html",
		tailwindVersion: "v4",
		source: {
			url: acquisition.sourceUrl,
			acquisitionMode: acquisition.mode,
		},
		regions: componentSplit.map((name) => {
			const matchedIsland = extraction.islands.find(
				(island) => island.regionType === name,
			);

			return {
				name,
				sourceBacked: Boolean(matchedIsland),
				note: matchedIsland
					? matchedIsland.note
					: acquisition.sourceBacked
						? `${name} stayed unresolved after static HTML parsing. No confident DOM landmark matched this region in the current slice.`
						: `${name} is kept as an inferred placeholder because live page extraction did not produce usable HTML evidence for this request.`,
			};
		}),
		tokens: {
			colors: {
				status: "inferred",
				note: "Color tokens stay semantic and map into Tailwind CSS v4 `@theme` variables. The current slice does not derive them from fetched HTML yet.",
			},
			spacing: {
				status: "inferred",
				note: "Spacing scale is normalized into a reusable shell rhythm rather than donor CSS classes.",
			},
			typography: {
				status: "inferred",
				note: "Typography defaults to a bounded app-shell hierarchy instead of page-clone fidelity.",
			},
		},
		componentPlan: {
			generatedFiles: [
				"app.css",
				"components/AppShell.html",
				"components/Sidebar.html",
				"components/Header.html",
				"components/Footer.html",
				"components/Content.html",
			],
		},
		optionalSurfaces: ["settings drawer", "notifications", "overlays"],
		unresolvedAreas: acquisition.sourceBacked
			? componentSplit
					.filter(
						(name) =>
							!extraction.islands.some((island) => island.regionType === name),
					)
					.map(
						(name) =>
							`${name} could not be matched confidently from fetched HTML in the current static DOM slice.`,
					)
			: [
					"Static acquisition did not yield usable source HTML. Region extraction, selector derivation, and token extraction remain unresolved.",
				],
	};
}
