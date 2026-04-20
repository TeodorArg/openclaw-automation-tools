import {
	type PlannerResearch,
	requireIdeaSlug,
	updateIdea,
} from "../state/planner-state.js";
import type { FlowContext, PlannerToolParams } from "./flow-helpers.js";
import {
	buildControlPlaneSummary,
	requirePersistedIdea,
	requireResearch,
} from "./flow-helpers.js";
import { evaluateIdeaGate, type IdeaGateInput } from "./idea-gate.js";
import {
	requireNonEmptyText,
	requireNonEmptyTextArray,
} from "./request-validation.js";

export function buildResearchFromParams(
	params: PlannerToolParams,
): PlannerResearch {
	return {
		summary: requireNonEmptyText(
			params.researchSummary ?? "",
			"researchSummary",
		),
		valueAssessment: params.valueAssessment ?? "medium",
		riskAssessment: params.riskAssessment ?? "caution",
		existingCoverage: params.existingCoverage ?? "partial",
		fitAssessment: requireNonEmptyText(
			params.fitAssessment ?? "",
			"fitAssessment",
		),
		sourcesChecked: requireNonEmptyTextArray(
			params.sourcesChecked,
			"sourcesChecked",
		),
		similarSurfaces: params.similarSurfaces?.map((entry) =>
			requireNonEmptyText(entry, "similarSurfaces"),
		),
		whyNow: params.whyNow?.trim() || undefined,
		openQuestions: params.openQuestions?.map((entry) =>
			requireNonEmptyText(entry, "openQuestions"),
		),
	};
}

export async function handleResearchAttach(
	context: FlowContext,
	params: PlannerToolParams,
	ideaName: string,
) {
	const ideaSlug = requireIdeaSlug(ideaName);
	requirePersistedIdea(
		context.state.ideas.find((entry) => entry.slug === ideaSlug),
		ideaSlug,
	);
	const research = buildResearchFromParams(params);
	const updatedState = updateIdea(context.state, ideaSlug, (existingIdea) => ({
		...existingIdea,
		research,
		status:
			existingIdea.status === "draft" ? "needs_research" : existingIdea.status,
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
		research,
		controlPlane: buildControlPlaneSummary(updatedState, ideaSlug),
		note: "research_attach persists typed evidence for the idea before the explicit idea gate runs.",
	};
}

export async function handleIdeaGate(
	context: FlowContext,
	params: PlannerToolParams,
	ideaName: string,
) {
	const ideaSlug = requireIdeaSlug(ideaName);
	const idea = requirePersistedIdea(
		context.state.ideas.find((entry) => entry.slug === ideaSlug),
		ideaSlug,
	);
	const research = requireResearch(idea);
	const result = evaluateIdeaGate({
		ideaName: idea.name,
		problem: idea.problem,
		requestedOutcome: idea.requestedOutcome,
		research,
	} satisfies IdeaGateInput);
	const updatedState = updateIdea(context.state, ideaSlug, (existingIdea) => ({
		...existingIdea,
		status: result.decision,
		ideaGate: {
			...result,
			decidedAt: new Date().toISOString(),
		},
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
		...result,
		controlPlane: buildControlPlaneSummary(updatedState, ideaSlug),
		note: "idea_gate is the explicit accept/defer/reject/needs-research checkpoint after typed research exists.",
	};
}
