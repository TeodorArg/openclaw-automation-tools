import type {
	EntityRegistry,
	EntityVersionRecord,
	ValidityStatus,
	VersionStatus,
	WorkflowEntityType,
} from "./workflow-state.js";

export function createEmptyEntityRegistry(): EntityRegistry {
	return { records: {} };
}

export function createEntityVersionRecord(input: {
	entityId: string;
	entityType: WorkflowEntityType;
	entityVersion?: number;
	versionStatus?: VersionStatus;
	validityStatus?: ValidityStatus;
	createdAt: string;
	updatedAt: string;
	governingRequestId: string;
	artifactRefIds?: string[];
	summary: string;
	supersedesEntityVersion?: number;
	supersededByEntityVersion?: number;
}): EntityVersionRecord {
	return {
		entityId: input.entityId,
		entityType: input.entityType,
		entityVersion: input.entityVersion ?? 1,
		versionStatus: input.versionStatus ?? "current",
		validityStatus: input.validityStatus ?? "current",
		createdAt: input.createdAt,
		updatedAt: input.updatedAt,
		governingRequestId: input.governingRequestId,
		artifactRefIds: input.artifactRefIds ?? [],
		summary: input.summary,
		supersedesEntityVersion: input.supersedesEntityVersion,
		supersededByEntityVersion: input.supersededByEntityVersion,
	};
}

export function upsertEntityRecord(
	registry: EntityRegistry,
	record: EntityVersionRecord,
): EntityRegistry {
	return {
		records: {
			...registry.records,
			[record.entityId]: record,
		},
	};
}
