import type { NormalizedUrlTailwindScaffoldRequest } from "../contract/request.js";
import {
	acquireReferencePage,
	type AcquisitionMetadata,
} from "./acquisition.js";
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
	normalizedShell: NormalizedTailwindAppShell;
	pageContract?: ReferencePageContract;
	summary: ReturnType<typeof buildTailwindAppShellSummary>;
};

export async function analyzeReferencePage(
	request: NormalizedUrlTailwindScaffoldRequest,
): Promise<AnalyzeReferencePageResult> {
	const { acquisition } = await acquireReferencePage(request);
	const normalizedShell = buildNormalizedTailwindAppShell(request, acquisition);
	const pageContract =
		request.outputMode === "page_contract"
			? buildReferencePageContract({
					request,
					acquisition,
					normalizedShell,
				})
			: undefined;

	return {
		tool: "url_tailwind_scaffold_action",
		flow: "analyze_reference_page",
		acquisition,
		normalizedShell,
		pageContract,
		summary: buildTailwindAppShellSummary({
			request,
			acquisition,
			normalizedShell,
		}),
	};
}
