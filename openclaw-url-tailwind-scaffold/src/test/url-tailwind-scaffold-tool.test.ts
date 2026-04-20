import { describe, expect, it } from "vitest";
import { createUrlTailwindScaffoldTool } from "../runtime/analysis/url-tailwind-scaffold-tool.js";
import type { UrlTailwindScaffoldRequest } from "../runtime/contract/request.js";

describe("createUrlTailwindScaffoldTool", () => {
	it("returns acquisition, normalized shell, and summary output for a reference URL request", async () => {
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
		expect(payload.acquisition.sourceUrl).toBe("https://example.com/dashboard");
		expect(payload.normalizedShell.frameworkTarget).toBe("html");
		expect(payload.normalizedShell.tailwindVersion).toBe("v4");
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
	});

	it("keeps every region inferred for non-default acquisition modes", async () => {
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
	});
});
