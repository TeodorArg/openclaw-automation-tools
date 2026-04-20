import {
	createManualTaskId,
	type PlannerIdea,
	type PlannerTask,
	requireIdeaSlug,
	syncPlanBlockChecklistWithTasks,
	updateIdea,
} from "../state/planner-state.js";
import type {
	FlowContext,
	PlannerToolParams,
	TaskTargetContext,
} from "./flow-helpers.js";
import {
	buildControlPlaneSummary,
	buildTaskTargetContext,
	requireAcceptedIdea,
	requireCurrentSliceBrief,
	requirePersistedIdea,
} from "./flow-helpers.js";
import { summarizeRemainingOpenTasks } from "./implementation-brief.js";
import { requireNonEmptyText } from "./request-validation.js";

export async function handleTaskAdd(
	context: FlowContext,
	params: PlannerToolParams,
	ideaName: string,
) {
	const ideaSlug = requireIdeaSlug(ideaName);
	const idea = requireAcceptedIdea(
		requirePersistedIdea(
			context.state.ideas.find((entry) => entry.slug === ideaSlug),
			ideaSlug,
		),
	);
	const taskText = requireNonEmptyText(params.taskText ?? "", "taskText");
	const manualTask: PlannerTask = {
		id: createManualTaskId(taskText),
		text: taskText,
		origin: "manual",
		done: false,
	};
	const tasks = idea.tasks.concat(manualTask);
	const updatedState = updateIdea(context.state, ideaSlug, (existingIdea) => ({
		...existingIdea,
		tasks,
		plan: existingIdea.plan
			? {
					...existingIdea.plan,
					planBlocks: syncPlanBlockChecklistWithTasks(
						existingIdea.plan.planBlocks,
						tasks,
					),
				}
			: existingIdea.plan,
	}));
	const saved = await context.save(updatedState, context.pluginConfig);
	const addedTaskIndex = tasks.length;
	const targetContext = buildTaskTargetContext(manualTask, addedTaskIndex);
	const remainingOpenTasks = summarizeRemainingOpenTasks(tasks);

	return {
		ok: true,
		action: params.action,
		commandName: params.commandName,
		command: params.command,
		ideaName,
		ideaSlug,
		plannerFilePath: saved.filePath,
		addedTask: manualTask,
		addedTaskId: manualTask.id,
		addedTaskIndex,
		addedTaskSelectorHint: targetContext.targetSelectorHint,
		...targetContext,
		...remainingOpenTasks,
		controlPlane: buildControlPlaneSummary(updatedState, ideaSlug),
		note: "task_add appends one manual unchecked task to an accepted idea.",
	};
}

type TaskTarget =
	| {
			usedTaskId: true;
			taskId: string;
	  }
	| {
			usedTaskId: false;
			taskIndex: number;
	  };

type TaskCompletionUpdateResult = {
	ok: true;
	action: PlannerToolParams["action"];
	commandName: string;
	command: string;
	ideaName: string;
	ideaSlug: string;
	plannerFilePath: string;
	controlPlane: ReturnType<typeof buildControlPlaneSummary>;
	remainingOpenTaskCount: number;
	remainingOpenTaskGuidance: string;
} & TaskTargetContext &
	TaskTarget;

function resolveTaskTarget(
	idea: PlannerIdea,
	params: PlannerToolParams,
	action: "task_done" | "task_remove" | "task_reopen",
): TaskTarget {
	if (typeof params.taskId === "string") {
		const taskId = requireNonEmptyText(params.taskId, "taskId");
		const task = idea.tasks.find((entry) => entry.id === taskId);
		if (!task) {
			throw new Error(`taskId ${taskId} was not found for idea ${idea.slug}.`);
		}

		return {
			usedTaskId: true,
			taskId,
		};
	}

	if (
		typeof params.taskIndex !== "number" ||
		!Number.isInteger(params.taskIndex)
	) {
		throw new Error(
			`${action} requires either taskId or an integer taskIndex.`,
		);
	}

	const taskIndex = params.taskIndex;
	if (taskIndex < 1 || taskIndex > idea.tasks.length) {
		throw new Error(
			`taskIndex ${taskIndex} is out of range for idea ${idea.slug}.`,
		);
	}

	return {
		usedTaskId: false,
		taskIndex,
	};
}

async function updateTaskCompletionState(
	context: FlowContext,
	params: PlannerToolParams,
	ideaName: string,
	nextDone: boolean,
	action: "task_done" | "task_reopen",
): Promise<TaskCompletionUpdateResult> {
	const ideaSlug = requireIdeaSlug(ideaName);
	const acceptedIdea = requireAcceptedIdea(
		requirePersistedIdea(
			context.state.ideas.find((entry) => entry.slug === ideaSlug),
			ideaSlug,
		),
	);
	const target = resolveTaskTarget(acceptedIdea, params, action);
	const idea = requireCurrentSliceBrief(acceptedIdea);
	const targetTaskIndex = target.usedTaskId
		? idea.tasks.findIndex((entry) => entry.id === target.taskId) + 1
		: target.taskIndex;
	const targetTask = idea.tasks[targetTaskIndex - 1];
	if (!targetTask) {
		throw new Error(`Target task was not found for idea ${idea.slug}.`);
	}
	const targetContext = buildTaskTargetContext(targetTask, targetTaskIndex);
	const tasks = idea.tasks.map((entry, index) => {
		if (target.usedTaskId) {
			return entry.id === target.taskId ? { ...entry, done: nextDone } : entry;
		}

		return index === target.taskIndex - 1
			? { ...entry, done: nextDone }
			: entry;
	});
	const updatedState = updateIdea(context.state, ideaSlug, (existingIdea) => ({
		...existingIdea,
		tasks,
		plan: existingIdea.plan
			? {
					...existingIdea.plan,
					planBlocks: syncPlanBlockChecklistWithTasks(
						existingIdea.plan.planBlocks,
						tasks,
					),
				}
			: existingIdea.plan,
	}));
	const saved = await context.save(updatedState, context.pluginConfig);
	const remainingOpenTasks = summarizeRemainingOpenTasks(tasks);

	return {
		ok: true,
		action: params.action,
		commandName: params.commandName,
		command: params.command,
		ideaName,
		ideaSlug,
		plannerFilePath: saved.filePath,
		controlPlane: buildControlPlaneSummary(updatedState, ideaSlug),
		...targetContext,
		targetTask: { ...targetContext.targetTask, done: nextDone },
		...remainingOpenTasks,
		...target,
	};
}

export async function handleTaskDone(
	context: FlowContext,
	params: PlannerToolParams,
	ideaName: string,
) {
	const result = await updateTaskCompletionState(
		context,
		params,
		ideaName,
		true,
		"task_done",
	);

	return {
		...result,
		completedTask: result.targetTask,
		completedTaskId: result.targetTaskId,
		completedTaskIndex: result.targetTaskIndex,
		completedTaskSelectorHint: result.targetSelectorHint,
		note: "task_done marks a task complete by stable task id, with legacy taskIndex support.",
	};
}

export async function handleTaskRemove(
	context: FlowContext,
	params: PlannerToolParams,
	ideaName: string,
) {
	const ideaSlug = requireIdeaSlug(ideaName);
	const idea = requireAcceptedIdea(
		requirePersistedIdea(
			context.state.ideas.find((entry) => entry.slug === ideaSlug),
			ideaSlug,
		),
	);
	const target = resolveTaskTarget(idea, params, "task_remove");
	const removedTask = target.usedTaskId
		? idea.tasks.find((entry) => entry.id === target.taskId)
		: idea.tasks[target.taskIndex - 1];
	const removedTaskId = removedTask?.id;
	const tasks = target.usedTaskId
		? idea.tasks.filter((entry) => entry.id !== target.taskId)
		: idea.tasks.filter((_, index) => index !== target.taskIndex - 1);
	const updatedState = updateIdea(context.state, ideaSlug, (existingIdea) => ({
		...existingIdea,
		tasks,
		plan: existingIdea.plan
			? {
					...existingIdea.plan,
					planBlocks: syncPlanBlockChecklistWithTasks(
						existingIdea.plan.planBlocks.map((block) => ({
							...block,
							checklist: removedTaskId
								? block.checklist.filter((task) => task.id !== removedTaskId)
								: block.checklist,
						})),
						tasks,
					),
				}
			: existingIdea.plan,
	}));
	const saved = await context.save(updatedState, context.pluginConfig);
	const remainingOpenTasks = summarizeRemainingOpenTasks(tasks);

	const removedTaskIndex = target.usedTaskId
		? idea.tasks.findIndex((entry) => entry.id === target.taskId) + 1
		: target.taskIndex;
	const removedTaskContext = removedTask
		? buildTaskTargetContext(removedTask, removedTaskIndex)
		: undefined;

	return {
		ok: true,
		action: params.action,
		commandName: params.commandName,
		command: params.command,
		ideaName,
		ideaSlug,
		plannerFilePath: saved.filePath,
		controlPlane: buildControlPlaneSummary(updatedState, ideaSlug),
		targetTask: removedTask,
		targetTaskId: removedTask?.id,
		targetTaskIndex: removedTaskIndex,
		targetSelectorHint: removedTaskContext?.targetSelectorHint,
		...remainingOpenTasks,
		...target,
		removedTaskId: removedTask?.id,
		removedTaskIndex,
		removedTask,
		removedTaskSelectorHint: removedTaskContext?.targetSelectorHint,
		note: "task_remove deletes a task by stable task id, with legacy taskIndex support.",
	};
}

export async function handleTaskReopen(
	context: FlowContext,
	params: PlannerToolParams,
	ideaName: string,
) {
	const result = await updateTaskCompletionState(
		context,
		params,
		ideaName,
		false,
		"task_reopen",
	);

	return {
		...result,
		reopenedTask: result.targetTask,
		reopenedTaskId: result.targetTaskId,
		reopenedTaskIndex: result.targetTaskIndex,
		reopenedTaskSelectorHint: result.targetSelectorHint,
		note: "task_reopen marks a task not done by stable task id, with legacy taskIndex support.",
	};
}
