import path from "node:path";

export const DEFAULT_REPO_PATH = "/home/node/project";

export type RepoResolutionSource =
	| "OPENCLAW_HOST_GIT_WORKFLOW_REPO"
	| "OPENCLAW_PROJECT_DIR"
	| "default";

export type ResolvedRepoTarget = {
	repoPath: string;
	requestedRepoPath: string;
	resolutionSource: RepoResolutionSource;
	usedDefault: boolean;
};

type RepoResolutionEnv = {
	OPENCLAW_HOST_GIT_WORKFLOW_REPO?: string;
	OPENCLAW_PROJECT_DIR?: string;
};

function readFirstNonEmpty(
	values: Array<{ source: RepoResolutionSource; value: string | undefined }>,
): { source: RepoResolutionSource; value: string } | null {
	for (const candidate of values) {
		if (candidate.value && candidate.value.trim() !== "") {
			return {
				source: candidate.source,
				value: candidate.value.trim(),
			};
		}
	}

	return null;
}

export function resolveRepoTarget(
	env: RepoResolutionEnv = process.env,
): ResolvedRepoTarget {
	const explicitTarget = readFirstNonEmpty([
		{
			source: "OPENCLAW_HOST_GIT_WORKFLOW_REPO",
			value: env.OPENCLAW_HOST_GIT_WORKFLOW_REPO,
		},
		{
			source: "OPENCLAW_PROJECT_DIR",
			value: env.OPENCLAW_PROJECT_DIR,
		},
	]);

	if (explicitTarget) {
		return {
			repoPath: path.resolve(explicitTarget.value),
			requestedRepoPath: explicitTarget.value,
			resolutionSource: explicitTarget.source,
			usedDefault: false,
		};
	}

	return {
		repoPath: path.resolve(DEFAULT_REPO_PATH),
		requestedRepoPath: DEFAULT_REPO_PATH,
		resolutionSource: "default",
		usedDefault: true,
	};
}
