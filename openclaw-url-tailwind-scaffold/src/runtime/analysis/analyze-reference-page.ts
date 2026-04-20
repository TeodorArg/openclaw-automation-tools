import type { NormalizedUrlTailwindScaffoldRequest } from "../contract/request.js";
import {
	type AcquisitionMetadata,
	acquireReferencePage,
} from "./acquisition.js";
import {
	type ExtractedDomIslands,
	extractDomIslands,
} from "./extract-dom-islands.js";
import {
	buildNormalizedTailwindAppShell,
	type NormalizedTailwindAppShell,
} from "./normalize-shell.js";
import {
	buildReferencePageContract,
	type ReferencePageContract,
} from "./page-contract.js";
import { buildTailwindAppShellSummary } from "./summary.js";

export type AnalyzeReferencePageResult = {
	tool: "url_tailwind_scaffold_action";
	flow: "analyze_reference_page";
	acquisition: AcquisitionMetadata;
	extraction: ExtractedDomIslands;
	normalizedShell: NormalizedTailwindAppShell;
	pageContract?: ReferencePageContract;
	summary: ReturnType<typeof buildTailwindAppShellSummary>;
};

export async function analyzeReferencePage(
	request: NormalizedUrlTailwindScaffoldRequest,
): Promise<AnalyzeReferencePageResult> {
	const { acquisition, html } = await acquireReferencePage(request);
	const extraction = extractDomIslands({
		html,
		componentSplit: request.componentSplit,
	});
	const normalizedShell = buildNormalizedTailwindAppShell(
		request,
		acquisition,
		extraction,
	);
	const pageContract =
		request.outputMode === "page_contract"
			? buildReferencePageContract({
					request,
					acquisition,
					extraction,
					normalizedShell,
				})
			: undefined;

	return {
		tool: "url_tailwind_scaffold_action",
		flow: "analyze_reference_page",
		acquisition,
		extraction,
		normalizedShell,
		pageContract,
		summary: buildTailwindAppShellSummary({
			request,
			acquisition,
			normalizedShell,
		}),
	};
}
