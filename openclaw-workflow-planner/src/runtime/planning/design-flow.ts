import {
	createDefaultDesignArtifactRefs,
	deriveIdeaGateDecisionIds,
	type PlannerDesign,
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

function buildDesignFromParams(
	ideaSlug: string,
	requestId: string,
	params: PlannerToolParams,
	existingDesign?: PlannerDesign,
	sourceDecisionIds: string[] = [],
): PlannerDesign {
	const targetSurface = requireNonEmptyText(
		params.targetSurface ?? "",
		"targetSurface",
	);
	const constraints = requireNonEmptyTextArray(
		params.constraints,
		"constraints",
	);
	const selectedApproach = requireNonEmptyText(
		params.selectedApproach ?? "",
		"selectedApproach",
	);
	const alternatives = requireNonEmptyTextArray(
		params.alternatives,
		"alternatives",
	);
	const verificationStrategy = requireNonEmptyText(
		params.verificationStrategy ?? "",
		"verificationStrategy",
	);

	return {
		id: existingDesign?.id ?? `design_${ideaSlug}`,
		ideaId: ideaSlug,
		revision: (existingDesign?.revision ?? 0) + 1,
		status: "ready",
		summary: `Design prepared for ${targetSurface}.`,
		targetSurface,
		constraints,
		selectedApproach,
		alternatives,
		verificationStrategy,
		provenance: {
			requestId,
			governingEntityRefs: [
				{
					entityType: "idea",
					entityId: ideaSlug,
					entityRevision: 1,
				},
				{
					entityType: "research",
					entityId: `research_${ideaSlug}`,
					entityRevision: 1,
				},
			],
			governingArtifactRefs: [],
			materialChangeClass: existingDesign ? "refresh" : "create",
			createdFromTransition: "design_prepare",
			sourceDecisionIds,
		},
		artifactRefs: createDefaultDesignArtifactRefs(
			ideaSlug,
			existingDesign?.id ?? `design_${ideaSlug}`,
			(existingDesign?.revision ?? 0) + 1,
		),
	};
}

function designChanged(
	nextDesign: PlannerDesign,
	existingDesign?: PlannerDesign,
) {
	if (!existingDesign) {
		return true;
	}

	return (
		nextDesign.targetSurface !== existingDesign.targetSurface ||
		nextDesign.selectedApproach !== existingDesign.selectedApproach ||
		nextDesign.verificationStrategy !== existingDesign.verificationStrategy ||
		nextDesign.summary !== existingDesign.summary ||
		nextDesign.constraints.join("\n") !==
			existingDesign.constraints.join("\n") ||
		nextDesign.alternatives.join("\n") !==
			existingDesign.alternatives.join("\n")
	);
}

export async function handleDesignPrepare(
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
			`Idea ${idea.slug} must be accepted before design_prepare can run.`,
		);
	}

	requireResearch(idea);
	const design = buildDesignFromParams(
		ideaSlug,
		`req_${ideaSlug}`,
		params,
		idea.design,
		deriveIdeaGateDecisionIds(idea),
	);
	const shouldResetDownstream = designChanged(design, idea.design);
	const updatedState = updateIdea(context.state, ideaSlug, (existingIdea) => ({
		...existingIdea,
		design,
		plan: shouldResetDownstream ? undefined : existingIdea.plan,
		tasks: shouldResetDownstream ? [] : existingIdea.tasks,
		taskSet: shouldResetDownstream ? undefined : existingIdea.taskSet,
		executionBriefs: shouldResetDownstream
			? undefined
			: existingIdea.executionBriefs,
		currentBriefBySlice: shouldResetDownstream
			? undefined
			: existingIdea.currentBriefBySlice,
		currentPointers: shouldResetDownstream
			? undefined
			: existingIdea.currentPointers,
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
		design,
		controlPlane: buildControlPlaneSummary(updatedState, ideaSlug),
		note: shouldResetDownstream
			? "design_prepare persisted the current design and reset downstream plan/task/brief state because the design changed materially."
			: "design_prepare persisted the current design state for planning.",
	};
}

export async function handleDesignGet(
	context: FlowContext,
	params: PlannerToolParams,
	ideaName: string,
) {
	const ideaSlug = requireIdeaSlug(ideaName);
	const idea = requirePersistedIdea(
		context.state.ideas.find((entry) => entry.slug === ideaSlug),
		ideaSlug,
	);

	if (!idea.design) {
		throw new Error(`Idea ${idea.slug} does not have a prepared design yet.`);
	}

	return {
		ok: true,
		action: params.action,
		commandName: params.commandName,
		command: params.command,
		ideaName,
		ideaSlug,
		plannerFilePath: context.filePath,
		design: idea.design,
		controlPlane: buildControlPlaneSummary(context.state, ideaSlug),
		note: "design_get returns the current persisted design record.",
	};
}
