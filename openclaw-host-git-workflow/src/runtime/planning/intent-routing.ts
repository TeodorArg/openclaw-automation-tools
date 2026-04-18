export type WorkflowIntent = "send_to_git";

const SEND_TO_GIT_ALIASES = new Set([
	"send_to_git",
	"отправь в гит",
	"отправь изменения",
	"разложи по git группам",
	"разложи по git группам с ветками",
	"выполни git группы с ветками",
	"разложи по git_группам",
	"разложи по git_группам с ветками",
	"выполни git_группы с ветками",
	"send to git",
]);

const ACTIVE_PLUGIN_MARKERS = [
	"openclaw_host_git_workflow",
	"openclaw host git workflow",
];

const VERIFICATION_ACTION_MARKERS = [
	"check",
	"verify",
	"test",
	"run",
	"try",
	"works",
	"проверь",
	"проверим",
	"проверка",
	"запусти",
	"запустить",
	"прогони",
	"прогон",
	"работает",
];

const FULL_FLOW_SCOPE_MARKERS = [
	"full cycle",
	"full_cycle",
	"full flow",
	"full_flow",
	"full workflow",
	"full_workflow",
	"end to end",
	"end_to_end",
	"e2e",
	"entire workflow",
	"entire flow",
	"complete flow",
	"complete workflow",
	"полный цикл",
	"полный_цикл",
	"полный прогон",
	"полный_прогон",
	"полный флоу",
	"полный_флоу",
	"весь workflow",
	"весь флоу",
	"весь flow",
];

const PLUGIN_NOUN_MARKERS = ["plugin", "plugins", "плагин", "плагина"];

function hasAnyMarker(normalized: string, markers: string[]): boolean {
	return markers.some((marker) => normalized.includes(marker));
}

function isFullCycleVerificationRequest(normalized: string): boolean {
	const mentionsActivePlugin = hasAnyMarker(normalized, ACTIVE_PLUGIN_MARKERS);
	const asksToVerify = hasAnyMarker(normalized, VERIFICATION_ACTION_MARKERS);
	const asksForFullCycle = hasAnyMarker(normalized, FULL_FLOW_SCOPE_MARKERS);
	const mentionsPluginNoun = hasAnyMarker(normalized, PLUGIN_NOUN_MARKERS);

	if (mentionsActivePlugin && (asksToVerify || asksForFullCycle)) {
		return true;
	}

	if (mentionsActivePlugin && mentionsPluginNoun && asksToVerify) {
		return true;
	}

	return false;
}

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

	if (isFullCycleVerificationRequest(normalized)) {
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
