import type {
	AggregateStatus,
	AggregateVerdict,
	RequestRuntimeRecord,
	WorkflowPhase,
} from "./workflow-state.js";

export function deriveRequestPhase(input: {
	status: string;
	hasResearch: boolean;
	hasPlan: boolean;
	hasTasks: boolean;
	hasCloseNote: boolean;
}): WorkflowPhase {
	if (input.hasCloseNote || input.status === "closed") {
		return "done";
	}

	if (input.hasPlan) {
		return "planning";
	}

	if (input.hasResearch || input.status === "accepted") {
		return "design";
	}

	if (input.status === "needs_research") {
		return "research";
	}

	return "intake";
}

export function deriveAggregateStatus(input: {
	status: string;
	hasCloseNote: boolean;
}): AggregateStatus {
	if (input.hasCloseNote || input.status === "closed") {
		return "completed";
	}

	if (input.status === "rejected" || input.status === "deferred") {
		return "blocked";
	}

	return "active";
}

export function deriveAggregateVerdict(input: {
	status: string;
	hasPlan: boolean;
	hasCloseNote: boolean;
}): AggregateVerdict {
	if (input.hasCloseNote || input.status === "closed") {
		return "done";
	}

	if (input.status === "rejected") {
		return "not_done";
	}

	if (input.hasPlan && input.status === "accepted") {
		return "ready_for_review";
	}

	return "in_progress";
}

export function createRequestRuntimeRecord(input: {
	requestId: string;
	title: string;
	currentResearchId?: string;
	currentPlanId?: string;
	currentTaskSetId?: string;
	currentBriefBySlice?: Record<string, string>;
	status: string;
	hasResearch: boolean;
	hasPlan: boolean;
	hasTasks: boolean;
	hasCloseNote: boolean;
	updatedAt: string;
}): RequestRuntimeRecord {
	return {
		requestId: input.requestId,
		title: input.title,
		currentPhase: deriveRequestPhase(input),
		aggregateStatus: deriveAggregateStatus(input),
		aggregateVerdict: deriveAggregateVerdict(input),
		currentResearchId: input.currentResearchId,
		currentPlanId: input.currentPlanId,
		currentTaskSetId: input.currentTaskSetId,
		currentBriefBySlice: input.currentBriefBySlice ?? {},
		activeBlockers: [],
		updatedAt: input.updatedAt,
	};
}
