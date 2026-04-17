export function resolveHostGitBin(): string {
	return process.env.OPENCLAW_HOST_GIT_WORKFLOW_GIT_BIN || "git";
}

export function resolveHostGhBin(): string {
	return process.env.OPENCLAW_HOST_GIT_WORKFLOW_GH_BIN || "gh";
}
