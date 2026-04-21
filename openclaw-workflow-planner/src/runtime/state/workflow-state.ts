export type WorkflowPhase =
	| "intake"
	| "research"
	| "design"
	| "planning"
	| "execution"
	| "review"
	| "checkpoint"
	| "completion"
	| "done";

export type AggregateStatus = "active" | "blocked" | "completed" | "cancelled";
export type AggregateVerdict =
	| "in_progress"
	| "ready_for_review"
	| "ready_for_completion"
	| "done"
	| "done_with_followups"
	| "not_done"
	| "cancelled";

export type MigrationState =
	| "canonical"
	| "legacy_hydrated"
	| "migration_required";

export type ValidityStatus = "current" | "stale" | "invalid";
export type VersionStatus = "current" | "superseded" | "invalidated";
export type ArtifactStatus =
	| "current"
	| "superseded"
	| "invalidated"
	| "missing"
	| "draft";

export type WorkflowEntityType =
	| "Request"
	| "PlannerResearch"
	| "PlannerDesign"
	| "PlannerPlan"
	| "TaskSet"
	| "ExecutionBrief";

export type RequestRuntimeRecord = {
	requestId: string;
	title: string;
	currentPhase: WorkflowPhase;
	aggregateStatus: AggregateStatus;
	aggregateVerdict: AggregateVerdict;
	migrationState: MigrationState;
	currentResearchId?: string;
	currentDesignId?: string;
	currentPlanId?: string;
	currentTaskSetId?: string;
	currentBriefBySlice: Record<string, string>;
	activeBlockers: string[];
	updatedAt: string;
};

export type EntityVersionRecord = {
	entityId: string;
	entityType: WorkflowEntityType;
	entityVersion: number;
	versionStatus: VersionStatus;
	validityStatus: ValidityStatus;
	createdAt: string;
	updatedAt: string;
	supersedesEntityVersion?: number;
	supersededByEntityVersion?: number;
	governingRequestId: string;
	artifactRefIds: string[];
	summary: string;
};

export type EntityRegistry = {
	records: Record<string, EntityVersionRecord>;
};

export type ArtifactRecord = {
	artifactId: string;
	artifactType:
		| "spec"
		| "research"
		| "design"
		| "plan"
		| "tasks"
		| "execution_brief";
	artifactVersion: number;
	status: ArtifactStatus;
	path: string;
	governingEntityType: WorkflowEntityType;
	governingEntityId: string;
	derivedFromEntityVersion: number;
	materializationTimestamp: string;
	isCurrent: boolean;
	summary: string;
};

export type ArtifactRegistry = {
	records: Record<string, ArtifactRecord>;
};

export type CurrentPointerRecord = {
	requestId: string;
	currentResearchId?: string;
	currentDesignId?: string;
	currentPlanId?: string;
	currentTaskSetId?: string;
	currentBriefBySlice: Record<string, string>;
	lastResolvedAt: string;
	unresolvedReasons: string[];
};

export type CurrentPointerRegistry = {
	byRequestId: Record<string, CurrentPointerRecord>;
};

export type WorkflowControlPlane = {
	requestRuntime: Record<string, RequestRuntimeRecord>;
	entityRegistry: EntityRegistry;
	artifactRegistry: ArtifactRegistry;
	currentPointers: CurrentPointerRegistry;
};
