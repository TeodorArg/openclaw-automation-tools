import type {
	AggregateStatus,
	AggregateVerdict,
	MigrationState,
	RequestRuntimeRecord,
	WorkflowPhase,
} from "./workflow-state.js";

export function deriveRequestPhase(input: {
	status: string;
	hasResearch: boolean;
	hasDesign: boolean;
	hasPlan: boolean;
	hasTasks: boolean;
	hasCurrentSliceBrief: boolean;
	hasCloseNote: boolean;
}): WorkflowPhase {
	if (input.hasCloseNote || input.status === "closed") {
		return "done";
	}

	if (input.hasPlan && input.hasCurrentSliceBrief) {
		return "execution";
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
	hasMigrationBlockers: boolean;
}): AggregateStatus {
	if (input.hasCloseNote || input.status === "closed") {
		return "completed";
	}

	if (input.hasMigrationBlockers) {
		return "blocked";
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
	migrationState: MigrationState;
	currentResearchId?: string;
	currentDesignId?: string;
	currentPlanId?: string;
	currentTaskSetId?: string;
	currentBriefBySlice?: Record<string, string>;
	status: string;
	hasResearch: boolean;
	hasDesign: boolean;
	hasPlan: boolean;
	hasTasks: boolean;
	hasCurrentSliceBrief: boolean;
	hasCloseNote: boolean;
	activeBlockers?: string[];
	updatedAt: string;
}): RequestRuntimeRecord {
	return {
		requestId: input.requestId,
		title: input.title,
		currentPhase: deriveRequestPhase(input),
		aggregateStatus: deriveAggregateStatus({
			status: input.status,
			hasCloseNote: input.hasCloseNote,
			hasMigrationBlockers: (input.activeBlockers?.length ?? 0) > 0,
		}),
		aggregateVerdict: deriveAggregateVerdict(input),
		migrationState: input.migrationState,
		...(input.currentResearchId
			? { currentResearchId: input.currentResearchId }
			: {}),
		...(input.currentDesignId
			? { currentDesignId: input.currentDesignId }
			: {}),
		...(input.currentPlanId ? { currentPlanId: input.currentPlanId } : {}),
		...(input.currentTaskSetId
			? { currentTaskSetId: input.currentTaskSetId }
			: {}),
		currentBriefBySlice: input.currentBriefBySlice ?? {},
		activeBlockers: input.activeBlockers ?? [],
		updatedAt: input.updatedAt,
	};
}
