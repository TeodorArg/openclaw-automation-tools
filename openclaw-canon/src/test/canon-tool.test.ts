import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createCanonDoctorTool } from "../canon-doctor-tool.js";
import { createCanonFixTool } from "../canon-fix-tool.js";
import { createCanonStatusTool } from "../canon-status-tool.js";

async function createFixtureRepo() {
	const root = await mkdtemp(join(tmpdir(), "openclaw-canon-test-"));
	const docsDir = join(root, "docs");
	const githubDir = join(root, ".github", "workflows");
	const packageDir = join(root, "openclaw-canon");
	await mkdir(docsDir, { recursive: true });
	await mkdir(githubDir, { recursive: true });
	await mkdir(join(packageDir, "src", "runtime"), { recursive: true });
	await mkdir(join(packageDir, "src", "test"), { recursive: true });
	await mkdir(join(packageDir, "src", "types"), { recursive: true });
	await mkdir(join(packageDir, "skills"), { recursive: true });
	await writeFile(join(root, "README.md"), "", "utf8");
	await writeFile(join(root, "memory.jsonl"), "", "utf8");
	await writeFile(
		join(docsDir, "PLUGIN_PACKAGE_CANON.md"),
		[
			"# Plugin Package Canon",
			"",
			"Current live publishable plugin packages:",
			"- `openclaw-canon/`",
			"",
		].join("\n"),
		"utf8",
	);
	await writeFile(
		join(docsDir, "CLAWHUB_PUBLISH_PREFLIGHT.md"),
		"openclaw-canon\n",
		"utf8",
	);
	await writeFile(join(root, "README.md"), "# repo\nopenclaw-canon\n", "utf8");
	await writeFile(
		join(githubDir, "ci.yml"),
		"matrix:\n  package:\n    - openclaw-canon\n",
		"utf8",
	);
	await writeFile(join(packageDir, "README.md"), "# package\n", "utf8");
	await writeFile(join(packageDir, "LICENSE"), "MIT\n", "utf8");
	await writeFile(join(packageDir, ".npmignore"), "*\n", "utf8");
	await writeFile(join(packageDir, "tsconfig.json"), "{}\n", "utf8");
	await writeFile(join(packageDir, "tsconfig.build.json"), "{}\n", "utf8");
	await writeFile(
		join(packageDir, "package.json"),
		'{"version":"0.1.0"}\n',
		"utf8",
	);
	await writeFile(
		join(packageDir, "openclaw.plugin.json"),
		'{"id":"openclaw-canon","version":"0.1.0","entry":"./dist/index.js"}\n',
		"utf8",
	);
	await writeFile(join(packageDir, "src", "runtime", ".gitkeep"), "", "utf8");
	await writeFile(join(packageDir, "src", "test", ".gitkeep"), "", "utf8");
	await writeFile(join(packageDir, "src", "types", ".gitkeep"), "", "utf8");
	await writeFile(join(packageDir, "skills", ".gitkeep"), "", "utf8");

	return {
		root,
		pluginConfig: {
			stateFilePath: join(root, ".openclaw-canon-state.json"),
			memoryFilePath: join(root, "memory.jsonl"),
			packageCanonPath: join(docsDir, "PLUGIN_PACKAGE_CANON.md"),
			publishPreflightPath: join(docsDir, "CLAWHUB_PUBLISH_PREFLIGHT.md"),
			repoReadmePath: join(root, "README.md"),
			ciWorkflowPath: join(githubDir, "ci.yml"),
		},
	};
}

describe("openclaw-canon tools", () => {
	it("returns a warning status when no summary exists yet", async () => {
		const fixture = await createFixtureRepo();
		const tool = createCanonStatusTool({
			pluginConfig: fixture.pluginConfig,
		});
		const result = await tool.execute("call-1", {
			mode: "summary",
			refresh: "light",
		});
		const payload = JSON.parse(result.content[0].text);

		expect(payload.status).toBe("warning");
		expect(payload.summary.headline).toContain("No canon summary");
	});

	it("detects package-shape drift through canon_doctor source", async () => {
		const fixture = await createFixtureRepo();
		await writeFile(
			join(fixture.root, "openclaw-canon", "openclaw.plugin.json"),
			'{"id":"wrong-id","version":"0.1.0","entry":"./dist/index.js"}\n',
			"utf8",
		);
		const tool = createCanonDoctorTool({
			pluginConfig: fixture.pluginConfig,
		});
		const result = await tool.execute("call-2", {
			scope: "source",
			execution: "inline",
		});
		const payload = JSON.parse(result.content[0].text);

		expect(payload.status).toBe("warning");
		expect(
			payload.findings.some(
				(finding: { id: string }) =>
					finding.id === "source-id-mismatch-openclaw-canon",
			),
		).toBe(true);
	});

	it("detects sync drift when README stops enumerating a live package", async () => {
		const fixture = await createFixtureRepo();
		await writeFile(join(fixture.root, "README.md"), "# repo\n", "utf8");
		const tool = createCanonDoctorTool({
			pluginConfig: fixture.pluginConfig,
		});
		const result = await tool.execute("call-3", {
			scope: "sync",
			execution: "inline",
		});
		const payload = JSON.parse(result.content[0].text);

		expect(payload.status).toBe("warning");
		expect(
			payload.findings.some(
				(finding: { id: string }) =>
					finding.id === "sync-readme-openclaw-canon",
			),
		).toBe(true);
	});

	it("previews and applies safe memory fixes with confirmToken", async () => {
		const fixture = await createFixtureRepo();
		await writeFile(
			fixture.pluginConfig.memoryFilePath,
			[
				'{"entityName":"A","entityType":"project","observation":"one","updatedAt":"2026-04-18","source":"manual-sync"}',
				'{"entityName":"A","entityType":"project","observation":"one","updatedAt":"2026-04-18","source":"manual-sync"}',
				"not json",
				"",
			].join("\n"),
			"utf8",
		);
		const fixTool = createCanonFixTool({
			pluginConfig: fixture.pluginConfig,
		});
		const preview = await fixTool.execute("call-4a", {
			scope: "memory",
			mode: "preview",
		});
		const previewPayload = JSON.parse(preview.content[0].text);

		expect(previewPayload.status).toBe("warning");
		expect(previewPayload.confirmToken).toBeTruthy();
		expect(previewPayload.proposals).toHaveLength(2);

		await fixTool.execute("call-4b", {
			scope: "memory",
			mode: "apply",
			confirmToken: previewPayload.confirmToken,
		});
		const rawAfterApply = await readFile(
			fixture.pluginConfig.memoryFilePath,
			"utf8",
		);
		const nonEmptyLines = rawAfterApply
			.split("\n")
			.filter((line) => line.trim().length > 0);

		expect(nonEmptyLines).toHaveLength(1);
	});
});
