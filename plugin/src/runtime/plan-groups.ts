import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
	ConfirmedGroup,
	ConfirmedPlan,
} from "./validate-confirmed-plan.js";

const execFileAsync = promisify(execFile);

type ChangedFile = {
	path: string;
	status: string;
};

type RepoArea = "docs" | "skills" | "runtime" | "repo";

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
	changedFiles: ChangedFile[];
};

export type PlanResult = {
	repoPath: string;
	currentBranch: string;
	changedFiles: Array<ChangedFile & { area: RepoArea }>;
	groups: PlannedGroup[];
	confirmedPlanCandidate: ConfirmedPlan | null;
};

export async function collectRepoState(repoPath: string): Promise<RepoState> {
	const branchResult = await execFileAsync(
		"git",
		["rev-parse", "--abbrev-ref", "HEAD"],
		{ cwd: repoPath },
	);
	const statusResult = await execFileAsync(
		"git",
		["status", "--porcelain=v1", "-z"],
		{ cwd: repoPath },
	);

	return {
		repoPath,
		currentBranch: branchResult.stdout.trim(),
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
	const groups = buildPlannedGroups(changedFiles, options.includeBranches);

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

	if (filePath.startsWith("plugin/") || filePath.startsWith("scripts/")) {
		return "runtime";
	}

	return "repo";
}

function buildPlannedGroups(
	changedFiles: Array<ChangedFile & { area: RepoArea }>,
	includeBranches: boolean,
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
		const group = buildGroupForArea(area, sortedFiles);
		groups.push({
			id: `group-${groups.length + 1}`,
			area,
			label: group.label,
			files: sortedFiles,
			commit: group.commit,
			...(includeBranches
				? {
						branch: group.branch,
						commands: buildExecutionCommands(
							group.branch,
							sortedFiles,
							group.commit,
						),
					}
				: {}),
		});
	}

	return groups;
}

function buildGroupForArea(
	area: RepoArea,
	files: string[],
): { label: string; branch: string; commit: PlannedCommit } {
	switch (area) {
		case "docs":
			return {
				label: "Docs and repo guidance",
				branch: "docs/update-workflow-docs",
				commit: {
					title: "docs(workflow): update planning and usage docs",
					body: createCommitBody(
						"Update the workflow documentation for the next planning slice.",
						[
							"Align docs with the repo-aware planning behavior.",
							"Keep confirmed-plan handoff explicit for execute mode.",
							`Cover the changed docs set: ${summarizeFiles(files)}.`,
							"Keep push and PR work out of the v1 path.",
						],
					),
				},
			};
		case "skills":
			return {
				label: "Skill UX and command contract",
				branch: "feat/skills-refine-workflow-planning",
				commit: {
					title: "feat(skills): refine git workflow planning behavior",
					body: createCommitBody(
						"Refine the skill-facing planning behavior for git workflow commands.",
						[
							"Keep plan-only and execute-only paths separate.",
							"Tighten how the skill describes the planning contract.",
							`Cover the changed skill files: ${summarizeFiles(files)}.`,
							"Preserve the bounded no-push v1 execution rules.",
						],
					),
				},
			};
		case "runtime":
			return {
				label: "Plugin and bounded runtime",
				branch: files.some((file) => file.startsWith("scripts/"))
					? "feat/workflow-refine-planning-and-execute"
					: "feat/workflow-repo-aware-planning",
				commit: {
					title: files.some((file) => file.startsWith("scripts/"))
						? "feat(workflow): refine planning and bounded execute"
						: "feat(workflow): add repo-aware planning output",
					body: createCommitBody(
						files.some((file) => file.startsWith("scripts/"))
							? "Refine the runtime path for planning and bounded execution."
							: "Add deterministic repo-aware planning output to the workflow runtime.",
						[
							"Inspect git status and classify changed files by repo area.",
							"Generate stable groups, commit metadata, and branch suggestions.",
							`Cover the changed runtime files: ${summarizeFiles(files)}.`,
							"Keep execute bounded to branch plus commit, with no push.",
						],
					),
				},
			};
		case "repo":
			return {
				label: "Repo metadata and support files",
				branch: "chore/repo-sync-workflow-metadata",
				commit: {
					title: "chore(repo): sync workflow repo metadata",
					body: createCommitBody(
						"Sync repo-level metadata for the current workflow slice.",
						[
							"Keep repo support files aligned with the implementation state.",
							"Avoid widening the workflow contract beyond v1 boundaries.",
							`Cover the changed repo files: ${summarizeFiles(files)}.`,
							"Leave push and PR layers as separate later steps.",
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
	files: string[],
	commit: PlannedCommit,
): string[] {
	return [
		`git checkout -b ${branch}`,
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
