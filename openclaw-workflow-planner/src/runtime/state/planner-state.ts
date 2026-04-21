import {
	createArtifactRecord,
	createEmptyArtifactRegistry,
	upsertArtifactRecord,
} from "./artifact-registry.js";
import {
	createCurrentPointerRecord,
	createEmptyCurrentPointerRegistry,
	upsertCurrentPointerRecord,
} from "./current-pointers.js";
import {
	createEmptyEntityRegistry,
	createEntityVersionRecord,
	upsertEntityRecord,
} from "./entity-registry.js";
import { createRequestRuntimeRecord } from "./request-runtime.js";
import type { MigrationState, WorkflowControlPlane } from "./workflow-state.js";

export type PlannerTaskOrigin = "generated" | "manual";

export type PlannerTask = {
	id: string;
	text: string;
	origin: PlannerTaskOrigin;
	done: boolean;
};

export type PlannerPlanBlock = {
	title: string;
	what: string;
	why: string;
	evidence: string[];
	checklist: PlannerTask[];
	doneWhen: string;
};

export type PlannerResearch = {
	summary: string;
	valueAssessment: "low" | "medium" | "high";
	riskAssessment: "safe" | "caution" | "unsafe";
	existingCoverage: "none" | "partial" | "strong";
	fitAssessment: string;
	sourcesChecked: string[];
	similarSurfaces?: string[];
	whyNow?: string;
	openQuestions?: string[];
};

export type PlannerIdeaGateDecision =
	| "accepted"
	| "needs_research"
	| "deferred"
	| "rejected";

export type PlannerIdeaGate = {
	decision: PlannerIdeaGateDecision;
	reasoning: string[];
	nextSuggestedAction:
		| "stop"
		| "research_attach"
		| "design_prepare"
		| "narrow_scope";
	decidedAt: string;
};

export type PlannerEntityRef = {
	entityType:
		| "idea"
		| "research"
		| "design"
		| "plan"
		| "task_set"
		| "execution_brief";
	entityId: string;
	entityRevision: number;
};

export type PlannerArtifactRef = {
	artifactType: "research" | "design" | "plan" | "task_set" | "execution_brief";
	artifactId: string;
	artifactRevision: number;
	path?: string;
};

export type PlannerProvenanceEnvelope = {
	requestId: string;
	governingEntityRefs: PlannerEntityRef[];
	governingArtifactRefs?: PlannerArtifactRef[];
	materialChangeClass:
		| "create"
		| "refresh"
		| "repair"
		| "scope_change"
		| "review_update";
	createdFromTransition: string;
	sourceDecisionIds?: string[];
};

export type PlannerCurrentPointer = {
	pointerType:
		| "current_design"
		| "current_plan"
		| "current_task_set"
		| "current_execution_brief"
		| "current_slice";
	targetEntityRef?: PlannerEntityRef;
	targetArtifactRef?: PlannerArtifactRef;
	resolutionStatus: "resolved" | "unresolved" | "superseded_target";
	unresolvedReason?: string;
	resolvedAt: string;
};

export type PlannerCurrentPointers = {
	currentDesign?: PlannerCurrentPointer;
	currentPlan?: PlannerCurrentPointer;
	currentTaskSet?: PlannerCurrentPointer;
	currentExecutionBriefBySliceId?: Record<string, PlannerCurrentPointer>;
	currentSlice?: PlannerCurrentPointer;
};

export type PlannerTaskSet = {
	id: string;
	revision: number;
	taskIds: string[];
	provenance: PlannerProvenanceEnvelope;
	artifactRefs?: PlannerArtifactRef[];
};

export type PlannerExecutionBriefStatus =
	| "fresh"
	| "stale"
	| "invalid"
	| "superseded"
	| "consumed";

export type PlannerExecutionBrief = {
	id: string;
	sliceId: string;
	revision: number;
	status: PlannerExecutionBriefStatus;
	summary: string;
	scope: string[];
	avoid: string[];
	doneWhen: string;
	taskRefs: string[];
	remainingOpenTaskCount: number;
	remainingOpenTaskGuidance: string;
	sourceDesignRef: PlannerEntityRef;
	sourcePlanRef: PlannerEntityRef;
	sourceTaskSetRef: PlannerEntityRef;
	provenance: PlannerProvenanceEnvelope;
	artifactRefs?: PlannerArtifactRef[];
};

export type PlannerDesign = {
	id: string;
	ideaId: string;
	revision: number;
	status: "ready";
	summary: string;
	targetSurface: string;
	constraints: string[];
	selectedApproach: string;
	alternatives: string[];
	verificationStrategy: string;
	provenance: PlannerProvenanceEnvelope;
	artifactRefs?: PlannerArtifactRef[];
};

export type PlannerPlan = {
	id: string;
	ideaId: string;
	designId: string;
	revision: number;
	goal: string;
	scope: string[];
	outOfScope: string[];
	planBlocks: PlannerPlanBlock[];
	acceptanceTarget: string;
	currentSliceId: string;
	currentSlice: string;
	provenance: PlannerProvenanceEnvelope;
	artifactRefs?: PlannerArtifactRef[];
};

export type PlannerIdeaStatus =
	| "draft"
	| "needs_research"
	| "accepted"
	| "deferred"
	| "rejected"
	| "closed";

export type PlannerIdea = {
	slug: string;
	name: string;
	problem: string;
	requestedOutcome: string;
	createdAt: string;
	updatedAt: string;
	status: PlannerIdeaStatus;
	notes?: string;
	links?: string[];
	ownerSurface?: string;
	research?: PlannerResearch;
	ideaGate?: PlannerIdeaGate;
	design?: PlannerDesign;
	plan?: PlannerPlan;
	tasks: PlannerTask[];
	taskSet?: PlannerTaskSet;
	executionBriefs?: PlannerExecutionBrief[];
	currentPointers?: PlannerCurrentPointers;
	currentBriefBySlice?: Record<string, string>;
	closeNote?: string;
};

export type PlannerState = {
	version: 4;
	updatedAt: string;
	ideas: PlannerIdea[];
	controlPlane: WorkflowControlPlane;
};

type PersistedPlannerState = {
	version: 4;
	updatedAt: string;
	ideas: PlannerIdea[];
};

type MigrationAssessment = {
	migrationState: MigrationState;
	unresolvedReasons: string[];
};

function createEmptyControlPlane(): WorkflowControlPlane {
	return {
		requestRuntime: {},
		entityRegistry: createEmptyEntityRegistry(),
		artifactRegistry: createEmptyArtifactRegistry(),
		currentPointers: createEmptyCurrentPointerRegistry(),
	};
}

function createEntityRef(
	entityType: PlannerEntityRef["entityType"],
	entityId: string,
	entityRevision = 1,
): PlannerEntityRef {
	return {
		entityType,
		entityId,
		entityRevision,
	};
}

function createArtifactRef(
	artifactType: PlannerArtifactRef["artifactType"],
	artifactId: string,
	artifactRevision: number,
	path: string,
): PlannerArtifactRef {
	return {
		artifactType,
		artifactId,
		artifactRevision,
		path,
	};
}

export function createDefaultDesignArtifactRefs(
	ideaSlug: string,
	designId: string,
	revision: number,
) {
	return [
		createArtifactRef(
			"design",
			`art_${designId}`,
			revision,
			`requests/${ideaSlug}/canon/design/${designId}.md`,
		),
	];
}

export function createDefaultPlanArtifactRefs(
	ideaSlug: string,
	planId: string,
	revision: number,
) {
	return [
		createArtifactRef(
			"plan",
			`art_${planId}`,
			revision,
			`requests/${ideaSlug}/canon/plans/${planId}.md`,
		),
	];
}

export function createDefaultTaskSetArtifactRefs(
	ideaSlug: string,
	taskSetId: string,
	revision: number,
) {
	return [
		createArtifactRef(
			"task_set",
			`art_${taskSetId}`,
			revision,
			`requests/${ideaSlug}/canon/task-sets/${taskSetId}.json`,
		),
	];
}

export function createDefaultExecutionBriefArtifactRefs(
	ideaSlug: string,
	sliceId: string,
	briefId: string,
	revision: number,
) {
	return [
		createArtifactRef(
			"execution_brief",
			`art_${briefId}`,
			revision,
			`requests/${ideaSlug}/canon/slices/${sliceId}/${briefId}.md`,
		),
	];
}

export function deriveIdeaGateDecisionIds(
	idea: Pick<PlannerIdea, "ideaGate" | "slug">,
) {
	if (!idea.ideaGate) {
		return [];
	}

	return [
		`idea_gate:${idea.slug}:${idea.ideaGate.decision}:${idea.ideaGate.decidedAt}`,
	];
}

function createResolvedPointer(
	pointerType: PlannerCurrentPointer["pointerType"],
	resolvedAt: string,
	targetEntityRef?: PlannerEntityRef,
	targetArtifactRef?: PlannerArtifactRef,
): PlannerCurrentPointer {
	return {
		pointerType,
		...(targetEntityRef ? { targetEntityRef } : {}),
		...(targetArtifactRef ? { targetArtifactRef } : {}),
		resolutionStatus: "resolved",
		resolvedAt,
	};
}

function createUnresolvedPointer(
	pointerType: PlannerCurrentPointer["pointerType"],
	resolvedAt: string,
	unresolvedReason: string,
): PlannerCurrentPointer {
	return {
		pointerType,
		resolutionStatus: "unresolved",
		unresolvedReason,
		resolvedAt,
	};
}

function createLegacyProvenance(input: {
	requestId: string;
	createdFromTransition: string;
	materialChangeClass: PlannerProvenanceEnvelope["materialChangeClass"];
	governingEntityRefs?: PlannerEntityRef[];
	governingArtifactRefs?: PlannerArtifactRef[];
}): PlannerProvenanceEnvelope {
	return {
		requestId: input.requestId,
		governingEntityRefs: input.governingEntityRefs ?? [],
		governingArtifactRefs: input.governingArtifactRefs ?? [],
		materialChangeClass: input.materialChangeClass,
		createdFromTransition: input.createdFromTransition,
		sourceDecisionIds: [],
	};
}

function normalizeProvenanceEnvelope(
	provenance: PlannerProvenanceEnvelope,
): PlannerProvenanceEnvelope {
	return {
		...provenance,
		governingArtifactRefs: provenance.governingArtifactRefs ?? [],
		sourceDecisionIds: provenance.sourceDecisionIds ?? [],
	};
}

function assessMigrationState(input: {
	rawIdea: PlannerIdea;
	sourceVersion?: number;
}): MigrationAssessment {
	const { rawIdea, sourceVersion } = input;
	const legacySource = typeof sourceVersion !== "number" || sourceVersion < 4;
	const unresolvedReasons: string[] = [];
	const legacyBriefSummaries = Object.keys(rawIdea.currentBriefBySlice ?? {});
	const hasLegacySignals =
		legacySource &&
		(Boolean(rawIdea.plan && !rawIdea.design) ||
			Boolean(rawIdea.tasks.length > 0 && !rawIdea.taskSet) ||
			Boolean(
				legacyBriefSummaries.length > 0 && !rawIdea.executionBriefs?.length,
			) ||
			Boolean(!rawIdea.currentPointers));

	if (
		legacySource &&
		legacyBriefSummaries.length > 0 &&
		!rawIdea.executionBriefs?.length
	) {
		if (!rawIdea.plan?.currentSlice) {
			unresolvedReasons.push(
				"Legacy brief summaries could not be resolved because the persisted plan is missing currentSlice.",
			);
		} else if (!legacyBriefSummaries.includes(rawIdea.plan.currentSlice)) {
			unresolvedReasons.push(
				"Legacy brief summaries do not match the persisted currentSlice and require operator review before execution gating can be trusted.",
			);
		} else if (legacyBriefSummaries.length > 1) {
			unresolvedReasons.push(
				"Multiple legacy brief summaries were found without typed executionBriefs; save canonical state before treating one as current.",
			);
		}
	}

	if (unresolvedReasons.length > 0) {
		return {
			migrationState: "migration_required",
			unresolvedReasons,
		};
	}

	if (hasLegacySignals) {
		return {
			migrationState: "legacy_hydrated",
			unresolvedReasons: [],
		};
	}

	return {
		migrationState: "canonical",
		unresolvedReasons: [],
	};
}

function ensurePlanShape(idea: PlannerIdea): PlannerPlan | undefined {
	if (!idea.plan) {
		return undefined;
	}

	return {
		...idea.plan,
		id: idea.plan.id ?? `plan_${idea.slug}`,
		ideaId: idea.plan.ideaId ?? idea.slug,
		designId: idea.plan.designId ?? idea.design?.id ?? `design_${idea.slug}`,
		revision: idea.plan.revision ?? 1,
		currentSliceId:
			idea.plan.currentSliceId ??
			`slice_${slugifyIdeaName(idea.plan.currentSlice) || "current"}`,
		provenance: idea.plan.provenance
			? normalizeProvenanceEnvelope(idea.plan.provenance)
			: createLegacyProvenance({
					requestId: `req_${idea.slug}`,
					createdFromTransition: "legacy_hydration",
					materialChangeClass: "repair",
					governingEntityRefs: [
						createEntityRef("idea", idea.slug, 1),
						...(idea.design
							? [
									createEntityRef(
										"design",
										idea.design.id,
										idea.design.revision,
									),
								]
							: []),
					],
				}),
		artifactRefs:
			idea.plan.artifactRefs ??
			createDefaultPlanArtifactRefs(
				idea.slug,
				idea.plan.id ?? `plan_${idea.slug}`,
				idea.plan.revision ?? 1,
			),
	};
}

function ensureDesignShape(idea: PlannerIdea): PlannerDesign | undefined {
	if (!idea.design) {
		return undefined;
	}

	return {
		...idea.design,
		id: idea.design.id ?? `design_${idea.slug}`,
		ideaId: idea.design.ideaId ?? idea.slug,
		revision: idea.design.revision ?? 1,
		provenance: idea.design.provenance
			? normalizeProvenanceEnvelope(idea.design.provenance)
			: createLegacyProvenance({
					requestId: `req_${idea.slug}`,
					createdFromTransition: "legacy_hydration",
					materialChangeClass: "repair",
					governingEntityRefs: [
						createEntityRef("idea", idea.slug, 1),
						...(idea.research
							? [createEntityRef("research", `research_${idea.slug}`, 1)]
							: []),
					],
				}),
		artifactRefs:
			idea.design.artifactRefs ??
			createDefaultDesignArtifactRefs(
				idea.slug,
				idea.design.id ?? `design_${idea.slug}`,
				idea.design.revision ?? 1,
			),
	};
}

function ensureTaskSetShape(
	idea: PlannerIdea,
	plan: PlannerPlan | undefined,
): PlannerTaskSet | undefined {
	if (idea.taskSet) {
		return {
			...idea.taskSet,
			revision: idea.taskSet.revision ?? 1,
			taskIds: idea.taskSet.taskIds ?? idea.tasks.map((task) => task.id),
			artifactRefs:
				idea.taskSet.artifactRefs ??
				createDefaultTaskSetArtifactRefs(
					idea.slug,
					idea.taskSet.id ?? `tasks_${idea.slug}`,
					idea.taskSet.revision ?? 1,
				),
			provenance: idea.taskSet.provenance
				? normalizeProvenanceEnvelope(idea.taskSet.provenance)
				: createLegacyProvenance({
						requestId: `req_${idea.slug}`,
						createdFromTransition: "legacy_hydration",
						materialChangeClass: "repair",
						governingEntityRefs: [
							createEntityRef("idea", idea.slug, 1),
							...(plan
								? [createEntityRef("plan", plan.id, plan.revision)]
								: []),
						],
					}),
		};
	}

	if (idea.tasks.length === 0) {
		return undefined;
	}

	return {
		id: `tasks_${idea.slug}`,
		revision: 1,
		taskIds: idea.tasks.map((task) => task.id),
		artifactRefs: createDefaultTaskSetArtifactRefs(
			idea.slug,
			`tasks_${idea.slug}`,
			1,
		),
		provenance: createLegacyProvenance({
			requestId: `req_${idea.slug}`,
			createdFromTransition: "legacy_hydration",
			materialChangeClass: "repair",
			governingEntityRefs: [
				createEntityRef("idea", idea.slug, 1),
				...(plan ? [createEntityRef("plan", plan.id, plan.revision)] : []),
			],
		}),
	};
}

function createLegacyBriefPointers(
	idea: PlannerIdea,
	plan: PlannerPlan | undefined,
): Record<string, PlannerCurrentPointer> | undefined {
	const executionBriefs = idea.executionBriefs ?? [];
	const currentBriefBySlice = idea.currentBriefBySlice ?? {};
	if (executionBriefs.length > 0) {
		const entries = executionBriefs
			.filter((brief) => brief.status === "fresh")
			.map((brief) => [brief.sliceId, brief.id] as const);
		if (entries.length === 0) {
			return undefined;
		}

		return Object.fromEntries(
			entries.map(([sliceId, briefId]) => {
				const brief = executionBriefs.find((entry) => entry.id === briefId);
				return [
					sliceId,
					createResolvedPointer(
						"current_execution_brief",
						idea.updatedAt,
						createEntityRef("execution_brief", briefId, brief?.revision ?? 1),
						brief?.artifactRefs?.[0] ??
							createDefaultExecutionBriefArtifactRefs(
								idea.slug,
								sliceId,
								briefId,
								brief?.revision ?? 1,
							)[0],
					),
				];
			}),
		);
	}

	const legacyEntries = Object.entries(currentBriefBySlice);
	if (legacyEntries.length === 0 || !plan) {
		return undefined;
	}

	const currentSliceSummary = currentBriefBySlice[plan.currentSlice];
	if (currentSliceSummary && legacyEntries.length === 1) {
		return {
			[plan.currentSliceId]: createResolvedPointer(
				"current_execution_brief",
				idea.updatedAt,
				createEntityRef(
					"execution_brief",
					`brief_${idea.slug}_${plan.currentSliceId}`,
					1,
				),
				createDefaultExecutionBriefArtifactRefs(
					idea.slug,
					plan.currentSliceId,
					`brief_${idea.slug}_${plan.currentSliceId}`,
					1,
				)[0],
			),
		};
	}

	const unresolvedReason = !currentSliceSummary
		? "Legacy brief summaries do not match the persisted currentSlice and require operator review before execution gating can be trusted."
		: "Multiple legacy brief summaries were found without typed executionBriefs; save canonical state before treating one as current.";

	return {
		[plan.currentSliceId]: createUnresolvedPointer(
			"current_execution_brief",
			idea.updatedAt,
			unresolvedReason,
		),
	};
}

function ensureExecutionBriefsShape(
	idea: PlannerIdea,
	design: PlannerDesign | undefined,
	plan: PlannerPlan | undefined,
	taskSet: PlannerTaskSet | undefined,
): PlannerExecutionBrief[] | undefined {
	if (idea.executionBriefs && idea.executionBriefs.length > 0) {
		return idea.executionBriefs.map((brief) => ({
			...brief,
			revision: brief.revision ?? 1,
			status: brief.status ?? "fresh",
			artifactRefs:
				brief.artifactRefs ??
				createDefaultExecutionBriefArtifactRefs(
					idea.slug,
					brief.sliceId,
					brief.id,
					brief.revision ?? 1,
				),
			provenance: brief.provenance
				? normalizeProvenanceEnvelope(brief.provenance)
				: createLegacyProvenance({
						requestId: `req_${idea.slug}`,
						createdFromTransition: "legacy_hydration",
						materialChangeClass: "repair",
						governingEntityRefs: [
							...(design
								? [createEntityRef("design", design.id, design.revision)]
								: []),
							...(plan
								? [createEntityRef("plan", plan.id, plan.revision)]
								: []),
							...(taskSet
								? [createEntityRef("task_set", taskSet.id, taskSet.revision)]
								: []),
						],
					}),
		}));
	}

	if (!plan || !design || !taskSet) {
		return undefined;
	}

	const currentBriefBySlice = idea.currentBriefBySlice ?? {};
	const legacySummary = currentBriefBySlice[plan.currentSlice];
	if (!legacySummary || Object.keys(currentBriefBySlice).length !== 1) {
		return undefined;
	}

	return [
		{
			id: `brief_${idea.slug}_${plan.currentSliceId}`,
			sliceId: plan.currentSliceId,
			revision: 1,
			status: "fresh",
			summary: legacySummary,
			scope: [],
			avoid: [],
			doneWhen: plan.acceptanceTarget,
			taskRefs: taskSet.taskIds,
			remainingOpenTaskCount: idea.tasks.filter((task) => !task.done).length,
			remainingOpenTaskGuidance:
				"Legacy brief hydrated from summary-only planner state.",
			sourceDesignRef: createEntityRef("design", design.id, design.revision),
			sourcePlanRef: createEntityRef("plan", plan.id, plan.revision),
			sourceTaskSetRef: createEntityRef(
				"task_set",
				taskSet.id,
				taskSet.revision,
			),
			provenance: createLegacyProvenance({
				requestId: `req_${idea.slug}`,
				createdFromTransition: "legacy_hydration",
				materialChangeClass: "repair",
				governingEntityRefs: [
					createEntityRef("design", design.id, design.revision),
					createEntityRef("plan", plan.id, plan.revision),
					createEntityRef("task_set", taskSet.id, taskSet.revision),
				],
			}),
			artifactRefs: createDefaultExecutionBriefArtifactRefs(
				idea.slug,
				plan.currentSliceId,
				`brief_${idea.slug}_${plan.currentSliceId}`,
				1,
			),
		},
	];
}

function ensureCurrentPointersShape(
	idea: PlannerIdea,
	design: PlannerDesign | undefined,
	plan: PlannerPlan | undefined,
	taskSet: PlannerTaskSet | undefined,
): PlannerCurrentPointers | undefined {
	const nextPointers: PlannerCurrentPointers = {};

	if (design) {
		nextPointers.currentDesign = createResolvedPointer(
			"current_design",
			idea.updatedAt,
			createEntityRef("design", design.id, design.revision),
			design.artifactRefs?.[0],
		);
	}

	if (plan) {
		nextPointers.currentPlan = createResolvedPointer(
			"current_plan",
			idea.updatedAt,
			createEntityRef("plan", plan.id, plan.revision),
			plan.artifactRefs?.[0],
		);
		nextPointers.currentSlice = createResolvedPointer(
			"current_slice",
			idea.updatedAt,
			createEntityRef("plan", plan.id, plan.revision),
			plan.artifactRefs?.[0],
		);
	}

	if (taskSet) {
		nextPointers.currentTaskSet = createResolvedPointer(
			"current_task_set",
			idea.updatedAt,
			createEntityRef("task_set", taskSet.id, taskSet.revision),
			taskSet.artifactRefs?.[0],
		);
	}

	const currentExecutionBriefBySliceId =
		createLegacyBriefPointers(idea, plan) ??
		normalizeCurrentExecutionBriefPointers(
			idea.currentPointers?.currentExecutionBriefBySliceId,
			idea.executionBriefs,
			idea.updatedAt,
		);
	if (currentExecutionBriefBySliceId) {
		nextPointers.currentExecutionBriefBySliceId =
			currentExecutionBriefBySliceId;
	}

	return Object.keys(nextPointers).length > 0 ? nextPointers : undefined;
}

function normalizeCurrentExecutionBriefPointers(
	pointers: Record<string, PlannerCurrentPointer> | undefined,
	executionBriefs: PlannerExecutionBrief[] | undefined,
	resolvedAt: string,
): Record<string, PlannerCurrentPointer> | undefined {
	if (!pointers) {
		return undefined;
	}

	const freshBriefIds = new Set(
		(executionBriefs ?? [])
			.filter((brief) => brief.status === "fresh")
			.map((brief) => brief.id),
	);
	const normalizedEntries = Object.entries(pointers).map(
		([sliceId, pointer]) => {
			if (
				pointer.resolutionStatus !== "resolved" ||
				(pointer.targetEntityRef &&
					freshBriefIds.has(pointer.targetEntityRef.entityId))
			) {
				return [sliceId, pointer] as const;
			}

			return [
				sliceId,
				createUnresolvedPointer(
					"current_execution_brief",
					resolvedAt,
					"Persisted current execution-brief pointer no longer targets a fresh brief and requires regeneration before execution gating can continue.",
				),
			] as const;
		},
	);

	return normalizedEntries.length > 0
		? Object.fromEntries(normalizedEntries)
		: undefined;
}

function upgradeLegacyIdea(idea: PlannerIdea): PlannerIdea {
	const design = ensureDesignShape(idea);
	const plan = ensurePlanShape({ ...idea, design });
	const taskSet = ensureTaskSetShape({ ...idea, design, plan }, plan);
	const executionBriefs = ensureExecutionBriefsShape(
		{ ...idea, design, plan, taskSet },
		design,
		plan,
		taskSet,
	);
	const currentPointers = ensureCurrentPointersShape(
		{ ...idea, design, plan, taskSet, executionBriefs },
		design,
		plan,
		taskSet,
	);

	return {
		...idea,
		design,
		plan,
		taskSet,
		executionBriefs,
		currentPointers,
	};
}

function summarizeCurrentBriefBySlice(
	idea: PlannerIdea,
): Record<string, string> {
	if (idea.executionBriefs && idea.executionBriefs.length > 0) {
		const plan = idea.plan;
		const summaries = idea.executionBriefs
			.filter((brief) => brief.status === "fresh" || brief.status === "stale")
			.map((brief) => {
				const sliceTitle =
					plan && plan.currentSliceId === brief.sliceId
						? plan.currentSlice
						: brief.sliceId;
				return [sliceTitle, brief.summary] as const;
			});
		return Object.fromEntries(summaries);
	}

	return idea.currentBriefBySlice ?? {};
}

function getCurrentExecutionBriefEntityId(
	idea: PlannerIdea,
	plan: PlannerPlan | undefined,
): string | undefined {
	if (!plan) {
		return undefined;
	}

	const currentPointers = idea.currentPointers?.currentExecutionBriefBySliceId;
	const currentPointer = currentPointers?.[plan.currentSliceId];
	if (currentPointer?.resolutionStatus !== "resolved") {
		return undefined;
	}

	return currentPointer?.targetEntityRef?.entityId;
}

export function getCurrentExecutionBriefPointer(
	idea: PlannerIdea,
): PlannerCurrentPointer | undefined {
	const plan = ensurePlanShape(idea);
	if (!plan) {
		return undefined;
	}

	return idea.currentPointers?.currentExecutionBriefBySliceId?.[
		plan.currentSliceId
	];
}

export function getCurrentExecutionBrief(
	idea: PlannerIdea,
): PlannerExecutionBrief | undefined {
	const plan = ensurePlanShape(idea);
	if (!plan) {
		return undefined;
	}

	const currentBriefId = getCurrentExecutionBriefEntityId(idea, plan);
	if (!currentBriefId) {
		return undefined;
	}

	return idea.executionBriefs?.find((brief) => brief.id === currentBriefId);
}

export function hasFreshCurrentExecutionBrief(idea: PlannerIdea): boolean {
	const currentBrief = getCurrentExecutionBrief(idea);
	return currentBrief?.status === "fresh";
}

export function rebuildControlPlaneFromIdeas(
	ideas: PlannerIdea[],
	options: { rawIdeas?: PlannerIdea[]; sourceVersion?: number } = {},
): WorkflowControlPlane {
	const controlPlane = createEmptyControlPlane();

	for (const [index, rawIdea] of ideas.entries()) {
		const idea = upgradeLegacyIdea(rawIdea);
		const migrationAssessment = assessMigrationState({
			rawIdea: options.rawIdeas?.[index] ?? rawIdea,
			sourceVersion: options.sourceVersion,
		});
		const requestId = `req_${idea.slug}`;
		const researchId = idea.research ? `research_${idea.slug}` : undefined;
		const designId =
			idea.currentPointers?.currentDesign?.targetEntityRef?.entityId;
		const planId = idea.currentPointers?.currentPlan?.targetEntityRef?.entityId;
		const taskSetId =
			idea.currentPointers?.currentTaskSet?.targetEntityRef?.entityId;
		const currentBriefBySlice = summarizeCurrentBriefBySlice(idea);
		const currentBriefEntityId = getCurrentExecutionBriefEntityId(
			idea,
			idea.plan,
		);
		const hasFreshCurrentBrief = hasFreshCurrentExecutionBrief(idea);
		const requestArtifactRefIds: string[] = [];
		const registerArtifactRefs = (
			entityType:
				| "PlannerDesign"
				| "PlannerPlan"
				| "TaskSet"
				| "ExecutionBrief",
			entityId: string,
			entityRevision: number,
			artifactRefs: PlannerArtifactRef[] | undefined,
			summary: string,
			status: "current" | "superseded" | "invalidated" = "current",
		) => {
			const artifactRefIds = (artifactRefs ?? []).map(
				(entry) => entry.artifactId,
			);
			for (const artifactRef of artifactRefs ?? []) {
				controlPlane.artifactRegistry = upsertArtifactRecord(
					controlPlane.artifactRegistry,
					createArtifactRecord({
						artifactId: artifactRef.artifactId,
						artifactType:
							artifactRef.artifactType === "task_set"
								? "tasks"
								: artifactRef.artifactType,
						artifactVersion: artifactRef.artifactRevision,
						status,
						path:
							artifactRef.path ??
							`requests/${idea.slug}/canon/${artifactRef.artifactId}`,
						governingEntityType: entityType,
						governingEntityId: entityId,
						derivedFromEntityVersion: entityRevision,
						materializationTimestamp: idea.updatedAt,
						isCurrent: status === "current",
						summary,
					}),
				);
			}
			return artifactRefIds;
		};

		controlPlane.requestRuntime[requestId] = createRequestRuntimeRecord({
			requestId,
			title: idea.name,
			migrationState: migrationAssessment.migrationState,
			currentResearchId: researchId,
			currentDesignId: designId,
			currentPlanId: planId,
			currentTaskSetId: taskSetId,
			currentBriefBySlice,
			status: idea.status,
			hasResearch: Boolean(idea.research),
			hasDesign: Boolean(idea.design),
			hasPlan: Boolean(idea.plan),
			hasTasks: idea.tasks.length > 0,
			hasCurrentSliceBrief: Boolean(
				currentBriefEntityId && hasFreshCurrentBrief,
			),
			hasCloseNote: Boolean(idea.closeNote),
			activeBlockers: migrationAssessment.unresolvedReasons,
			updatedAt: idea.updatedAt,
		});

		controlPlane.entityRegistry = upsertEntityRecord(
			controlPlane.entityRegistry,
			createEntityVersionRecord({
				entityId: requestId,
				entityType: "Request",
				createdAt: idea.createdAt,
				updatedAt: idea.updatedAt,
				governingRequestId: requestId,
				summary: idea.requestedOutcome,
				artifactRefIds: requestArtifactRefIds,
			}),
		);

		if (researchId) {
			controlPlane.entityRegistry = upsertEntityRecord(
				controlPlane.entityRegistry,
				createEntityVersionRecord({
					entityId: researchId,
					entityType: "PlannerResearch",
					createdAt: idea.createdAt,
					updatedAt: idea.updatedAt,
					governingRequestId: requestId,
					summary: idea.research?.summary ?? "",
				}),
			);
		}

		if (designId && idea.design) {
			const artifactRefIds = registerArtifactRefs(
				"PlannerDesign",
				designId,
				idea.design.revision,
				idea.design.artifactRefs,
				idea.design.summary,
			);
			controlPlane.entityRegistry = upsertEntityRecord(
				controlPlane.entityRegistry,
				createEntityVersionRecord({
					entityId: designId,
					entityType: "PlannerDesign",
					entityVersion: idea.design.revision,
					supersedesEntityVersion:
						idea.design.revision > 1 ? idea.design.revision - 1 : undefined,
					createdAt: idea.createdAt,
					updatedAt: idea.updatedAt,
					governingRequestId: requestId,
					summary: idea.design.summary,
					artifactRefIds,
				}),
			);
		}

		if (planId && idea.plan) {
			const artifactRefIds = registerArtifactRefs(
				"PlannerPlan",
				planId,
				idea.plan.revision,
				idea.plan.artifactRefs,
				idea.plan.goal,
			);
			controlPlane.entityRegistry = upsertEntityRecord(
				controlPlane.entityRegistry,
				createEntityVersionRecord({
					entityId: planId,
					entityType: "PlannerPlan",
					entityVersion: idea.plan.revision,
					supersedesEntityVersion:
						idea.plan.revision > 1 ? idea.plan.revision - 1 : undefined,
					createdAt: idea.createdAt,
					updatedAt: idea.updatedAt,
					governingRequestId: requestId,
					summary: idea.plan.goal,
					artifactRefIds,
				}),
			);
		}

		if (taskSetId && idea.taskSet) {
			const artifactRefIds = registerArtifactRefs(
				"TaskSet",
				taskSetId,
				idea.taskSet.revision,
				idea.taskSet.artifactRefs,
				`${idea.taskSet.taskIds.length} tasks tracked`,
			);
			controlPlane.entityRegistry = upsertEntityRecord(
				controlPlane.entityRegistry,
				createEntityVersionRecord({
					entityId: taskSetId,
					entityType: "TaskSet",
					entityVersion: idea.taskSet.revision,
					supersedesEntityVersion:
						idea.taskSet.revision > 1 ? idea.taskSet.revision - 1 : undefined,
					createdAt: idea.createdAt,
					updatedAt: idea.updatedAt,
					governingRequestId: requestId,
					summary: `${idea.taskSet.taskIds.length} tasks tracked`,
					artifactRefIds,
				}),
			);
		}

		for (const brief of idea.executionBriefs ?? []) {
			const artifactRefIds = registerArtifactRefs(
				"ExecutionBrief",
				brief.id,
				brief.revision,
				brief.artifactRefs,
				brief.summary,
				brief.status === "superseded"
					? "superseded"
					: brief.status === "invalid"
						? "invalidated"
						: "current",
			);
			controlPlane.entityRegistry = upsertEntityRecord(
				controlPlane.entityRegistry,
				createEntityVersionRecord({
					entityId: brief.id,
					entityType: "ExecutionBrief",
					entityVersion: brief.revision,
					supersedesEntityVersion:
						brief.revision > 1 ? brief.revision - 1 : undefined,
					versionStatus:
						brief.status === "superseded" ? "superseded" : "current",
					validityStatus:
						brief.status === "invalid"
							? "invalid"
							: brief.status === "stale"
								? "stale"
								: "current",
					createdAt: idea.createdAt,
					updatedAt: idea.updatedAt,
					governingRequestId: requestId,
					summary: brief.summary,
					artifactRefIds,
				}),
			);
		}

		controlPlane.currentPointers = upsertCurrentPointerRecord(
			controlPlane.currentPointers,
			createCurrentPointerRecord({
				requestId,
				currentResearchId: researchId,
				currentDesignId: designId,
				currentPlanId: planId,
				currentTaskSetId: taskSetId,
				currentBriefBySlice,
				lastResolvedAt: idea.updatedAt,
				unresolvedReasons: migrationAssessment.unresolvedReasons,
			}),
		);
	}

	return controlPlane;
}

export function createEmptyPlannerState(): PlannerState {
	return {
		version: 4,
		updatedAt: new Date().toISOString(),
		ideas: [],
		controlPlane: createEmptyControlPlane(),
	};
}

export function hydratePlannerState(input: {
	ideas: PlannerIdea[];
	updatedAt?: string;
	sourceVersion?: number;
}): PlannerState {
	const ideas = input.ideas.map(upgradeLegacyIdea);

	return {
		version: 4,
		updatedAt: input.updatedAt ?? new Date().toISOString(),
		ideas,
		controlPlane: rebuildControlPlaneFromIdeas(ideas, {
			rawIdeas: input.ideas,
			sourceVersion: input.sourceVersion,
		}),
	};
}

export function serializePlannerState(
	state: PlannerState,
): PersistedPlannerState {
	return {
		version: 4,
		updatedAt: state.updatedAt,
		ideas: state.ideas.map(upgradeLegacyIdea),
	};
}

export function slugifyIdeaName(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80);
}

export function requireIdeaSlug(name: string): string {
	const slug = slugifyIdeaName(name);

	if (slug.length > 0) {
		return slug;
	}

	throw new Error("ideaName must contain at least one letter or digit.");
}

export function createGeneratedTaskId(text: string): string {
	const base = slugifyIdeaName(text) || "task";
	return `generated-${base}`;
}

export function createManualTaskId(text: string): string {
	const base = slugifyIdeaName(text) || "task";
	return `manual-${Date.now().toString(36)}-${Math.random()
		.toString(36)
		.slice(2, 8)}-${base}`;
}

export function mergePlannerTasks(
	nextTasks: PlannerTask[],
	previousTasks: PlannerTask[],
): PlannerTask[] {
	const previousById = new Map(previousTasks.map((task) => [task.id, task]));
	const mergedTasks = nextTasks.map(
		(task) => previousById.get(task.id) ?? task,
	);
	const mergedIds = new Set(mergedTasks.map((task) => task.id));
	const extraPreviousTasks = previousTasks.filter(
		(task) => !mergedIds.has(task.id) && task.origin === "manual",
	);

	return mergedTasks.concat(extraPreviousTasks);
}

export function syncPlanBlockChecklistWithTasks(
	planBlocks: PlannerPlanBlock[],
	tasks: PlannerTask[],
): PlannerPlanBlock[] {
	const taskById = new Map(tasks.map((task) => [task.id, task]));

	return planBlocks.map((block) => ({
		...block,
		checklist: block.checklist.map((task) => taskById.get(task.id) ?? task),
	}));
}

export function updateTaskSetForTasks(input: {
	idea: PlannerIdea;
	tasks: PlannerTask[];
	createdFromTransition: string;
}): PlannerTaskSet | undefined {
	const plan = ensurePlanShape(input.idea);

	if (input.tasks.length === 0) {
		return undefined;
	}

	return {
		id: input.idea.taskSet?.id ?? `tasks_${input.idea.slug}`,
		revision: (input.idea.taskSet?.revision ?? 0) + 1,
		taskIds: input.tasks.map((task) => task.id),
		artifactRefs: createDefaultTaskSetArtifactRefs(
			input.idea.slug,
			input.idea.taskSet?.id ?? `tasks_${input.idea.slug}`,
			(input.idea.taskSet?.revision ?? 0) + 1,
		),
		provenance: createLegacyProvenance({
			requestId: `req_${input.idea.slug}`,
			createdFromTransition: input.createdFromTransition,
			materialChangeClass: "refresh",
			governingEntityRefs: [
				createEntityRef("idea", input.idea.slug, 1),
				...(plan ? [createEntityRef("plan", plan.id, plan.revision)] : []),
			],
			governingArtifactRefs: plan?.artifactRefs ?? [],
		}),
	};
}

export function markExecutionBriefsStale(
	idea: PlannerIdea,
	_reasonTransition: string,
): PlannerExecutionBrief[] | undefined {
	if (!idea.executionBriefs || idea.executionBriefs.length === 0) {
		return idea.executionBriefs;
	}

	return idea.executionBriefs.map((brief) =>
		brief.status === "fresh"
			? {
					...brief,
					status: "stale",
				}
			: brief,
	);
}

export function upsertIdea(
	state: PlannerState,
	idea: Omit<PlannerIdea, "updatedAt">,
): PlannerState {
	const updatedIdea: PlannerIdea = upgradeLegacyIdea({
		...idea,
		updatedAt: new Date().toISOString(),
	});
	const existingIndex = state.ideas.findIndex(
		(existingIdea) => existingIdea.slug === updatedIdea.slug,
	);
	const ideas =
		existingIndex === -1
			? state.ideas.concat(updatedIdea)
			: state.ideas.map((existingIdea, index) =>
					index === existingIndex ? updatedIdea : existingIdea,
				);

	return {
		version: 4,
		updatedAt: updatedIdea.updatedAt,
		ideas,
		controlPlane: rebuildControlPlaneFromIdeas(ideas),
	};
}

export function updateIdea(
	state: PlannerState,
	slug: string,
	update: (idea: PlannerIdea) => PlannerIdea,
): PlannerState {
	const existingIdea = state.ideas.find((idea) => idea.slug === slug);

	if (!existingIdea) {
		throw new Error(`Idea ${slug} was not found in planner state.`);
	}

	const updatedIdea = upgradeLegacyIdea({
		...update(existingIdea),
		updatedAt: new Date().toISOString(),
	});

	const ideas = state.ideas.map((idea) =>
		idea.slug === slug ? updatedIdea : idea,
	);

	return {
		version: 4,
		updatedAt: updatedIdea.updatedAt,
		ideas,
		controlPlane: rebuildControlPlaneFromIdeas(ideas),
	};
}
