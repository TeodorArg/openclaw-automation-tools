import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createCanonDoctorTool } from "../canon-doctor-tool.js";
import { createCanonFixTool } from "../canon-fix-tool.js";
import { createCanonStatusTool } from "../canon-status-tool.js";

const LIVE_PACKAGE_SLUGS = [
	"openclaw-host-git-workflow",
	"openclaw-workflow-planner",
	"openclaw-canon",
	"openclaw-session-bloat-warning",
	"openclaw-url-tailwind-scaffold",
] as const;

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
		await writeFile(
			join(packageDir, ".npmignore"),
			[
				"*",
				"!dist/**",
				"!openclaw.plugin.json",
				"!skills/**",
				"!README.md",
				"!LICENSE",
				"!package.json",
				"",
			].join("\n"),
			"utf8",
		);
		await writeFile(join(packageDir, "tsconfig.json"), "{}\n", "utf8");
		await writeFile(join(packageDir, "tsconfig.build.json"), "{}\n", "utf8");
		await writeFile(
			join(packageDir, "package.json"),
			`${JSON.stringify(
				{
					name: `@openclaw/${packageName}`,
					version: "0.1.0",
					files: [
						"dist",
						"openclaw.plugin.json",
						"skills",
						"README.md",
						"LICENSE",
					],
					openclaw: {
						extensions: ["./dist/index.js"],
					},
				},
				null,
				2,
			)}\n`,
			"utf8",
		);
		await writeFile(
			join(packageDir, "openclaw.plugin.json"),
			`${JSON.stringify(
				{
					id: packageName,
					version: "0.1.0",
					skills: ["./skills"],
				},
				null,
				2,
			)}\n`,
			"utf8",
		);
		await writeFile(join(packageDir, "src", "runtime", ".gitkeep"), "", "utf8");
		await writeFile(join(packageDir, "src", "test", ".gitkeep"), "", "utf8");
		await writeFile(join(packageDir, "src", "types", ".gitkeep"), "", "utf8");
		await writeFile(join(packageDir, "skills", ".gitkeep"), "", "utf8");
	}

	for (const packageSlug of LIVE_PACKAGE_SLUGS) {
		await writePackageFixture(packageSlug);
	}
	await writeFile(
		join(docsDir, "PLUGIN_PACKAGE_CANON.md"),
		[
			"# Plugin Package Canon",
			"",
			"Current live publishable plugin packages:",
			...LIVE_PACKAGE_SLUGS.map((packageSlug) => `- \`${packageSlug}/\``),
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
			...LIVE_PACKAGE_SLUGS.map((packageSlug) => `          - ${packageSlug}`),
			"    defaults:",
			"      run:",
			"        working-directory: $" + "{{ matrix.package }}",
			"    steps:",
			"      - run: pnpm lint",
			"      - run: pnpm typecheck",
			"      - run: pnpm build",
			"      - run: pnpm test",
			"      - run: pnpm pack:smoke",
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

async function createSparseRepo() {
	const root = await mkdtemp(join(tmpdir(), "openclaw-canon-sparse-"));
	await writeFile(join(root, "README.md"), "# sparse\n", "utf8");

	return {
		root,
		pluginConfig: {
			stateFilePath: join(root, ".openclaw-canon-state.json"),
			memoryFilePath: join(root, "memory.jsonl"),
			packageCanonPath: join(root, "docs", "PLUGIN_PACKAGE_CANON.md"),
			publishPreflightPath: join(root, "docs", "CLAWHUB_PUBLISH_PREFLIGHT.md"),
			repoReadmePath: join(root, "README.md"),
			ciWorkflowPath: join(root, ".github", "workflows", "ci.yml"),
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
			'{"id":"wrong-id","version":"0.1.0"}\n',
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

	it("detects .npmignore policy drift through canon_doctor source", async () => {
		const fixture = await createFixtureRepo();
		await writeFile(
			join(fixture.root, "openclaw-canon", ".npmignore"),
			"*\n",
			"utf8",
		);
		const tool = createCanonDoctorTool({
			pluginConfig: fixture.pluginConfig,
		});
		const result = await tool.execute("call-2b", {
			scope: "source",
			execution: "inline",
		});
		const payload = JSON.parse(result.content[0].text);

		expect(
			payload.findings.some(
				(finding: { id: string }) =>
					finding.id === "template-npmignore-policy-openclaw-canon",
			),
		).toBe(true);
	});

	it("does not require .npmignore when package files allowlist is canonical", async () => {
		const fixture = await createFixtureRepo();
		await rm(join(fixture.root, "openclaw-canon", ".npmignore"));
		const tool = createCanonDoctorTool({
			pluginConfig: fixture.pluginConfig,
		});
		const result = await tool.execute("call-2c", {
			scope: "source",
			execution: "inline",
		});
		const payload = JSON.parse(result.content[0].text);

		expect(
			payload.findings.some(
				(finding: { id: string }) =>
					finding.id === "template-missing-openclaw-canon-.npmignore",
			),
		).toBe(false);
	});

	it("detects CI verification-minimum drift through canon_doctor source", async () => {
		const fixture = await createFixtureRepo();
		await writeFile(
			fixture.pluginConfig.ciWorkflowPath,
			[
				"name: ci",
				"",
				"jobs:",
				"  plugin-packages:",
				"    strategy:",
				"      matrix:",
				"        package:",
				"          - openclaw-canon",
				"    steps:",
				"      - run: pnpm lint",
				"",
			].join("\n"),
			"utf8",
		);
		const tool = createCanonDoctorTool({
			pluginConfig: fixture.pluginConfig,
		});
		const result = await tool.execute("call-2c", {
			scope: "source",
			execution: "inline",
		});
		const payload = JSON.parse(result.content[0].text);

		expect(
			payload.findings.some(
				(finding: { id: string }) =>
					finding.id === "source-ci-verification-minimum",
			),
		).toBe(true);
	});

	it("detects shipped runtime entry drift through canon_doctor source", async () => {
		const fixture = await createFixtureRepo();
		await writeFile(
			join(fixture.root, "openclaw-canon", "package.json"),
			`${JSON.stringify(
				{
					name: "@openclaw/openclaw-canon",
					version: "0.1.0",
					files: ["openclaw.plugin.json", "skills", "README.md", "LICENSE"],
					openclaw: {
						extensions: [],
					},
				},
				null,
				2,
			)}\n`,
			"utf8",
		);
		const tool = createCanonDoctorTool({
			pluginConfig: fixture.pluginConfig,
		});
		const result = await tool.execute("call-2d", {
			scope: "source",
			execution: "inline",
		});
		const payload = JSON.parse(result.content[0].text);

		expect(
			payload.findings.some(
				(finding: { id: string }) =>
					finding.id === "source-files-allowlist-openclaw-canon",
			),
		).toBe(true);
		expect(
			payload.findings.some(
				(finding: { id: string }) =>
					finding.id === "source-runtime-entry-openclaw-canon",
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

	it("returns typed findings instead of throwing when canon files are missing", async () => {
		const fixture = await createSparseRepo();
		const doctorTool = createCanonDoctorTool({
			pluginConfig: fixture.pluginConfig,
		});
		const fixTool = createCanonFixTool({
			pluginConfig: fixture.pluginConfig,
		});

		const sourceResult = await doctorTool.execute("call-missing-1", {
			scope: "source",
			execution: "inline",
		});
		const sourcePayload = JSON.parse(sourceResult.content[0].text);
		expect(
			sourcePayload.findings.some(
				(finding: { id: string }) =>
					finding.id === "source-package-canon-missing",
			),
		).toBe(true);

		const memoryResult = await doctorTool.execute("call-missing-2", {
			scope: "memory",
			execution: "inline",
		});
		const memoryPayload = JSON.parse(memoryResult.content[0].text);
		expect(
			memoryPayload.findings.some(
				(finding: { id: string }) => finding.id === "memory-file-missing",
			),
		).toBe(true);

		const syncResult = await doctorTool.execute("call-missing-3", {
			scope: "sync",
			execution: "inline",
		});
		const syncPayload = JSON.parse(syncResult.content[0].text);
		expect(
			syncPayload.findings.some(
				(finding: { id: string }) =>
					finding.id === "sync-package-canon-missing",
			),
		).toBe(true);

		const memoryPreview = await fixTool.execute("call-missing-4", {
			scope: "memory",
			mode: "preview",
		});
		const memoryPreviewPayload = JSON.parse(memoryPreview.content[0].text);
		expect(memoryPreviewPayload.status).toBe("warning");
		expect(memoryPreviewPayload.changes).toHaveLength(0);

		const syncPreview = await fixTool.execute("call-missing-5", {
			scope: "sync",
			mode: "preview",
		});
		const syncPreviewPayload = JSON.parse(syncPreview.content[0].text);
		expect(syncPreviewPayload.status).toBe("critical");
		expect(syncPreviewPayload.changes).toHaveLength(0);
	});

	it("keeps package-shape audits active when linked canon docs are missing", async () => {
		const fixture = await createFixtureRepo();
		await rm(fixture.pluginConfig.publishPreflightPath);
		await writeFile(
			join(fixture.root, "openclaw-canon", "openclaw.plugin.json"),
			'{"id":"wrong-id","version":"0.1.0","skills":["./skills"]}\n',
			"utf8",
		);
		const tool = createCanonDoctorTool({
			pluginConfig: fixture.pluginConfig,
		});
		const result = await tool.execute("call-missing-6", {
			scope: "source",
			execution: "inline",
		});
		const payload = JSON.parse(result.content[0].text);

		expect(
			payload.findings.some(
				(finding: { id: string }) =>
					finding.id === "source-publish-preflight-missing",
			),
		).toBe(true);
		expect(
			payload.findings.some(
				(finding: { id: string }) =>
					finding.id === "source-id-mismatch-openclaw-canon",
			),
		).toBe(true);
	});

	it("prefers the configured OpenClaw source root over cwd for fallback paths", async () => {
		const fixture = await createFixtureRepo();
		const originalCwd = process.cwd();
		const originalProjectDir = process.env.OPENCLAW_PROJECT_DIR;
		const originalPluginSourceRoot = process.env.OPENCLAW_PLUGIN_SOURCE_ROOT;
		const unrelatedDir = await mkdtemp(join(tmpdir(), "openclaw-canon-cwd-"));

		process.chdir(unrelatedDir);
		process.env.OPENCLAW_PROJECT_DIR = join(
			unrelatedDir,
			"project-without-canon",
		);
		process.env.OPENCLAW_PLUGIN_SOURCE_ROOT = fixture.root;

		try {
			const tool = createCanonDoctorTool();
			const result = await tool.execute("call-env-1", {
				scope: "source",
				execution: "inline",
			});
			const payload = JSON.parse(result.content[0].text);

			expect(
				payload.findings.some(
					(finding: { id: string }) =>
						finding.id === "source-package-canon-missing",
				),
			).toBe(false);

			const statusTool = createCanonStatusTool();
			await statusTool.execute("call-env-2", {
				mode: "summary",
				refresh: "light",
			});

			const stateFile = await readFile(
				join(fixture.root, ".openclaw-canon-state.json"),
				"utf8",
			);
			expect(JSON.parse(stateFile).version).toBe(1);
		} finally {
			process.chdir(originalCwd);

			if (typeof originalProjectDir === "string") {
				process.env.OPENCLAW_PROJECT_DIR = originalProjectDir;
			} else {
				delete process.env.OPENCLAW_PROJECT_DIR;
			}

			if (typeof originalPluginSourceRoot === "string") {
				process.env.OPENCLAW_PLUGIN_SOURCE_ROOT = originalPluginSourceRoot;
			} else {
				delete process.env.OPENCLAW_PLUGIN_SOURCE_ROOT;
			}
		}
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
		expect(previewPayload.changes).toHaveLength(2);
		expect(previewPayload.proposals).toHaveLength(2);

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
			"`openclaw-host-git-workflow/`, `openclaw-workflow-planner/`, `openclaw-canon/`, `openclaw-session-bloat-warning/`, and `openclaw-url-tailwind-scaffold/`",
		);
		expect(preflightAfterApply).toContain("- `openclaw-host-git-workflow/`");
		expect(preflightAfterApply).toContain("- `openclaw-workflow-planner/`");
		expect(preflightAfterApply).toContain(
			"- `openclaw-session-bloat-warning/`",
		);
		expect(preflightAfterApply).toContain(
			"- `openclaw-url-tailwind-scaffold/`",
		);
		expect(ciAfterApply).toContain("openclaw-host-git-workflow");
		expect(ciAfterApply).toContain("openclaw-workflow-planner");
		expect(ciAfterApply).toContain("openclaw-session-bloat-warning");
		expect(ciAfterApply).toContain("openclaw-url-tailwind-scaffold");
	});

	it("rejects sync apply when the target block changed after preview", async () => {
		const fixture = await createFixtureRepo();
		const fixTool = createCanonFixTool({
			pluginConfig: fixture.pluginConfig,
		});
		const preview = await fixTool.execute("call-4d", {
			scope: "sync",
			mode: "preview",
			targetIds: ["sync-readme-live-package-fact"],
		});
		const previewPayload = JSON.parse(preview.content[0].text);

		await writeFile(
			fixture.pluginConfig.repoReadmePath,
			[
				"# repo",
				"",
				"## Repo Facts",
				"",
				"- The repo currently ships 999 publishable plugin packages: `openclaw-canon/`.",
				"",
			].join("\n"),
			"utf8",
		);

		await expect(
			fixTool.execute("call-4e", {
				scope: "sync",
				mode: "apply",
				confirmToken: previewPayload.confirmToken,
				targetIds: ["sync-readme-live-package-fact"],
			}),
		).rejects.toThrow("Sync preview no longer matches");
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
		expect(previewPayload.proposals).toHaveLength(4);

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

	it("rejects memory apply when the target line changed after preview", async () => {
		const fixture = await createFixtureRepo();
		await writeFile(
			fixture.pluginConfig.memoryFilePath,
			[
				'{"entityName":"A","entityType":"project","observation":"one","updatedAt":"2026-04-18","source":"manual-sync"}',
				"not json",
				"",
			].join("\n"),
			"utf8",
		);
		const fixTool = createCanonFixTool({
			pluginConfig: fixture.pluginConfig,
		});
		const preview = await fixTool.execute("call-4f", {
			scope: "memory",
			mode: "preview",
		});
		const previewPayload = JSON.parse(preview.content[0].text);

		await writeFile(
			fixture.pluginConfig.memoryFilePath,
			[
				'{"entityName":"A","entityType":"project","observation":"one","updatedAt":"2026-04-18","source":"manual-sync"}',
				"changed after preview",
				"",
			].join("\n"),
			"utf8",
		);

		await expect(
			fixTool.execute("call-4g", {
				scope: "memory",
				mode: "apply",
				confirmToken: previewPayload.confirmToken,
			}),
		).rejects.toThrow("Memory preview no longer matches");
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
