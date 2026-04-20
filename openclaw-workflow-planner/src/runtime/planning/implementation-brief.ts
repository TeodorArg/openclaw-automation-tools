import type { PlannerIdea } from "../state/planner-state.js";
import { buildTaskTargetContext } from "./flow-helpers.js";

export type ImplementationBriefTask = {
	id: string;
	taskIndex: number;
	selectorHint: string;
	text: string;
	origin: string;
	done: false;
};

export type ImplementationBriefInput = {
	ideaSlug: string;
	currentSlice: string;
	summary: string;
	scope: string[];
	avoid: string[];
	doneWhen: string;
	remainingOpenTaskCount: number;
	remainingOpenTaskGuidance: string;
	taskRefs: string[];
	openTasks: ImplementationBriefTask[];
};

export type ImplementationBriefResult = ImplementationBriefInput;

export function summarizeRemainingOpenTasks(tasks: PlannerIdea["tasks"]): {
	remainingOpenTaskCount: number;
	remainingOpenTaskGuidance: string;
} {
	const openTasks = tasks
		.map((task, index) => ({ task, taskIndex: index + 1 }))
		.filter(({ task }) => !task.done);
	const nextOpenTask = openTasks[0];

	return {
		remainingOpenTaskCount: openTasks.length,
		remainingOpenTaskGuidance: nextOpenTask
			? `${openTasks.length} open task${openTasks.length === 1 ? "" : "s"} remain. Start with ${nextOpenTask.task.text} using taskId=${nextOpenTask.task.id} or taskIndex=${nextOpenTask.taskIndex}.`
			: "No open tasks remain. Verify the slice against doneWhen, then use idea_close to record the delivered outcome.",
	};
}

export function buildImplementationBriefFromIdea(
	idea: PlannerIdea,
): ImplementationBriefResult {
	if (!idea.plan || idea.status !== "accepted") {
		throw new Error(
			"implementation_brief requires an accepted idea with a persisted plan.",
		);
	}

	const openTasks = idea.tasks
		.map((task, index) => ({ task, taskIndex: index + 1 }))
		.filter(({ task }) => !task.done);
	const remainingOpenTasks = summarizeRemainingOpenTasks(idea.tasks);

	return {
		ideaSlug: idea.slug,
		currentSlice: idea.plan.currentSlice,
		summary: `Implement the current slice for ${idea.name}: ${idea.plan.currentSlice}.`,
		scope: [
			`Goal: ${idea.plan.goal}`,
			...idea.plan.scope,
			...openTasks.map(
				({ task, taskIndex }) =>
					`Open task #${taskIndex}: ${task.text} (${task.id}) [use taskId=${task.id} or taskIndex=${taskIndex}]`,
			),
		],
		avoid: [
			...idea.plan.outOfScope,
			"Do not treat local Codex sub-agents as shipped runtime agents.",
			"Do not broaden the slice into unrelated repo-governance cleanup.",
		],
		doneWhen: idea.plan.acceptanceTarget,
		...remainingOpenTasks,
		taskRefs: openTasks.map(({ task }) => task.id),
		openTasks: openTasks.map(({ task, taskIndex }) => ({
			id: task.id,
			taskIndex,
			selectorHint: buildTaskTargetContext(task, taskIndex).targetSelectorHint,
			text: task.text,
			origin: task.origin,
			done: false,
		})),
	};
}

export function buildImplementationBrief(
	input: ImplementationBriefInput,
): ImplementationBriefResult {
	return input;
}
