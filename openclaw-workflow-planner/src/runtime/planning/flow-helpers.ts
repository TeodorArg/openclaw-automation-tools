import type { savePlannerState } from "../state/planner-file.js";
import type {
	PlannerIdea,
	PlannerResearch,
	PlannerState,
	PlannerTask,
} from "../state/planner-state.js";
import {
	getCurrentExecutionBrief,
	getCurrentExecutionBriefPointer,
} from "../state/planner-state.js";

export type PlannerToolParams = {
	action: string;
	command: string;
	commandName: string;
	skillName: string;
	ideaName?: string;
	problem?: string;
	requestedOutcome?: string;
	notes?: string;
	links?: string[];
	ownerSurface?: string;
	researchSummary?: string;
	valueAssessment?: "low" | "medium" | "high";
	riskAssessment?: "safe" | "caution" | "unsafe";
	existingCoverage?: "none" | "partial" | "strong";
	fitAssessment?: string;
	sourcesChecked?: string[];
	similarSurfaces?: string[];
	whyNow?: string;
	openQuestions?: string[];
	targetSurface?: string;
	constraints?: string[];
	selectedApproach?: string;
	alternatives?: string[];
	verificationStrategy?: string;
	acceptanceTarget?: string;
	currentSlice?: string;
	taskText?: string;
	taskIndex?: number;
	taskId?: string;
	closeNote?: string;
};

export type TaskTargetContext = {
	targetTask: PlannerTask;
	targetTaskId: string;
	targetTaskIndex: number;
	targetSelectorHint: string;
};

export function buildTaskTargetContext(
	task: PlannerTask,
	taskIndex: number,
): TaskTargetContext {
	return {
		targetTask: task,
		targetTaskId: task.id,
		targetTaskIndex: taskIndex,
		targetSelectorHint: `taskId=${task.id} | taskIndex=${taskIndex}`,
	};
}

export type FlowContext = {
	filePath: string;
	state: PlannerState;
	revision: string;
	pluginConfig?: {
		plannerFilePath?: unknown;
	};
	save: typeof savePlannerState;
};

export function requirePersistedIdea(
	idea: PlannerIdea | undefined,
	slug: string,
): PlannerIdea {
	if (idea) {
		return idea;
	}

	throw new Error(`Idea ${slug} was not found in planner state.`);
}

export function requireResearch(idea: PlannerIdea): PlannerResearch {
	if (idea.research) {
		return idea.research;
	}

	throw new Error(`Idea ${idea.slug} does not have attached research yet.`);
}

export function requireAcceptedIdea(idea: PlannerIdea): PlannerIdea {
	if (idea.status === "accepted" && idea.plan) {
		return idea;
	}

	throw new Error(
		`Idea ${idea.slug} must be accepted and have a canonical plan for this action.`,
	);
}

export function requireCurrentSliceBrief(idea: PlannerIdea): PlannerIdea {
	const acceptedIdea = requireAcceptedIdea(idea);
	const plan = acceptedIdea.plan;
	if (!plan) {
		throw new Error(
			`Idea ${acceptedIdea.slug} must be accepted and have a canonical plan for this action.`,
		);
	}
	const currentSlice = plan.currentSlice;
	const currentSliceId = plan.currentSliceId;
	const currentBriefPointer = getCurrentExecutionBriefPointer(acceptedIdea);
	const currentBrief = getCurrentExecutionBrief(acceptedIdea);
	if (
		currentBriefPointer?.resolutionStatus === "resolved" &&
		currentBrief &&
		currentBrief.sliceId === currentSliceId &&
		currentBrief.status === "fresh"
	) {
		return acceptedIdea;
	}

	if (
		currentBriefPointer?.resolutionStatus === "unresolved" &&
		currentBriefPointer.unresolvedReason
	) {
		throw new Error(
			`Idea ${acceptedIdea.slug} has unresolved current execution-brief pointer state for the current slice. ${currentBriefPointer.unresolvedReason}`,
		);
	}

	const matchingNonFreshBrief = acceptedIdea.executionBriefs?.find(
		(entry) => entry.sliceId === currentSliceId,
	);
	if (matchingNonFreshBrief) {
		throw new Error(
			`Idea ${acceptedIdea.slug} has a ${matchingNonFreshBrief.status} implementation brief for the current slice. Regenerate implementation_brief for ${currentSlice} before execution-state task progress can continue.`,
		);
	}

	throw new Error(
		`Idea ${acceptedIdea.slug} requires implementation_brief for the current slice before execution-state task progress can continue. Run implementation_brief for ${currentSlice} first.`,
	);
}

export function buildIdeaSummary(idea: PlannerIdea) {
	return {
		slug: idea.slug,
		name: idea.name,
		status: idea.status,
		createdAt: idea.createdAt,
		updatedAt: idea.updatedAt,
		hasResearch: Boolean(idea.research),
		hasPlan: Boolean(idea.plan),
		taskCounts: {
			total: idea.tasks.length,
			open: idea.tasks.filter((task) => !task.done).length,
			done: idea.tasks.filter((task) => task.done).length,
		},
	};
}

export function buildControlPlaneSummary(
	state: PlannerState,
	ideaSlug?: string,
) {
	const requestId = ideaSlug ? `req_${ideaSlug}` : undefined;
	const requestRuntime = requestId
		? (state.controlPlane.requestRuntime[requestId] ?? null)
		: null;
	const currentPointers = requestId
		? (state.controlPlane.currentPointers.byRequestId[requestId] ?? null)
		: null;
	const entityRecords = Object.values(
		state.controlPlane.entityRegistry.records,
	);
	const artifactRecords = Object.values(
		state.controlPlane.artifactRegistry.records,
	);

	return {
		requestId,
		requestRuntime,
		currentPointers,
		counts: {
			requests: Object.keys(state.controlPlane.requestRuntime).length,
			entities: entityRecords.length,
			artifacts: artifactRecords.length,
		},
		linkedEntities: requestId
			? entityRecords.filter(
					(record) => record.governingRequestId === requestId,
				)
			: [],
		linkedArtifacts: requestId
			? artifactRecords.filter(
					(record) =>
						entityRecords.find(
							(entity) =>
								entity.entityId === record.governingEntityId &&
								entity.governingRequestId === requestId,
						) !== undefined,
				)
			: [],
	};
}
