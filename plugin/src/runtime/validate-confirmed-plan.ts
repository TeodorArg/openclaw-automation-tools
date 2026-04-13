import path from "node:path";

export type ConfirmedCommit = {
	title: string;
	body: string;
};

export type ConfirmedGroup = {
	id: string;
	branch: string;
	files: string[];
	commit: ConfirmedCommit;
};

export type ConfirmedPlan = {
	version: 1;
	repoPath: string;
	status: "confirmed";
	sourceCommand: string;
	groups: ConfirmedGroup[];
};

const BRANCH_RE =
	/^(feat|fix|docs|refactor|chore|test|build|ci)\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COMMIT_TITLE_RE =
	/^(feat|fix|docs|refactor|chore|test|build|ci)\([a-z0-9-]+\): [^\s].+$/;

function assertNonEmptyString(
	value: unknown,
	field: string,
): asserts value is string {
	if (typeof value !== "string" || value.trim() === "") {
		throw new Error(`${field} must be a non-empty string.`);
	}
}

function validateCommitBody(body: string): void {
	const lines = body.split(/\r?\n/);
	if (lines.length !== 5) {
		throw new Error(
			"commit.body must contain 1 intro line plus exactly 4 bullet lines.",
		);
	}

	if (lines[0].trim() === "") {
		throw new Error("commit.body intro line must be non-empty.");
	}

	const bulletLines = lines.slice(1);
	for (const line of bulletLines) {
		if (!line.startsWith("- ")) {
			throw new Error("commit.body bullet lines must start with '- '.");
		}
		if (line.trim().length <= 2) {
			throw new Error("commit.body bullet lines must be non-empty.");
		}
	}
}

function validateRepoRelativeFile(repoPath: string, file: string): void {
	if (path.isAbsolute(file)) {
		throw new Error(`group file '${file}' must be repo-relative.`);
	}

	const normalized = path.posix.normalize(file);
	if (normalized.startsWith("../") || normalized === "..") {
		throw new Error(`group file '${file}' escapes repo root.`);
	}

	const resolved = path.resolve(repoPath, normalized);
	const relative = path.relative(repoPath, resolved);
	if (relative.startsWith("..") || path.isAbsolute(relative)) {
		throw new Error(`group file '${file}' escapes repo root.`);
	}
}

export function validateConfirmedPlan(
	raw: unknown,
	expectedRepoPath: string,
): ConfirmedPlan {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		throw new Error("confirmedPlan must be an object.");
	}

	const plan = raw as Partial<ConfirmedPlan>;

	if (plan.version !== 1) {
		throw new Error("confirmedPlan.version must be 1.");
	}

	assertNonEmptyString(plan.repoPath, "confirmedPlan.repoPath");
	assertNonEmptyString(plan.sourceCommand, "confirmedPlan.sourceCommand");

	if (plan.status !== "confirmed") {
		throw new Error("confirmedPlan.status must be 'confirmed'.");
	}

	const normalizedExpectedRepoPath = path.resolve(expectedRepoPath);
	const normalizedPlanRepoPath = path.resolve(plan.repoPath);
	if (normalizedPlanRepoPath !== normalizedExpectedRepoPath) {
		throw new Error(
			"confirmedPlan.repoPath does not match the active target repo.",
		);
	}

	if (!Array.isArray(plan.groups) || plan.groups.length < 1) {
		throw new Error("confirmedPlan.groups must be a non-empty array.");
	}

	const seenGroupIds = new Set<string>();
	const seenBranches = new Set<string>();

	for (const [index, group] of plan.groups.entries()) {
		const prefix = `confirmedPlan.groups[${index}]`;
		if (!group || typeof group !== "object" || Array.isArray(group)) {
			throw new Error(`${prefix} must be an object.`);
		}

		assertNonEmptyString(group.id, `${prefix}.id`);
		if (seenGroupIds.has(group.id)) {
			throw new Error(`${prefix}.id must be unique.`);
		}
		seenGroupIds.add(group.id);

		assertNonEmptyString(group.branch, `${prefix}.branch`);
		if (seenBranches.has(group.branch)) {
			throw new Error(`${prefix}.branch must be unique.`);
		}
		seenBranches.add(group.branch);
		if (!BRANCH_RE.test(group.branch)) {
			throw new Error(`${prefix}.branch is malformed or unsafe.`);
		}

		if (!Array.isArray(group.files) || group.files.length < 1) {
			throw new Error(`${prefix}.files must be a non-empty array.`);
		}

		const seenFiles = new Set<string>();
		for (const file of group.files) {
			assertNonEmptyString(file, `${prefix}.files[]`);
			validateRepoRelativeFile(normalizedExpectedRepoPath, file);
			if (seenFiles.has(file)) {
				throw new Error(`${prefix}.files must not contain duplicates.`);
			}
			seenFiles.add(file);
		}

		if (
			!group.commit ||
			typeof group.commit !== "object" ||
			Array.isArray(group.commit)
		) {
			throw new Error(`${prefix}.commit must be an object.`);
		}

		assertNonEmptyString(group.commit.title, `${prefix}.commit.title`);
		assertNonEmptyString(group.commit.body, `${prefix}.commit.body`);

		if (!COMMIT_TITLE_RE.test(group.commit.title)) {
			throw new Error(`${prefix}.commit.title is malformed.`);
		}

		validateCommitBody(group.commit.body);
	}

	return plan as ConfirmedPlan;
}
