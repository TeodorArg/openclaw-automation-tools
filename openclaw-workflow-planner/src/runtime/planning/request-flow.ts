import {
	requireIdeaSlug,
	updateIdea,
	upsertIdea,
} from "../state/planner-state.js";
import type { FlowContext, PlannerToolParams } from "./flow-helpers.js";
import {
	buildControlPlaneSummary,
	buildIdeaSummary,
	requirePersistedIdea,
} from "./flow-helpers.js";
import { requireNonEmptyText } from "./request-validation.js";

function normalizeOptionalText(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function hasSubstantiveIdeaChange(input: {
	problem: string;
	requestedOutcome: string;
	ownerSurface?: string;
	persistedIdea?: {
		problem: string;
		requestedOutcome: string;
		ownerSurface?: string;
	};
}): boolean {
	const nextOwnerSurface = normalizeOptionalText(input.ownerSurface) ?? "";
	const previousOwnerSurface =
		normalizeOptionalText(input.persistedIdea?.ownerSurface) ?? "";

	return (
		input.persistedIdea !== undefined &&
		(input.problem !== input.persistedIdea.problem ||
			input.requestedOutcome !== input.persistedIdea.requestedOutcome ||
			nextOwnerSurface !== previousOwnerSurface)
	);
}

export async function handleIdeaList(
	context: FlowContext,
	params: PlannerToolParams,
) {
	return {
		ok: true,
		action: params.action,
		commandName: params.commandName,
		command: params.command,
		plannerFilePath: context.filePath,
		ideas: context.state.ideas.map(buildIdeaSummary),
		controlPlane: buildControlPlaneSummary(context.state),
		note: "idea_list returns lightweight summaries for every tracked planner idea.",
	};
}

export async function handleIdeaCreate(
	context: FlowContext,
	params: PlannerToolParams,
	ideaName: string,
) {
	const ideaSlug = requireIdeaSlug(ideaName);
	const persistedIdea = context.state.ideas.find(
		(idea) => idea.slug === ideaSlug,
	);
	const problem = requireNonEmptyText(params.problem ?? "", "problem");
	const requestedOutcome = requireNonEmptyText(
		params.requestedOutcome ?? "",
		"requestedOutcome",
	);
	const now = new Date().toISOString();
	const resetLifecycle = hasSubstantiveIdeaChange({
		problem,
		requestedOutcome,
		ownerSurface: params.ownerSurface,
		persistedIdea,
	});
	const updatedState = upsertIdea(context.state, {
		slug: ideaSlug,
		name: ideaName,
		problem,
		requestedOutcome,
		createdAt: persistedIdea?.createdAt ?? now,
		status: resetLifecycle ? "draft" : (persistedIdea?.status ?? "draft"),
		notes: normalizeOptionalText(params.notes) ?? persistedIdea?.notes,
		links:
			params.links !== undefined
				? params.links.map((entry) => requireNonEmptyText(entry, "links"))
				: persistedIdea?.links,
		ownerSurface:
			normalizeOptionalText(params.ownerSurface) ?? persistedIdea?.ownerSurface,
		research: resetLifecycle ? undefined : persistedIdea?.research,
		ideaGate: resetLifecycle ? undefined : persistedIdea?.ideaGate,
		plan: resetLifecycle ? undefined : persistedIdea?.plan,
		tasks: resetLifecycle ? [] : (persistedIdea?.tasks ?? []),
		closeNote: resetLifecycle ? undefined : persistedIdea?.closeNote,
	});
	const saved = await context.save(updatedState, context.pluginConfig);
	const idea = updatedState.ideas.find((entry) => entry.slug === ideaSlug);

	return {
		ok: true,
		action: params.action,
		commandName: params.commandName,
		command: params.command,
		ideaName,
		ideaSlug,
		plannerFilePath: saved.filePath,
		idea,
		controlPlane: buildControlPlaneSummary(updatedState, ideaSlug),
		note: resetLifecycle
			? "idea_create updated the core request and reset downstream lifecycle state back to draft."
			: "idea_create creates or updates the base idea record before research and idea gate work begin.",
	};
}

export async function handleIdeaGet(
	context: FlowContext,
	params: PlannerToolParams,
	ideaName: string,
) {
	const ideaSlug = requireIdeaSlug(ideaName);
	const idea = requirePersistedIdea(
		context.state.ideas.find((entry) => entry.slug === ideaSlug),
		ideaSlug,
	);

	return {
		ok: true,
		action: params.action,
		commandName: params.commandName,
		command: params.command,
		ideaName,
		ideaSlug,
		plannerFilePath: context.filePath,
		idea,
		controlPlane: buildControlPlaneSummary(context.state, ideaSlug),
		note: "idea_get returns the full persisted idea record.",
	};
}

export async function handleIdeaClose(
	context: FlowContext,
	params: PlannerToolParams,
	ideaName: string,
) {
	const ideaSlug = requireIdeaSlug(ideaName);
	const closeNote = requireNonEmptyText(params.closeNote ?? "", "closeNote");
	const idea = context.state.ideas.find((entry) => entry.slug === ideaSlug);

	if (!idea || idea.status !== "accepted" || !idea.plan) {
		throw new Error(
			"idea_close requires an accepted idea with a current plan before completion can be recorded",
		);
	}

	const openTasks = idea.tasks.filter((task) => !task.done);
	if (openTasks.length > 0) {
		throw new Error(
			`idea_close requires all tasks to be complete before closure for idea ${idea.slug}. Open tasks: ${openTasks.map((task) => task.id).join(", ")}.`,
		);
	}

	const updatedState = updateIdea(context.state, ideaSlug, (existingIdea) => ({
		...existingIdea,
		status: "closed",
		closeNote,
	}));
	const saved = await context.save(updatedState, context.pluginConfig);

	return {
		ok: true,
		action: params.action,
		commandName: params.commandName,
		command: params.command,
		ideaName,
		ideaSlug,
		plannerFilePath: saved.filePath,
		closeNote,
		controlPlane: buildControlPlaneSummary(updatedState, ideaSlug),
		note: "idea_close marks the idea closed after the accepted plan is fully completed and an explicit outcome note is recorded.",
	};
}
