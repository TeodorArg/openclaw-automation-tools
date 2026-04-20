import type { NormalizedUrlTailwindScaffoldRequest } from "../contract/request.js";
import type { AcquisitionMetadata } from "./acquisition.js";
import type { NormalizedTailwindAppShell } from "./normalize-shell.js";

export type TailwindAppShellSummary = {
	headline: string;
	text: string;
	keyPoints: string[];
	recommendedFiles: string[];
};

function deriveSubject(request: NormalizedUrlTailwindScaffoldRequest): string {
	return new URL(request.url).hostname;
}

export function buildTailwindAppShellSummary(input: {
	request: NormalizedUrlTailwindScaffoldRequest;
	acquisition: AcquisitionMetadata;
	normalizedShell: NormalizedTailwindAppShell;
}): TailwindAppShellSummary {
	const subject = deriveSubject(input.request);

	return {
		headline: `Tailwind v4 app shell scaffold for ${subject}`,
		text:
			`Use a bounded app shell that preserves a reusable shell hierarchy for the reference URL ` +
			`through reusable sidebar, header, content, and footer regions without claiming a page clone.`,
		keyPoints: [
			`Source URL: ${input.request.url}`,
			`Acquisition mode: ${input.acquisition.mode}`,
			"Keep Tailwind output semantic, mobile-first, and free from donor CSS class reuse.",
		],
		recommendedFiles: input.normalizedShell.componentPlan.generatedFiles,
	};
}
