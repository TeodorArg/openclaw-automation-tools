import type {
	AcquisitionMode,
	NormalizedUrlTailwindScaffoldRequest,
} from "../contract/request.js";

export type AcquisitionMetadata = {
	schemaVersion: 2;
	mode: AcquisitionMode;
	requestedUrl: string;
	sourceUrl: string;
	sourceBacked: boolean;
	fetchStatus: "fetched" | "failed" | "not-attempted";
	http: {
		ok: boolean;
		status: number | null;
		contentType?: string;
	};
	document: {
		title?: string;
		htmlBytes?: number;
	};
	note: string;
	failure?: string;
};

export type AcquiredReferencePage = {
	acquisition: AcquisitionMetadata;
	html?: string;
};

function extractTitle(html: string): string | undefined {
	const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	if (!match) {
		return undefined;
	}

	const normalized = match[1]
		.replace(/\s+/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.trim();

	return normalized.length > 0 ? normalized : undefined;
}

function createTimeoutSignal(timeoutMs: number): AbortSignal | undefined {
	if (typeof AbortSignal.timeout === "function") {
		return AbortSignal.timeout(timeoutMs);
	}

	return undefined;
}

function isHtmlContentType(contentType: string | undefined): boolean {
	if (!contentType) {
		return true;
	}

	return (
		contentType.includes("text/html") ||
		contentType.includes("application/xhtml+xml")
	);
}

export async function acquireReferencePage(
	request: NormalizedUrlTailwindScaffoldRequest,
): Promise<AcquiredReferencePage> {
	const mode = request.acquisitionMode ?? "fetch-backed";

	if (mode !== "fetch-backed") {
		return {
			acquisition: {
				schemaVersion: 2,
				mode,
				requestedUrl: request.url,
				sourceUrl: request.url,
				sourceBacked: false,
				fetchStatus: "not-attempted",
				http: {
					ok: false,
					status: null,
				},
				document: {},
				note: "This acquisition mode is not implemented as live page analysis in the current slice and must be reported as bounded or unresolved.",
			},
		};
	}

	try {
		const response = await fetch(request.url, {
			headers: {
				accept: "text/html,application/xhtml+xml",
			},
			redirect: "follow",
			signal: createTimeoutSignal(10_000),
		});
		const html = await response.text();
		const contentType = response.headers.get("content-type") ?? undefined;
		const usableHtml = response.ok && isHtmlContentType(contentType);
		const title = extractTitle(html);

		return {
			acquisition: {
				schemaVersion: 2,
				mode,
				requestedUrl: request.url,
				sourceUrl: response.url || request.url,
				sourceBacked: usableHtml,
				fetchStatus: response.ok ? "fetched" : "failed",
				http: {
					ok: response.ok,
					status: response.status,
					contentType,
				},
				document: {
					title: usableHtml ? title : undefined,
					htmlBytes: usableHtml ? Buffer.byteLength(html, "utf8") : undefined,
				},
				note: !response.ok
					? "Static fetch-backed acquisition reached the URL but did not get a successful HTTP response. DOM region extraction was skipped."
					: usableHtml
						? "Static fetch-backed acquisition downloaded the reference page HTML. DOM region extraction and selector derivation remain a separate later slice."
						: "Static fetch-backed acquisition reached the URL, but the response was not usable HTML. DOM region extraction was skipped."
				,
				failure: !response.ok
					? `Fetch returned HTTP ${response.status}.`
					: usableHtml
						? undefined
						: `Fetched content type ${contentType ?? "unknown"} is not supported for HTML analysis.`,
			},
			html: usableHtml ? html : undefined,
		};
	} catch (error) {
		return {
			acquisition: {
				schemaVersion: 2,
				mode,
				requestedUrl: request.url,
				sourceUrl: request.url,
				sourceBacked: false,
				fetchStatus: "failed",
				http: {
					ok: false,
					status: null,
				},
				document: {},
				note: "Static fetch-backed acquisition failed before HTML analysis could begin.",
				failure:
					error instanceof Error ? error.message : "Unknown fetch failure.",
			},
		};
	}
}
