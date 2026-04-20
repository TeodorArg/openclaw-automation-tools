import type { savePlannerState } from "../state/planner-file.js";
import type {
	PlannerIdea,
	PlannerResearch,
	PlannerState,
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
	acceptanceTarget?: string;
	currentSlice?: string;
	taskText?: string;
	taskIndex?: number;
	taskId?: string;
	closeNote?: string;
};

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
