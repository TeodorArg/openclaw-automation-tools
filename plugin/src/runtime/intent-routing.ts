export type WorkflowIntent = "send_to_git" | "open_pr";

const SEND_TO_GIT_ALIASES = new Set([
	"send_to_git",
	"отправь в гит",
	"запушь",
	"отправь изменения",
	"send to git",
	"push it",
	"ship to git",
]);

const OPEN_PR_ALIASES = new Set([
	"open_pr",
	"сделай pr",
	"make a pr",
	"open a pr",
]);

function normalizeUtterance(raw: string): string {
	return raw
		.trim()
		.toLowerCase()
		.replace(/^\/+/, "")
		.replace(/[_-]+/g, "_")
		.replace(/\s+/g, " ");
}

export function normalizeWorkflowIntent(raw: string): WorkflowIntent | null {
	const normalized = normalizeUtterance(raw);

	if (SEND_TO_GIT_ALIASES.has(normalized)) {
		return "send_to_git";
	}

	if (OPEN_PR_ALIASES.has(normalized)) {
		return "open_pr";
	}

	return null;
}

export function resolveWorkflowIntent(input: {
	commandName: string;
	command: string;
}): WorkflowIntent | null {
	return (
		normalizeWorkflowIntent(input.commandName) ??
		normalizeWorkflowIntent(input.command)
	);
}
