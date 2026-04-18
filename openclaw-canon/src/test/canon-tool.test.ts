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
	await mkdir(docsDir, { recursive: true });
	await mkdir(githubDir, { recursive: true });
	await writeFile(join(root, "README.md"), "", "utf8");
	await writeFile(join(root, "memory.jsonl"), "", "utf8");

	async function writePackageFixture(packageName: string) {
		const packageDir = join(root, packageName);
		await mkdir(join(packageDir, "src", "runtime"), { recursive: true });
		await mkdir(join(packageDir, "src", "test"), { recursive: true });
		await mkdir(join(packageDir, "src", "types"), { recursive: true });
		await mkdir(join(packageDir, "skills"), { recursive: true });
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
			`{"id":"${packageName}","version":"0.1.0","entry":"./dist/index.js"}\n`,
			"utf8",
		);
		await writeFile(join(packageDir, "src", "runtime", ".gitkeep"), "", "utf8");
		await writeFile(join(packageDir, "src", "test", ".gitkeep"), "", "utf8");
		await writeFile(join(packageDir, "src", "types", ".gitkeep"), "", "utf8");
		await writeFile(join(packageDir, "skills", ".gitkeep"), "", "utf8");
	}

	await writePackageFixture("openclaw-host-git-workflow");
	await writePackageFixture("openclaw-workflow-planner");
	await writePackageFixture("openclaw-canon");
	await writeFile(
		join(docsDir, "PLUGIN_PACKAGE_CANON.md"),
		[
			"# Plugin Package Canon",
			"",
			"Current live publishable plugin packages:",
			"- `openclaw-host-git-workflow/`",
			"- `openclaw-workflow-planner/`",
			"- `openclaw-canon/`",
			"",
		].join("\n"),
		"utf8",
	);
	await writeFile(
		join(docsDir, "CLAWHUB_PUBLISH_PREFLIGHT.md"),
		[
			"# ClawHub Publish Preflight",
			"",
			"Plugin packages listed there and currently expected here in lockstep:",
			"- `openclaw-canon/`",
			"",
			"Primary host-backed package entrypoint:",
			"- `send_to_git`",
			"",
		].join("\n"),
		"utf8",
	);
	await writeFile(
		join(root, "README.md"),
		[
			"# repo",
			"",
			"## Repo Facts",
			"",
			"- The repo currently ships 1 publishable plugin packages: `openclaw-canon/`.",
			"",
		].join("\n"),
		"utf8",
	);
	await writeFile(
		join(githubDir, "ci.yml"),
		[
			"name: ci",
			"",
			"jobs:",
			"  plugin-packages:",
			"    strategy:",
			"      matrix:",
			"        package:",
			"          - openclaw-canon",
			"    defaults:",
			"      run:",
			"        working-directory: $" + "{{ matrix.package }}",
			"",
		].join("\n"),
		"utf8",
	);

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
					finding.id === "sync-readme-live-package-fact",
			),
		).toBe(true);
	});

	it("previews and applies sync fixes with confirmToken", async () => {
		const fixture = await createFixtureRepo();
		const fixTool = createCanonFixTool({
			pluginConfig: fixture.pluginConfig,
		});
		const preview = await fixTool.execute("call-4a", {
			scope: "sync",
			mode: "preview",
		});
		const previewPayload = JSON.parse(preview.content[0].text);

		expect(previewPayload.status).toBe("warning");
		expect(previewPayload.confirmToken).toBeTruthy();
		expect(previewPayload.changes).toHaveLength(3);
		expect(previewPayload.proposals).toHaveLength(3);

		await expect(
			fixTool.execute("call-4b", {
				scope: "sync",
				mode: "apply",
			}),
		).rejects.toThrow("canon_fix apply requires confirmToken from preview.");

		await fixTool.execute("call-4c", {
			scope: "sync",
			mode: "apply",
			confirmToken: previewPayload.confirmToken,
		});

		const readmeAfterApply = await readFile(
			join(fixture.root, "README.md"),
			"utf8",
		);
		const preflightAfterApply = await readFile(
			join(fixture.root, "docs", "CLAWHUB_PUBLISH_PREFLIGHT.md"),
			"utf8",
		);
		const ciAfterApply = await readFile(
			join(fixture.root, ".github", "workflows", "ci.yml"),
			"utf8",
		);

		expect(readmeAfterApply).toContain(
			"`openclaw-host-git-workflow/`, `openclaw-workflow-planner/`, and `openclaw-canon/`",
		);
		expect(preflightAfterApply).toContain("- `openclaw-host-git-workflow/`");
		expect(preflightAfterApply).toContain("- `openclaw-workflow-planner/`");
		expect(ciAfterApply).toContain("openclaw-host-git-workflow");
		expect(ciAfterApply).toContain("openclaw-workflow-planner");
	});

	it("previews and applies safe memory fixes with confirmToken", async () => {
		const fixture = await createFixtureRepo();
		await writeFile(
			fixture.pluginConfig.memoryFilePath,
			[
				"",
				'{"entityName":"A","entityType":"project","observation":"one","updatedAt":"2026-04-18","source":"manual-sync"}',
				'{"entityName":"B","entityType":"project","observation":"two","updatedAt":"2026-04-18"}',
				'{"entityName":"A","entityType":"project","observation":"one","updatedAt":"2026-04-18","source":"manual-sync"}',
				"not json",
				'{"entityName":"B","entityType":"project","observation":"two","updatedAt":"2026-04-18"}',
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
		expect(previewPayload.proposals).toHaveLength(3);

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

	it("keeps memory doctor findings aligned with preview targetIds across blank lines", async () => {
		const fixture = await createFixtureRepo();
		await writeFile(
			fixture.pluginConfig.memoryFilePath,
			[
				"",
				'{"entityName":"A","entityType":"project","observation":"one","updatedAt":"2026-04-18","source":"manual-sync"}',
				"",
				'{"entityName":"B","entityType":"project","observation":"two","updatedAt":"2026-04-18"}',
				"not json",
				'{"entityName":"A","entityType":"project","observation":"one","updatedAt":"2026-04-18","source":"manual-sync"}',
				"",
			].join("\n"),
			"utf8",
		);

		const doctorTool = createCanonDoctorTool({
			pluginConfig: fixture.pluginConfig,
		});
		const fixTool = createCanonFixTool({
			pluginConfig: fixture.pluginConfig,
		});

		const doctorResult = await doctorTool.execute("call-5a", {
			scope: "memory",
			execution: "inline",
		});
		const doctorPayload = JSON.parse(doctorResult.content[0].text);
		const safeTargetIds = doctorPayload.findings
			.filter(
				(finding: { canAutoFix: boolean; targetIds?: string[]; id: string }) =>
					finding.canAutoFix,
			)
			.map((finding: { id: string }) => finding.id)
			.sort();

		expect(safeTargetIds).toEqual([
			"memory-duplicate-2-6",
			"memory-invalid-json-5",
			"memory-invalid-shape-4",
		]);

		const previewResult = await fixTool.execute("call-5b", {
			scope: "memory",
			mode: "preview",
			targetIds: safeTargetIds,
		});
		const previewPayload = JSON.parse(previewResult.content[0].text);
		const previewTargetIds = previewPayload.proposals
			.map((proposal: { targetIds: string[] }) => proposal.targetIds[0])
			.sort();

		expect(previewTargetIds).toEqual(safeTargetIds);
	});
});
