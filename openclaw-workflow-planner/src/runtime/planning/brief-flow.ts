import {
	createDefaultExecutionBriefArtifactRefs,
	deriveIdeaGateDecisionIds,
	type PlannerEntityRef,
	type PlannerExecutionBrief,
	requireIdeaSlug,
	updateIdea,
} from "../state/planner-state.js";
import type { FlowContext, PlannerToolParams } from "./flow-helpers.js";
import {
	buildControlPlaneSummary,
	requireAcceptedIdea,
	requirePersistedIdea,
} from "./flow-helpers.js";
import { buildImplementationBriefFromIdea } from "./implementation-brief.js";

function createEntityRef(
	entityType: PlannerEntityRef["entityType"],
	entityId: string,
	entityRevision: number,
): PlannerEntityRef {
	return {
		entityType,
		entityId,
		entityRevision,
	};
}

export async function handleImplementationBrief(
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
	const brief = buildImplementationBriefFromIdea(idea);
	const persistedState = updateIdea(context.state, ideaSlug, (existingIdea) => {
		const plan = existingIdea.plan;
		const design = existingIdea.design;
		const taskSet = existingIdea.taskSet;
		if (!plan || !design || !taskSet) {
			return existingIdea;
		}

		const nextRevision =
			(existingIdea.executionBriefs ?? []).filter(
				(entry) => entry.sliceId === brief.currentSliceId,
			).length + 1;
		const nextBrief: PlannerExecutionBrief = {
			id: `brief_${existingIdea.slug}_${brief.currentSliceId}_r${nextRevision}`,
			sliceId: brief.currentSliceId,
			revision: nextRevision,
			status: "fresh",
			summary: brief.summary,
			scope: brief.scope,
			avoid: brief.avoid,
			doneWhen: brief.doneWhen,
			taskRefs: brief.taskRefs,
			remainingOpenTaskCount: brief.remainingOpenTaskCount,
			remainingOpenTaskGuidance: brief.remainingOpenTaskGuidance,
			sourceDesignRef: createEntityRef("design", design.id, design.revision),
			sourcePlanRef: createEntityRef("plan", plan.id, plan.revision),
			sourceTaskSetRef: createEntityRef(
				"task_set",
				taskSet.id,
				taskSet.revision,
			),
			provenance: {
				requestId: `req_${existingIdea.slug}`,
				governingEntityRefs: [
					createEntityRef("design", design.id, design.revision),
					createEntityRef("plan", plan.id, plan.revision),
					createEntityRef("task_set", taskSet.id, taskSet.revision),
				],
				governingArtifactRefs: [
					...(design.artifactRefs ?? []),
					...(plan.artifactRefs ?? []),
					...(taskSet.artifactRefs ?? []),
				],
				materialChangeClass: "create",
				createdFromTransition: "implementation_brief",
				sourceDecisionIds: deriveIdeaGateDecisionIds(existingIdea),
			},
			artifactRefs: createDefaultExecutionBriefArtifactRefs(
				existingIdea.slug,
				brief.currentSliceId,
				`brief_${existingIdea.slug}_${brief.currentSliceId}_r${nextRevision}`,
				nextRevision,
			),
		};

		return {
			...existingIdea,
			executionBriefs: [
				...(existingIdea.executionBriefs ?? []).map((entry) =>
					entry.sliceId === brief.currentSliceId && entry.status === "fresh"
						? { ...entry, status: "superseded" as const }
						: entry,
				),
				nextBrief,
			],
			currentBriefBySlice: {
				...(existingIdea.currentBriefBySlice ?? {}),
				[brief.currentSlice]: brief.summary,
			},
			currentPointers: {
				...(existingIdea.currentPointers ?? {}),
				currentExecutionBriefBySliceId: {
					...(existingIdea.currentPointers?.currentExecutionBriefBySliceId ??
						{}),
					[brief.currentSliceId]: {
						pointerType: "current_execution_brief",
						targetEntityRef: createEntityRef(
							"execution_brief",
							nextBrief.id,
							nextBrief.revision,
						),
						targetArtifactRef: nextBrief.artifactRefs?.[0],
						resolutionStatus: "resolved",
						resolvedAt: new Date().toISOString(),
					},
				},
			},
		};
	});
	if (persistedState !== context.state) {
		await context.save(persistedState, context.pluginConfig);
	}

	return {
		ok: true,
		action: params.action,
		commandName: params.commandName,
		command: params.command,
		ideaName,
		plannerFilePath: context.filePath,
		briefId: persistedState.ideas
			.find((entry) => entry.slug === ideaSlug)
			?.executionBriefs?.find(
				(entry) =>
					entry.sliceId === brief.currentSliceId && entry.status === "fresh",
			)?.id,
		...brief,
		controlPlane: buildControlPlaneSummary(persistedState, ideaSlug),
		note: "implementation_brief derives a bounded handoff from the accepted plan and its open tasks.",
	};
}
