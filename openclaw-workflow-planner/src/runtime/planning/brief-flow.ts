import {
	rebuildControlPlaneFromIdeas,
	requireIdeaSlug,
} from "../state/planner-state.js";
import type { FlowContext, PlannerToolParams } from "./flow-helpers.js";
import {
	buildControlPlaneSummary,
	requireAcceptedIdea,
	requirePersistedIdea,
} from "./flow-helpers.js";
import { buildImplementationBriefFromIdea } from "./implementation-brief.js";

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
	const currentSlice = brief.currentSlice;
	const now = new Date().toISOString();
	const updatedState = idea.currentBriefBySlice?.[currentSlice]
		? context.state
		: {
				...context.state,
				updatedAt: now,
				ideas: context.state.ideas.map((entry) =>
					entry.slug === ideaSlug
						? {
								...entry,
								updatedAt: now,
								currentBriefBySlice: {
									...(entry.currentBriefBySlice ?? {}),
									[currentSlice]: brief.summary,
								},
							}
						: entry,
				),
			};
	const persistedState =
		updatedState === context.state
			? context.state
			: {
					...updatedState,
					controlPlane: rebuildControlPlaneFromIdeas(updatedState.ideas),
				};
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
		...brief,
		controlPlane: buildControlPlaneSummary(persistedState, ideaSlug),
		note: "implementation_brief derives a bounded handoff from the accepted plan and its open tasks.",
	};
}
