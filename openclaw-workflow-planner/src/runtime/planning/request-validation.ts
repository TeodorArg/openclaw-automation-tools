const AllowedSkillActions = {
	"openclaw-workflow-planner": new Set([
		"idea_create",
		"research_attach",
		"idea_gate",
		"plan_create",
		"plan_refresh",
		"idea_list",
		"idea_get",
		"plan_snapshot",
		"task_add",
		"task_done",
		"task_remove",
		"task_reopen",
		"implementation_brief",
		"idea_close",
	]),
	"openclaw-workflow-research": new Set([
		"idea_list",
		"idea_get",
		"research_attach",
		"idea_gate",
		"plan_snapshot",
	]),
	"openclaw-workflow-implementer": new Set([
		"idea_list",
		"idea_get",
		"plan_snapshot",
		"task_add",
		"task_done",
		"task_remove",
		"task_reopen",
		"implementation_brief",
		"idea_close",
	]),
} as const;

export type PlannerSkillName = keyof typeof AllowedSkillActions;
export type PlannerAction =
	| "idea_create"
	| "research_attach"
	| "idea_gate"
	| "plan_create"
	| "plan_refresh"
	| "idea_list"
	| "idea_get"
	| "plan_snapshot"
	| "task_add"
	| "task_done"
	| "task_remove"
	| "task_reopen"
	| "implementation_brief"
	| "idea_close";

export function validatePlannerSkill(skillName: string): PlannerSkillName {
	if (skillName in AllowedSkillActions) {
		return skillName as PlannerSkillName;
	}

	throw new Error(
		"workflow_planner_action only accepts requests from bundled openclaw-workflow-planner skills.",
	);
}

export function validateSkillActionPair(
	skillName: PlannerSkillName,
	action: PlannerAction,
): void {
	if (AllowedSkillActions[skillName].has(action)) {
		return;
	}

	throw new Error(
		`${skillName} does not support action ${action}. Use the skill that matches this workflow phase.`,
	);
}

export function requireNonEmptyText(value: string, fieldName: string): string {
	const trimmed = value.trim();

	if (trimmed.length > 0) {
		return trimmed;
	}

	throw new Error(`${fieldName} must be a non-empty string.`);
}

export function requireNonEmptyTextArray(
	value: string[] | undefined,
	fieldName: string,
): string[] {
	if (!Array.isArray(value) || value.length === 0) {
		throw new Error(`${fieldName} must be a non-empty string array.`);
	}

	const normalized = value.map((entry) =>
		requireNonEmptyText(entry, fieldName),
	);

	if (normalized.length > 0) {
		return normalized;
	}

	throw new Error(`${fieldName} must be a non-empty string array.`);
}
