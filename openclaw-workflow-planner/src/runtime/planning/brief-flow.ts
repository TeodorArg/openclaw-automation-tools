import { requireIdeaSlug } from "../state/planner-state.js";
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

	return {
		ok: true,
		action: params.action,
		commandName: params.commandName,
		command: params.command,
		ideaName,
		plannerFilePath: context.filePath,
		...brief,
		controlPlane: buildControlPlaneSummary(context.state, ideaSlug),
		note: "implementation_brief derives a bounded handoff from the accepted plan and its open tasks.",
	};
}
