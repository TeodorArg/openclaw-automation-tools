import type {
	AcquisitionMode,
	NormalizedUrlTailwindScaffoldRequest,
} from "../contract/request.js";

export type AcquisitionMetadata = {
	schemaVersion: 1;
	mode: AcquisitionMode;
	sourceUrl: string;
	sourceBacked: boolean;
	note: string;
};

export function normalizeAcquisitionMetadata(
	request: NormalizedUrlTailwindScaffoldRequest,
): AcquisitionMetadata {
	const mode = request.acquisitionMode ?? "fetch-backed";

	return {
		schemaVersion: 1,
		mode,
		sourceUrl: request.url,
		sourceBacked: mode === "fetch-backed",
		note:
			mode === "fetch-backed"
				? "V1 treats `fetch-backed` as a request-mode hint for reference-URL-driven scaffold synthesis; it does not fetch or inspect the page yet."
				: "This acquisition mode is not implemented as live page analysis in v1 and must be reported as bounded or unresolved.",
	};
}
