import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUrlTailwindScaffoldTool } from "../runtime/analysis/url-tailwind-scaffold-tool.js";
import type { UrlTailwindScaffoldRequest } from "../runtime/contract/request.js";

const fetchMock = vi.fn<typeof fetch>();

function buildHtmlResponse(input: {
	url?: string;
	status?: number;
	contentType?: string;
	body?: string;
}) {
	const response = new Response(
		input.body ??
			"<html><head><title>Dashboard</title></head><body><header><nav><a>Home</a></nav></header><aside aria-label='Primary sidebar'><a>Projects</a></aside><main><h1>Overview</h1><button>Refresh</button></main><footer>Footer</footer></body></html>",
		{
			status: input.status ?? 200,
			headers: {
				"content-type": input.contentType ?? "text/html; charset=utf-8",
			},
		},
	);

	Object.defineProperty(response, "url", {
		value: input.url ?? "https://example.com/dashboard",
		configurable: true,
	});

	return response;
}

describe("createUrlTailwindScaffoldTool", () => {
	beforeEach(() => {
		fetchMock.mockReset();
		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns acquisition, normalized shell, and summary output for a reference URL request", async () => {
		fetchMock.mockResolvedValue(buildHtmlResponse({}));
		const tool = createUrlTailwindScaffoldTool();
		const result = await tool.execute("call-1", {
			action: "analyze_reference_page",
			command: "analyze reference page",
			commandName: "url_tailwind_scaffold_action",
			skillName: "openclaw-url-tailwind-scaffold",
			url: "https://example.com/dashboard",
			goal: "Extract a reusable dashboard shell.",
			outputMode: "scaffold_summary",
			componentSplit: ["app-shell", "sidebar", "header", "content", "footer"],
			frameworkHint: "html",
			acquisitionMode: "fetch-backed",
		});

		const payload = JSON.parse(result.content[0].text);

		expect(payload.tool).toBe("url_tailwind_scaffold_action");
		expect(payload.flow).toBe("analyze_reference_page");
		expect(payload.acquisition.mode).toBe("fetch-backed");
		expect(payload.acquisition.fetchStatus).toBe("fetched");
		expect(payload.acquisition.sourceUrl).toBe("https://example.com/dashboard");
		expect(payload.acquisition.http.status).toBe(200);
		expect(payload.acquisition.document.title).toBe("Dashboard");
		expect(payload.normalizedShell.frameworkTarget).toBe("html");
		expect(payload.normalizedShell.tailwindVersion).toBe("v4");
		expect(
			payload.normalizedShell.regions.map(
				(region: { sourceBacked: boolean }) => region.sourceBacked,
			),
		).toEqual([true, true, true, true, true]);
		expect(
			payload.normalizedShell.regions.every(
				(region: { sourceBacked: boolean }) => region.sourceBacked === true,
			),
		).toBe(true);
		expect(
			payload.normalizedShell.regions.map(
				(region: { name: string }) => region.name,
			),
		).toEqual(["app-shell", "sidebar", "header", "content", "footer"]);
		expect(payload.normalizedShell.componentPlan.generatedFiles).toContain(
			"app.css",
		);
		expect(payload.summary.headline).toBe(
			"Tailwind v4 app shell scaffold for example.com",
		);
		expect(payload.summary.keyPoints[1]).toContain(
			"Acquisition mode: fetch-backed",
		);
		expect(payload.summary.keyPoints[2]).toContain("HTTP status: 200");
		expect(payload.summary.keyPoints[3]).toContain(
			"Matched shell regions: 5/5",
		);
		expect(payload.pageContract).toBeUndefined();
	});

	it("returns a structured page contract when page_contract output is requested", async () => {
		fetchMock.mockResolvedValue(
			buildHtmlResponse({
				url: "https://example.com/dashboard?view=resolved",
				body: "<html><head><title>Example Dashboard</title></head><body><header><nav><a>Home</a></nav></header><aside aria-label='Primary sidebar'><a>Projects</a></aside><main><h1>Overview</h1><button>Refresh</button></main><footer>Footer</footer></body></html>",
			}),
		);
		const tool = createUrlTailwindScaffoldTool();
		const result = await tool.execute("call-1c", {
			action: "analyze_reference_page",
			command: "analyze reference page",
			commandName: "url_tailwind_scaffold_action",
			skillName: "openclaw-url-tailwind-scaffold",
			url: "https://example.com/dashboard",
			outputMode: "page_contract",
			acquisitionMode: "fetch-backed",
		});

		const payload = JSON.parse(result.content[0].text);

		expect(payload.pageContract.kind).toBe("url-tailwind-page-contract");
		expect(payload.pageContract.source.url).toBe(
			"https://example.com/dashboard?view=resolved",
		);
		expect(payload.pageContract.source.requestedUrl).toBe(
			"https://example.com/dashboard",
		);
		expect(payload.pageContract.source.fetchStatus).toBe("fetched");
		expect(payload.pageContract.source.document.title).toBe(
			"Example Dashboard",
		);
		expect(payload.pageContract.page.composition).toEqual([
			"app-shell",
			"sidebar",
			"header",
			"content",
			"footer",
		]);
		expect(payload.pageContract.islands[0].selectors.css).toBe(
			"html:nth-of-type(1) > body:nth-of-type(1)",
		);
		expect(payload.pageContract.islands[1].selectors.css).toContain("aside");
		expect(payload.pageContract.islands[2].anchors.textMarkers).toContain(
			"Home",
		);
		expect(payload.pageContract.islands[3].keyNodes[1].selector).toBe(
			"html:nth-of-type(1) > body:nth-of-type(1) > main:nth-of-type(1) > button:nth-of-type(1)",
		);
		expect(payload.pageContract.boundaries.multiAgentOrchestration).toBe(
			"external-only",
		);
		expect(payload.pageContract.islands[0].evidence).toContain("dom-parse");
		expect(payload.pageContract.islands[0].layout.status).toBe(
			"source-backed-dom",
		);
	});

	it("keeps page_contract source URLs coherent when fetch follows redirects", async () => {
		fetchMock.mockResolvedValue(
			buildHtmlResponse({
				url: "https://example.com/dashboard/landing",
			}),
		);
		const tool = createUrlTailwindScaffoldTool();
		const result = await tool.execute("call-1d", {
			action: "analyze_reference_page",
			command: "analyze reference page",
			commandName: "url_tailwind_scaffold_action",
			skillName: "openclaw-url-tailwind-scaffold",
			url: "https://example.com/dashboard",
			outputMode: "page_contract",
			acquisitionMode: "fetch-backed",
		});

		const payload = JSON.parse(result.content[0].text);

		expect(payload.acquisition.requestedUrl).toBe(
			"https://example.com/dashboard",
		);
		expect(payload.acquisition.sourceUrl).toBe(
			"https://example.com/dashboard/landing",
		);
		expect(payload.pageContract.source.requestedUrl).toBe(
			"https://example.com/dashboard",
		);
		expect(payload.pageContract.source.url).toBe(
			"https://example.com/dashboard/landing",
		);
	});

	it("keeps every region inferred and skips fetch for non-default acquisition modes", async () => {
		const tool = createUrlTailwindScaffoldTool();
		const result = await tool.execute("call-1b", {
			action: "analyze_reference_page",
			command: "analyze reference page",
			commandName: "url_tailwind_scaffold_action",
			skillName: "openclaw-url-tailwind-scaffold",
			url: "https://example.com/dashboard",
			acquisitionMode: "browser-assisted",
		});

		const payload = JSON.parse(result.content[0].text);

		expect(fetchMock).not.toHaveBeenCalled();
		expect(payload.acquisition.fetchStatus).toBe("not-attempted");
		expect(
			payload.normalizedShell.regions.every(
				(region: { sourceBacked: boolean }) => region.sourceBacked === false,
			),
		).toBe(true);
		expect(payload.normalizedShell.regions[0].note).toContain(
			"inferred placeholder",
		);
	});

	it("rejects unsupported request actions", async () => {
		const tool = createUrlTailwindScaffoldTool();

		await expect(
			tool.execute("call-2", {
				action: "other" as "analyze_reference_page",
				command: "analyze reference page",
				commandName: "url_tailwind_scaffold_action",
				skillName: "openclaw-url-tailwind-scaffold",
				url: "https://example.com/dashboard",
			}),
		).rejects.toThrow(
			"Unsupported url_tailwind_scaffold_action request action: other.",
		);
	});

	it("accepts raw command dispatch with a plain URL and defaulted action fields", async () => {
		fetchMock.mockResolvedValue(
			buildHtmlResponse({ url: "https://example.com/app" }),
		);
		const tool = createUrlTailwindScaffoldTool();

		const result = await tool.execute("call-3", {
			command: "https://example.com/app",
			commandName: "openclaw-url-tailwind-scaffold",
			skillName: "openclaw-url-tailwind-scaffold",
		} as UrlTailwindScaffoldRequest);

		const payload = JSON.parse(result.content[0].text);

		expect(payload.flow).toBe("analyze_reference_page");
		expect(payload.acquisition.mode).toBe("fetch-backed");
		expect(payload.acquisition.sourceUrl).toBe("https://example.com/app");
		expect(payload.normalizedShell.regions).toHaveLength(5);
	});

	it("accepts raw command dispatch with a JSON payload", async () => {
		fetchMock.mockResolvedValue(buildHtmlResponse({}));
		const tool = createUrlTailwindScaffoldTool();

		const result = await tool.execute("call-4", {
			command:
				'{"url":"https://example.com/dashboard","goal":"Keep the shell reusable.","componentSplit":["app-shell","header","content","footer"]}',
			commandName: "openclaw-url-tailwind-scaffold",
			skillName: "openclaw-url-tailwind-scaffold",
		} as UrlTailwindScaffoldRequest);

		const payload = JSON.parse(result.content[0].text);

		expect(payload.summary.keyPoints[0]).toContain(
			"https://example.com/dashboard",
		);
		expect(
			payload.normalizedShell.regions.map(
				(region: { name: string }) => region.name,
			),
		).toEqual(["app-shell", "header", "content", "footer"]);
		expect(
			payload.normalizedShell.regions.map(
				(region: { sourceBacked: boolean }) => region.sourceBacked,
			),
		).toEqual([true, true, true, true]);
	});

	it("accepts page_contract output mode from a raw JSON command payload", async () => {
		fetchMock.mockResolvedValue(buildHtmlResponse({}));
		const tool = createUrlTailwindScaffoldTool();

		const result = await tool.execute("call-5", {
			command:
				'{"url":"https://example.com/dashboard","outputMode":"page_contract","componentSplit":["app-shell","content","footer"]}',
			commandName: "openclaw-url-tailwind-scaffold",
			skillName: "openclaw-url-tailwind-scaffold",
		} as UrlTailwindScaffoldRequest);

		const payload = JSON.parse(result.content[0].text);

		expect(payload.pageContract.page.composition).toEqual([
			"app-shell",
			"content",
			"footer",
		]);
		expect(payload.pageContract.islands).toHaveLength(3);
		expect(payload.pageContract.islands[1].layout.status).toBe(
			"source-backed-dom",
		);
	});

	it("rejects unsupported outputMode in a raw JSON command payload", async () => {
		const tool = createUrlTailwindScaffoldTool();

		await expect(
			tool.execute("call-5b", {
				command:
					'{"url":"https://example.com/dashboard","outputMode":"wrong-mode"}',
				commandName: "openclaw-url-tailwind-scaffold",
				skillName: "openclaw-url-tailwind-scaffold",
			} as UrlTailwindScaffoldRequest),
		).rejects.toThrow("Unsupported command.outputMode: wrong-mode.");
	});

	it("rejects unsupported acquisitionMode in a raw JSON command payload", async () => {
		const tool = createUrlTailwindScaffoldTool();

		await expect(
			tool.execute("call-5c", {
				command:
					'{"url":"https://example.com/dashboard","acquisitionMode":"dynamic"}',
				commandName: "openclaw-url-tailwind-scaffold",
				skillName: "openclaw-url-tailwind-scaffold",
			} as UrlTailwindScaffoldRequest),
		).rejects.toThrow("Unsupported command.acquisitionMode: dynamic.");
	});

	it.each([
		{
			field: "outputMode",
			value: "contract",
			message: "Unsupported command.outputMode: contract.",
		},
		{
			field: "frameworkHint",
			value: "react",
			message: "Unsupported command.frameworkHint: react.",
		},
		{
			field: "acquisitionMode",
			value: "live-dom",
			message: "Unsupported command.acquisitionMode: live-dom.",
		},
	])("rejects unsupported raw JSON enum-like values for $field", async ({
		field,
		value,
		message,
	}) => {
		const tool = createUrlTailwindScaffoldTool();

		await expect(
			tool.execute("call-5b", {
				command: `{"url":"https://example.com/dashboard","${field}":"${value}"}`,
				commandName: "openclaw-url-tailwind-scaffold",
				skillName: "openclaw-url-tailwind-scaffold",
			} as UrlTailwindScaffoldRequest),
		).rejects.toThrow(message);

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("returns bounded acquisition failure details when fetch fails", async () => {
		fetchMock.mockRejectedValue(new Error("connect ECONNREFUSED"));
		const tool = createUrlTailwindScaffoldTool();

		const result = await tool.execute("call-6", {
			action: "analyze_reference_page",
			command: "analyze reference page",
			commandName: "url_tailwind_scaffold_action",
			skillName: "openclaw-url-tailwind-scaffold",
			url: "https://example.com/dashboard",
			outputMode: "page_contract",
			acquisitionMode: "fetch-backed",
		});

		const payload = JSON.parse(result.content[0].text);

		expect(payload.acquisition.fetchStatus).toBe("failed");
		expect(payload.acquisition.sourceBacked).toBe(false);
		expect(payload.acquisition.failure).toContain("ECONNREFUSED");
		expect(payload.pageContract.source.failure).toContain("ECONNREFUSED");
	});

	it("treats non-html responses as unusable for static HTML analysis", async () => {
		fetchMock.mockResolvedValue(
			buildHtmlResponse({
				contentType: "application/json",
				body: '{"ok":true}',
			}),
		);
		const tool = createUrlTailwindScaffoldTool();

		const result = await tool.execute("call-7", {
			action: "analyze_reference_page",
			command: "analyze reference page",
			commandName: "url_tailwind_scaffold_action",
			skillName: "openclaw-url-tailwind-scaffold",
			url: "https://example.com/dashboard",
			outputMode: "page_contract",
			acquisitionMode: "fetch-backed",
		});

		const payload = JSON.parse(result.content[0].text);

		expect(payload.acquisition.fetchStatus).toBe("fetched");
		expect(payload.acquisition.sourceBacked).toBe(false);
		expect(payload.acquisition.failure).toContain("application/json");
		expect(payload.pageContract.source.document.title).toBeUndefined();
	});

	it("extracts shell regions from aria-role fallback markup", async () => {
		fetchMock.mockResolvedValue(
			buildHtmlResponse({
				body: `
					<html>
						<head><title>Role Layout</title></head>
						<body>
							<div role="banner"><h1>Workspace</h1></div>
							<div role="complementary" aria-label="Side menu"><a>Inbox</a></div>
							<div role="main"><h2>Reports</h2><table><tr><td>Cell</td></tr></table></div>
							<div role="contentinfo">Footer info</div>
						</body>
					</html>
				`,
			}),
		);
		const tool = createUrlTailwindScaffoldTool();

		const result = await tool.execute("call-8", {
			action: "analyze_reference_page",
			command: "analyze reference page",
			commandName: "url_tailwind_scaffold_action",
			skillName: "openclaw-url-tailwind-scaffold",
			url: "https://example.com/roles",
			outputMode: "page_contract",
			acquisitionMode: "fetch-backed",
		});

		const payload = JSON.parse(result.content[0].text);

		expect(payload.pageContract.islands[1].selectors.css).toContain(
			'[role="complementary"]',
		);
		expect(payload.pageContract.islands[3].anchors.textMarkers).toContain(
			"Reports",
		);
		expect(payload.pageContract.islands[4].layout.status).toBe(
			"source-backed-dom",
		);
	});

	it("keeps unmatched shell regions inferred when only part of the DOM shell is present", async () => {
		fetchMock.mockResolvedValue(
			buildHtmlResponse({
				body: `
					<html>
						<head><title>Partial Layout</title></head>
						<body>
							<header><nav><a>Home</a></nav></header>
							<main><h1>Overview</h1><button>Refresh</button></main>
						</body>
					</html>
				`,
			}),
		);
		const tool = createUrlTailwindScaffoldTool();

		const result = await tool.execute("call-9", {
			action: "analyze_reference_page",
			command: "analyze reference page",
			commandName: "url_tailwind_scaffold_action",
			skillName: "openclaw-url-tailwind-scaffold",
			url: "https://example.com/partial",
			outputMode: "page_contract",
			acquisitionMode: "fetch-backed",
		});

		const payload = JSON.parse(result.content[0].text);

		expect(payload.summary.keyPoints[3]).toContain(
			"Matched shell regions: 3/5",
		);
		expect(
			payload.normalizedShell.regions.map(
				(region: { name: string; sourceBacked: boolean }) => ({
					name: region.name,
					sourceBacked: region.sourceBacked,
				}),
			),
		).toEqual([
			{ name: "app-shell", sourceBacked: true },
			{ name: "sidebar", sourceBacked: false },
			{ name: "header", sourceBacked: true },
			{ name: "content", sourceBacked: true },
			{ name: "footer", sourceBacked: false },
		]);
		expect(payload.pageContract.islands[1].layout.status).toBe(
			"synthetic-request-mode",
		);
		expect(payload.pageContract.islands[4].layout.status).toBe(
			"synthetic-request-mode",
		);
		expect(payload.normalizedShell.unresolvedAreas).toContain(
			"sidebar could not be matched confidently from fetched HTML in the current static DOM slice.",
		);
		expect(payload.normalizedShell.unresolvedAreas).toContain(
			"footer could not be matched confidently from fetched HTML in the current static DOM slice.",
		);
	});
});
