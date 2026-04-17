import type { HostCommandRunner } from "./node-execution.js";
import type {
	ConfirmedGroup,
	ConfirmedPlan,
} from "./validate-confirmed-plan.js";

const RUNTIME_ROOTS = ["openclaw-host-git-workflow/"];

type ChangedFile = {
	path: string;
	status: string;
};

type RepoArea = "docs" | "skills" | "runtime" | "repo";
type RuntimeSubtype = "planning" | "execute" | "install" | "mixed";

type PlannedCommit = {
	title: string;
	body: string;
};

export type PlannedGroup = {
	id: string;
	area: RepoArea;
	label: string;
	files: string[];
	commit: PlannedCommit;
	branch?: string;
	commands?: string[];
};

export type RepoState = {
	repoPath: string;
	currentBranch: string;
	headCommit: string;
	changedFiles: ChangedFile[];
};

export type PlanResult = {
	repoPath: string;
	currentBranch: string;
	changedFiles: Array<ChangedFile & { area: RepoArea }>;
	groups: PlannedGroup[];
	confirmedPlanCandidate: ConfirmedPlan | null;
};

export async function collectRepoState(
	repoPath: string,
	runner: HostCommandRunner,
): Promise<RepoState> {
	const branchResult = await runner.run(
		"git",
		["rev-parse", "--abbrev-ref", "HEAD"],
		{ cwd: repoPath },
	);
	const headResult = await runner.run("git", ["rev-parse", "HEAD"], {
		cwd: repoPath,
	});
	const statusResult = await runner.run(
		"git",
		["status", "--porcelain=v1", "-z"],
		{ cwd: repoPath },
	);

	return {
		repoPath,
		currentBranch: branchResult.stdout.trim(),
		headCommit: headResult.stdout.trim(),
		changedFiles: parsePorcelainZ(statusResult.stdout),
	};
}

export function buildPlanResult(
	repoState: RepoState,
	options: { includeBranches: boolean; sourceCommand: string },
): PlanResult {
	const changedFiles = repoState.changedFiles.map((file) => ({
		...file,
		area: classifyRepoArea(file.path),
	}));
	const groups = buildPlannedGroups(
		changedFiles,
		options.includeBranches,
		repoState.currentBranch,
	);

	return {
		repoPath: repoState.repoPath,
		currentBranch: repoState.currentBranch,
		changedFiles,
		groups,
		confirmedPlanCandidate:
			groups.length > 0 && options.includeBranches
				? buildConfirmedPlanCandidate(
						repoState.repoPath,
						options.sourceCommand,
						groups,
					)
				: null,
	};
}

function parsePorcelainZ(output: string): ChangedFile[] {
	if (output.length === 0) {
		return [];
	}

	const entries = output.split("\0").filter(Boolean);
	const files: ChangedFile[] = [];

	for (let index = 0; index < entries.length; index += 1) {
		const entry = entries[index];
		const status = entry.slice(0, 2);
		const rawPath = entry.slice(3);
		const normalizedStatus = status.trim() || "??";

		if (status[0] === "R" || status[0] === "C") {
			const renamedPath = entries[index + 1];
			if (!renamedPath) {
				throw new Error("Malformed git status output for rename/copy entry.");
			}
			files.push({ path: renamedPath, status: normalizedStatus });
			index += 1;
			continue;
		}

		files.push({ path: rawPath, status: normalizedStatus });
	}

	return files;
}

function classifyRepoArea(filePath: string): RepoArea {
	if (filePath === "README.md" || filePath.startsWith("docs/")) {
		return "docs";
	}

	if (filePath.startsWith("skills/")) {
		return "skills";
	}

	if (RUNTIME_ROOTS.some((root) => filePath.startsWith(root))) {
		return "runtime";
	}

	return "repo";
}

function buildPlannedGroups(
	changedFiles: Array<ChangedFile & { area: RepoArea }>,
	includeBranches: boolean,
	baseRef: string,
): PlannedGroup[] {
	const areaOrder: RepoArea[] = ["docs", "skills", "runtime", "repo"];
	const groupedFiles = new Map<RepoArea, string[]>();

	for (const file of changedFiles) {
		const files = groupedFiles.get(file.area) ?? [];
		files.push(file.path);
		groupedFiles.set(file.area, files);
	}

	const groups: PlannedGroup[] = [];
	for (const area of areaOrder) {
		const files = groupedFiles.get(area);
		if (!files || files.length === 0) {
			continue;
		}

		const sortedFiles = [...new Set(files)].sort();
		const areaGroups =
			area === "runtime"
				? buildRuntimeGroups(sortedFiles)
				: [buildGroupForArea(area, sortedFiles)];

		for (const group of areaGroups) {
			groups.push({
				id: `group-${groups.length + 1}`,
				area,
				label: group.label,
				files: group.files,
				commit: group.commit,
				...(includeBranches
					? {
							branch: group.branch,
							commands: buildExecutionCommands(
								group.branch,
								baseRef,
								group.files,
								group.commit,
							),
						}
					: {}),
			});
		}
	}

	return groups;
}

function buildGroupForArea(
	area: Exclude<RepoArea, "runtime">,
	files: string[],
): { label: string; branch: string; commit: PlannedCommit; files: string[] } {
	switch (area) {
		case "docs":
			return {
				label: "Docs and repo guidance",
				branch: "docs/update-host-workflow-docs",
				files,
				commit: {
					title: "docs(workflow): update host workflow docs",
					body: createCommitBody(
						"Update the host workflow documentation for the next planning slice.",
						[
							"Align docs with the self-contained host workflow package direction.",
							"Keep confirmed-plan handoff explicit for later runtime slices.",
							`Cover the changed docs set: ${summarizeFiles(files)}.`,
							"Keep finish-flow claims aligned with the currently shipped code.",
						],
					),
				},
			};
		case "skills":
			return {
				label: "Skill UX and command contract",
				branch: "feat/skills-refine-host-workflow",
				files,
				commit: {
					title: "feat(skills): refine host git workflow contract",
					body: createCommitBody(
						"Refine the skill-facing planning behavior for host git workflow commands.",
						[
							"Keep plan-only and later host-execute paths separate.",
							"Tighten how the skill describes the planning contract.",
							`Cover the changed skill files: ${summarizeFiles(files)}.`,
							"Preserve the bounded no-host-execute state of this package slice.",
						],
					),
				},
			};
		case "repo":
			return {
				label: "Repo metadata and support files",
				branch: "chore/repo-sync-host-workflow-metadata",
				files,
				commit: {
					title: "chore(repo): sync host workflow metadata",
					body: createCommitBody(
						"Sync repo-level metadata for the current host workflow slice.",
						[
							"Keep repo support files aligned with the new package direction.",
							"Avoid widening the workflow contract beyond the shipped package slice.",
							`Cover the changed repo files: ${summarizeFiles(files)}.`,
							"Keep host-backed finish flow claims separate until the runtime is implemented.",
						],
					),
				},
			};
	}
}

function buildRuntimeGroups(files: string[]): Array<{
	label: string;
	branch: string;
	commit: PlannedCommit;
	files: string[];
}> {
	const buckets = splitRuntimeFilesIntoBuckets(files);

	if (buckets.mixed.length > 0) {
		return [buildRuntimeGroupForSubtype("mixed", files)];
	}

	const orderedSubtypes: Array<Exclude<RuntimeSubtype, "mixed">> = [
		"planning",
		"execute",
		"install",
	];
	const groups = orderedSubtypes
		.map((subtype) => {
			const subtypeFiles = buckets[subtype];
			if (subtypeFiles.length === 0) {
				return null;
			}

			return buildRuntimeGroupForSubtype(subtype, subtypeFiles);
		})
		.filter((group): group is NonNullable<typeof group> => group !== null);

	return groups.length > 0
		? groups
		: [buildRuntimeGroupForSubtype("mixed", files)];
}

function splitRuntimeFilesIntoBuckets(
	files: string[],
): Record<RuntimeSubtype, string[]> {
	const buckets: Record<RuntimeSubtype, string[]> = {
		planning: [],
		execute: [],
		install: [],
		mixed: [],
	};

	for (const file of files) {
		const subtype = classifyRuntimeSubtype(file);
		buckets[subtype].push(file);
	}

	return Object.fromEntries(
		Object.entries(buckets).map(([subtype, subtypeFiles]) => [
			subtype,
			[...new Set(subtypeFiles)].sort(),
		]),
	) as Record<RuntimeSubtype, string[]>;
}

function classifyRuntimeSubtype(filePath: string): RuntimeSubtype {
	if (
		filePath === "openclaw-host-git-workflow/src/runtime/plan-groups.ts" ||
		filePath === "openclaw-host-git-workflow/src/runtime/plan-groups.test.ts"
	) {
		return "planning";
	}

	if (
		filePath ===
			"openclaw-host-git-workflow/src/runtime/validate-confirmed-plan.ts" ||
		filePath ===
			"openclaw-host-git-workflow/src/runtime/validate-confirmed-plan.test.ts" ||
		filePath === "openclaw-host-git-workflow/src/host-git-workflow-tool.ts"
	) {
		return "execute";
	}

	if (
		filePath === "openclaw-host-git-workflow/openclaw.plugin.json" ||
		filePath === "openclaw-host-git-workflow/package.json" ||
		filePath === "openclaw-host-git-workflow/pnpm-lock.yaml" ||
		filePath === "openclaw-host-git-workflow/tsconfig.json" ||
		filePath === "openclaw-host-git-workflow/tsconfig.build.json" ||
		filePath === "openclaw-host-git-workflow/index.ts" ||
		filePath === "openclaw-host-git-workflow/api.ts"
	) {
		return "install";
	}

	return "mixed";
}

function buildRuntimeGroupForSubtype(
	subtype: RuntimeSubtype,
	files: string[],
): { label: string; branch: string; commit: PlannedCommit; files: string[] } {
	switch (subtype) {
		case "planning":
			return {
				label: "Runtime planning logic",
				branch: "feat/host-workflow-refine-planning",
				files,
				commit: {
					title: "feat(workflow): refine host repo-aware planning",
					body: createCommitBody(
						"Refine deterministic repo-aware planning in the host workflow runtime.",
						[
							"Keep planning groups deterministic and path-based.",
							"Preserve confirmed-plan handoff for later host execution.",
							`Cover the changed planning files: ${summarizeFiles(files)}.`,
							"Avoid widening the shipped workflow surface beyond planning and validation.",
						],
					),
				},
			};
		case "execute":
			return {
				label: "Plugin and confirmed-plan runtime",
				branch: "feat/host-workflow-confirmed-plan-runtime",
				files,
				commit: {
					title: "feat(workflow): add confirmed-plan runtime slice",
					body: createCommitBody(
						"Add the confirmed-plan runtime slice for the host workflow package.",
						[
							"Keep runtime behavior bounded to shipped validation logic.",
							"Preserve deterministic commit metadata and safe confirmed-plan checks.",
							`Cover the changed runtime files: ${summarizeFiles(files)}.`,
							"Leave host-backed push and PR orchestration for later slices.",
						],
					),
				},
			};
		case "install":
			return {
				label: "Plugin install and package shape",
				branch: "fix/host-plugin-install-shape",
				files,
				commit: {
					title: "fix(plugin): refine host workflow package shape",
					body: createCommitBody(
						"Refine the plugin install and package shape for the host workflow runtime.",
						[
							"Keep package metadata aligned with the standalone plugin contract.",
							"Preserve deterministic install expectations for the active runtime.",
							`Cover the changed install files: ${summarizeFiles(files)}.`,
							"Avoid widening the workflow behavior beyond packaging concerns.",
						],
					),
				},
			};
		case "mixed":
			return {
				label: "Plugin and bounded runtime",
				branch: "feat/host-workflow-repo-aware-planning",
				files,
				commit: {
					title: "feat(workflow): add host repo-aware planning output",
					body: createCommitBody(
						"Add deterministic repo-aware planning output to the host workflow runtime.",
						[
							"Inspect git status and classify changed files by repo area.",
							"Generate stable groups, commit metadata, and branch suggestions.",
							`Cover the changed runtime files: ${summarizeFiles(files)}.`,
							"Keep execution limited to shipped validation-only behavior in this slice.",
						],
					),
				},
			};
	}
}

function createCommitBody(intro: string, bullets: string[]): string {
	if (bullets.length !== 4) {
		throw new Error("commit body builder requires exactly 4 bullets.");
	}

	return [intro, ...bullets.map((bullet) => `- ${bullet}`)].join("\n");
}

function summarizeFiles(files: string[]): string {
	if (files.length === 1) {
		return files[0];
	}

	if (files.length === 2) {
		return `${files[0]} and ${files[1]}`;
	}

	return `${files[0]}, ${files[1]}, and ${files.length - 2} more`;
}

function buildExecutionCommands(
	branch: string,
	baseRef: string,
	files: string[],
	commit: PlannedCommit,
): string[] {
	return [
		`git checkout -b ${branch} ${shellQuote(baseRef)}`,
		`git add -- ${files.map(shellQuote).join(" ")}`,
		`git commit -m ${shellQuote(commit.title)} -m ${shellQuote(commit.body)}`,
	];
}

function shellQuote(value: string): string {
	return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function buildConfirmedPlanCandidate(
	repoPath: string,
	sourceCommand: string,
	groups: PlannedGroup[],
): ConfirmedPlan {
	const confirmedGroups: ConfirmedGroup[] = groups.map((group) => {
		if (!group.branch) {
			throw new Error("branch-aware planning group is missing branch.");
		}

		return {
			id: group.id,
			branch: group.branch,
			files: group.files,
			commit: group.commit,
		};
	});

	return {
		version: 1,
		repoPath,
		status: "confirmed",
		sourceCommand,
		groups: confirmedGroups,
	};
}
