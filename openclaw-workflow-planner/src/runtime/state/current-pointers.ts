import type {
	CurrentPointerRecord,
	CurrentPointerRegistry,
} from "./workflow-state.js";

export function createEmptyCurrentPointerRegistry(): CurrentPointerRegistry {
	return { byRequestId: {} };
}

export function createCurrentPointerRecord(
	input: CurrentPointerRecord,
): CurrentPointerRecord {
	return {
		requestId: input.requestId,
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
		currentBriefBySlice: input.currentBriefBySlice,
		lastResolvedAt: input.lastResolvedAt,
		unresolvedReasons: input.unresolvedReasons,
	};
}

export function upsertCurrentPointerRecord(
	registry: CurrentPointerRegistry,
	record: CurrentPointerRecord,
): CurrentPointerRegistry {
	return {
		byRequestId: {
			...registry.byRequestId,
			[record.requestId]: record,
		},
	};
}
