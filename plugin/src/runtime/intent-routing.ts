export type WorkflowIntent = "send_to_git";

const SEND_TO_GIT_ALIASES = new Set([
	"send_to_git",
	"отправь в гит",
	"отправь изменения",
	"send to git",
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
