import type { ArtifactRecord, ArtifactRegistry } from "./workflow-state.js";

export function createEmptyArtifactRegistry(): ArtifactRegistry {
	return { records: {} };
}

export function createArtifactRecord(input: ArtifactRecord): ArtifactRecord {
	return input;
}

export function upsertArtifactRecord(
	registry: ArtifactRegistry,
	record: ArtifactRecord,
): ArtifactRegistry {
	return {
		records: {
			...registry.records,
			[record.artifactId]: record,
		},
	};
}
