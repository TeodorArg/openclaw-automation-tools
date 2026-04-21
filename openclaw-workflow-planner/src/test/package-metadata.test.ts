import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = join(import.meta.dirname, "..", "..");

function readJson(path: string) {
	return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

describe("package metadata", () => {
	it("keeps package and plugin manifest linkage aligned", () => {
		const pkg = readJson(join(packageRoot, "package.json"));
		const manifest = readJson(join(packageRoot, "openclaw.plugin.json"));

		expect(pkg.name).toBe("@openclaw/openclaw-workflow-planner");
		expect(manifest.id).toBe("openclaw-workflow-planner");
		expect(pkg.version).toBe(manifest.version);
		expect(manifest.skills).toEqual(["./skills"]);
		expect(
			(pkg.openclaw as { extensions?: string[] } | undefined)?.extensions,
		).toContain("./dist/index.js");
	});

	it("keeps required packaged surfaces declared locally", () => {
		const pkg = readJson(join(packageRoot, "package.json"));
		const files = (pkg.files as string[] | undefined) ?? [];

		expect(files).toEqual(
			expect.arrayContaining([
				"dist",
				"openclaw.plugin.json",
				"skills",
				"README.md",
				"LICENSE",
			]),
		);
		expect(
			(pkg.scripts as Record<string, string> | undefined)?.["pack:smoke"],
		).toContain("skills/openclaw-workflow-planner/SKILL.md");
	});

	it("declares plannerFilePath config in the plugin manifest", () => {
		const manifest = readJson(join(packageRoot, "openclaw.plugin.json"));
		const schema = manifest.configSchema as
			| {
					properties?: Record<string, { type?: string; description?: string }>;
			  }
			| undefined;

		expect(schema?.properties?.plannerFilePath?.type).toBe("string");
		expect(schema?.properties?.plannerFilePath?.description).toContain(
			"WORKFLOW_PLAN.md",
		);
	});
});
