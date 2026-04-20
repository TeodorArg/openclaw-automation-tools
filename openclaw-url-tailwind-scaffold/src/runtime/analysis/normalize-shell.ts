import type {
	ComponentSplit,
	NormalizedUrlTailwindScaffoldRequest,
} from "../contract/request.js";
import type { AcquisitionMetadata } from "./acquisition.js";

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
): NormalizedTailwindAppShell {
	const componentSplit = request.componentSplit ?? [
		"app-shell",
		"sidebar",
		"header",
		"content",
		"footer",
	];
	const sourceBacked = acquisition.sourceBacked;

	return {
		schemaVersion: 1,
		kind: "normalized-url-tailwind-shell",
		frameworkTarget: request.frameworkHint ?? "html",
		tailwindVersion: "v4",
		source: {
			url: acquisition.sourceUrl,
			acquisitionMode: acquisition.mode,
		},
		regions: componentSplit.map((name) => ({
			name,
			sourceBacked,
			note: sourceBacked
				? `${name} is labeled source-backed only as a synthetic request-mode signal in the current reference-URL-driven slice.`
				: `${name} is kept as an inferred placeholder because live page extraction is not active for this request mode.`,
		})),
		tokens: {
			colors: {
				status: sourceBacked ? "source-backed" : "inferred",
				note: "Color tokens stay semantic and map into Tailwind CSS v4 `@theme` variables.",
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
		unresolvedAreas:
			acquisition.mode === "fetch-backed"
				? []
				: [
						"Non-default acquisition modes are outside the current shipped reference-URL-driven v1 scope.",
					],
	};
}
