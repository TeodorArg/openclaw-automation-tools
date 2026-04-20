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
	return input;
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
