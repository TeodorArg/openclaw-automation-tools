import type { PlannerIdea } from "../state/planner-state.js";

export type ImplementationBriefInput = {
	ideaSlug: string;
	currentSlice: string;
	summary: string;
	scope: string[];
	avoid: string[];
	doneWhen: string;
	taskRefs: string[];
};

export type ImplementationBriefResult = ImplementationBriefInput;

export function buildImplementationBriefFromIdea(
	idea: PlannerIdea,
): ImplementationBriefResult {
	if (!idea.plan || idea.status !== "accepted") {
		throw new Error(
			"implementation_brief requires an accepted idea with a persisted plan.",
		);
	}

	const openTasks = idea.tasks.filter((task) => !task.done);

	return {
		ideaSlug: idea.slug,
		currentSlice: idea.plan.currentSlice,
		summary: `Implement the current slice for ${idea.name}: ${idea.plan.currentSlice}.`,
		scope: [
			`Goal: ${idea.plan.goal}`,
			...idea.plan.scope,
			...openTasks.map((task) => `Open task: ${task.text}`),
		],
		avoid: [
			...idea.plan.outOfScope,
			"Do not treat local Codex sub-agents as shipped runtime agents.",
			"Do not broaden the slice into unrelated repo-governance cleanup.",
		],
		doneWhen: idea.plan.acceptanceTarget,
		taskRefs: openTasks.map((task) => task.id),
	};
}

export function buildImplementationBrief(
	input: ImplementationBriefInput,
): ImplementationBriefResult {
	return input;
}
