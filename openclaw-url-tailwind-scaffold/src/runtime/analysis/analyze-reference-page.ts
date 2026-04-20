import type { NormalizedUrlTailwindScaffoldRequest } from "../contract/request.js";
import { normalizeAcquisitionMetadata } from "./acquisition.js";
import {
	buildNormalizedTailwindAppShell,
	type NormalizedTailwindAppShell,
} from "./normalize-shell.js";
import { buildTailwindAppShellSummary } from "./summary.js";

export type AnalyzeReferencePageResult = {
	tool: "url_tailwind_scaffold_action";
	flow: "analyze_reference_page";
	acquisition: ReturnType<typeof normalizeAcquisitionMetadata>;
	normalizedShell: NormalizedTailwindAppShell;
	summary: ReturnType<typeof buildTailwindAppShellSummary>;
};

export function analyzeReferencePage(
	request: NormalizedUrlTailwindScaffoldRequest,
): AnalyzeReferencePageResult {
	const acquisition = normalizeAcquisitionMetadata(request);
	const normalizedShell = buildNormalizedTailwindAppShell(request, acquisition);

	return {
		tool: "url_tailwind_scaffold_action",
		flow: "analyze_reference_page",
		acquisition,
		normalizedShell,
		summary: buildTailwindAppShellSummary({
			request,
			acquisition,
			normalizedShell,
		}),
	};
}
