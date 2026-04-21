import {
	createDefaultPlanArtifactRefs,
	deriveIdeaGateDecisionIds,
	invalidateCurrentExecutionBriefState,
	mergePlannerTasks,
	type PlannerPlan,
	type PlannerProvenanceEnvelope,
	requireIdeaSlug,
	slugifyIdeaName,
	syncPlanBlockChecklistWithTasks,
	updateIdea,
	updateTaskSetForTasks,
} from "../state/planner-state.js";
import type { FlowContext, PlannerToolParams } from "./flow-helpers.js";
import {
	buildControlPlaneSummary,
	requirePersistedIdea,
} from "./flow-helpers.js";
import { buildDraftPlan, type DraftPlanInput } from "./plan-draft.js";

export async function handlePlanCreateOrRefresh(
	context: FlowContext,
	params: PlannerToolParams,
	ideaName: string,
) {
	const ideaSlug = requireIdeaSlug(ideaName);
	const idea = requirePersistedIdea(
		context.state.ideas.find((entry) => entry.slug === ideaSlug),
		ideaSlug,
	);

	if (idea.status !== "accepted") {
		throw new Error(
			`Idea ${idea.slug} must be accepted before ${params.action} can run.`,
		);
	}

	if (!idea.design) {
		throw new Error(
			`Idea ${idea.slug} requires design_prepare before ${params.action} can run.`,
		);
	}

	if (params.action === "plan_create" && idea.plan) {
		throw new Error(
			`Idea ${idea.slug} already has a plan. Use plan_refresh instead of plan_create.`,
		);
	}

	if (params.action === "plan_refresh" && !idea.plan) {
		throw new Error(
			`Idea ${idea.slug} does not have a plan yet. Use plan_create before plan_refresh.`,
		);
	}

	const result = buildDraftPlan({
		idea,
		mode: params.action as "plan_create" | "plan_refresh",
		acceptanceTarget: params.acceptanceTarget,
		currentSlice: params.currentSlice,
	} satisfies DraftPlanInput);
	const mergedTasks = mergePlannerTasks(result.tasks, idea.tasks);
	const materialChangeClass: PlannerProvenanceEnvelope["materialChangeClass"] =
		params.action === "plan_create" ? "create" : "refresh";
	const syncedPlan: PlannerPlan = {
		...result.plan,
		id: idea.plan?.id ?? `plan_${idea.slug}`,
		ideaId: idea.slug,
		designId: idea.design.id,
		revision:
			params.action === "plan_refresh" ? (idea.plan?.revision ?? 0) + 1 : 1,
		currentSliceId:
			idea.plan?.currentSliceId ??
			`slice_${slugifyIdeaName(result.plan.currentSlice) || "current"}`,
		planBlocks: syncPlanBlockChecklistWithTasks(
			result.plan.planBlocks,
			mergedTasks,
		),
		provenance: {
			requestId: `req_${idea.slug}`,
			governingEntityRefs: [
				{
					entityType: "idea" as const,
					entityId: idea.slug,
					entityRevision: 1,
				},
				{
					entityType: "design" as const,
					entityId: idea.design.id,
					entityRevision: idea.design.revision,
				},
			],
			governingArtifactRefs: idea.design.artifactRefs ?? [],
			materialChangeClass,
			createdFromTransition: params.action,
			sourceDecisionIds: deriveIdeaGateDecisionIds(idea),
		},
		artifactRefs: createDefaultPlanArtifactRefs(
			idea.slug,
			idea.plan?.id ?? `plan_${idea.slug}`,
			params.action === "plan_refresh" ? (idea.plan?.revision ?? 0) + 1 : 1,
		),
	};
	const briefInvalidation =
		params.action === "plan_refresh"
			? invalidateCurrentExecutionBriefState({
					idea,
					reasonTransition: "plan_refresh",
					currentSliceId: syncedPlan.currentSliceId,
					currentSliceTitle: syncedPlan.currentSlice,
					staleSummaryTitles: [
						idea.plan?.currentSlice ?? "",
						syncedPlan.currentSlice,
					],
				})
			: undefined;
	const updatedState = updateIdea(context.state, ideaSlug, (existingIdea) => ({
		...existingIdea,
		plan: syncedPlan,
		tasks: mergedTasks,
		taskSet: updateTaskSetForTasks({
			idea: existingIdea,
			tasks: mergedTasks,
			createdFromTransition: params.action,
		}),
		...(briefInvalidation ?? {}),
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
		mode: result.mode,
		taskTitle: result.taskTitle,
		plan: syncedPlan,
		tasks: mergedTasks,
		markdown: result.markdown,
		controlPlane: buildControlPlaneSummary(updatedState, ideaSlug),
		note:
			params.action === "plan_create"
				? "plan_create materializes the first canonical plan for an accepted idea."
				: "plan_refresh regenerates the accepted plan while preserving existing task state where possible.",
	};
}

export async function handlePlanSnapshot(
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
		note: "plan_snapshot returns the current persisted planner state for this idea.",
	};
}
