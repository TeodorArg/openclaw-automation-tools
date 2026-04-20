import { createEmptyArtifactRegistry } from "./artifact-registry.js";
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
import type { WorkflowControlPlane } from "./workflow-state.js";

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
		| "plan_create"
		| "narrow_scope";
	decidedAt: string;
};

export type PlannerPlan = {
	goal: string;
	scope: string[];
	outOfScope: string[];
	planBlocks: PlannerPlanBlock[];
	acceptanceTarget: string;
	currentSlice: string;
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
	plan?: PlannerPlan;
	tasks: PlannerTask[];
	currentBriefBySlice?: Record<string, string>;
	closeNote?: string;
};

export type PlannerState = {
	version: 2;
	updatedAt: string;
	ideas: PlannerIdea[];
	controlPlane: WorkflowControlPlane;
};

function createEmptyControlPlane(): WorkflowControlPlane {
	return {
		requestRuntime: {},
		entityRegistry: createEmptyEntityRegistry(),
		artifactRegistry: createEmptyArtifactRegistry(),
		currentPointers: createEmptyCurrentPointerRegistry(),
	};
}

export function rebuildControlPlaneFromIdeas(
	ideas: PlannerIdea[],
): WorkflowControlPlane {
	const controlPlane = createEmptyControlPlane();

	for (const idea of ideas) {
		const requestId = `req_${idea.slug}`;
		const researchId = idea.research ? `research_${idea.slug}` : undefined;
		const planId = idea.plan ? `plan_${idea.slug}` : undefined;
		const taskSetId = idea.tasks.length > 0 ? `tasks_${idea.slug}` : undefined;
		const currentBriefBySlice = idea.currentBriefBySlice ?? {};

		const artifactRefIds: string[] = [];

		controlPlane.requestRuntime[requestId] = createRequestRuntimeRecord({
			requestId,
			title: idea.name,
			currentResearchId: researchId,
			currentPlanId: planId,
			currentTaskSetId: taskSetId,
			currentBriefBySlice,
			status: idea.status,
			hasResearch: Boolean(idea.research),
			hasPlan: Boolean(idea.plan),
			hasTasks: idea.tasks.length > 0,
			hasCurrentSliceBrief: Boolean(
				idea.plan?.currentSlice && currentBriefBySlice[idea.plan.currentSlice],
			),
			hasCloseNote: Boolean(idea.closeNote),
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
				artifactRefIds,
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

		if (planId && idea.plan) {
			controlPlane.entityRegistry = upsertEntityRecord(
				controlPlane.entityRegistry,
				createEntityVersionRecord({
					entityId: planId,
					entityType: "PlannerPlan",
					createdAt: idea.createdAt,
					updatedAt: idea.updatedAt,
					governingRequestId: requestId,
					summary: idea.plan.goal,
				}),
			);
		}

		if (taskSetId) {
			controlPlane.entityRegistry = upsertEntityRecord(
				controlPlane.entityRegistry,
				createEntityVersionRecord({
					entityId: taskSetId,
					entityType: "TaskSet",
					createdAt: idea.createdAt,
					updatedAt: idea.updatedAt,
					governingRequestId: requestId,
					summary: `${idea.tasks.length} tasks tracked`,
				}),
			);
		}

		for (const [slice, briefSummary] of Object.entries(currentBriefBySlice)) {
			const briefEntityId = `brief_${idea.slug}_${slice}`;
			controlPlane.entityRegistry = upsertEntityRecord(
				controlPlane.entityRegistry,
				createEntityVersionRecord({
					entityId: briefEntityId,
					entityType: "ExecutionBrief",
					createdAt: idea.createdAt,
					updatedAt: idea.updatedAt,
					governingRequestId: requestId,
					summary: briefSummary,
				}),
			);
		}

		controlPlane.currentPointers = upsertCurrentPointerRecord(
			controlPlane.currentPointers,
			createCurrentPointerRecord({
				requestId,
				currentResearchId: researchId,
				currentPlanId: planId,
				currentTaskSetId: taskSetId,
				currentBriefBySlice,
				lastResolvedAt: idea.updatedAt,
				unresolvedReasons: [],
			}),
		);
	}

	return controlPlane;
}

export function createEmptyPlannerState(): PlannerState {
	return {
		version: 2,
		updatedAt: new Date().toISOString(),
		ideas: [],
		controlPlane: createEmptyControlPlane(),
	};
}

export function hydratePlannerState(input: {
	ideas: PlannerIdea[];
	updatedAt?: string;
}): PlannerState {
	return {
		version: 2,
		updatedAt: input.updatedAt ?? new Date().toISOString(),
		ideas: input.ideas,
		controlPlane: rebuildControlPlaneFromIdeas(input.ideas),
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
		(task) => !mergedIds.has(task.id),
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

export function upsertIdea(
	state: PlannerState,
	idea: Omit<PlannerIdea, "updatedAt">,
): PlannerState {
	const updatedIdea: PlannerIdea = {
		...idea,
		updatedAt: new Date().toISOString(),
	};
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
		version: 2,
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

	const updatedIdea = {
		...update(existingIdea),
		updatedAt: new Date().toISOString(),
	};

	const ideas = state.ideas.map((idea) =>
		idea.slug === slug ? updatedIdea : idea,
	);

	return {
		version: 2,
		updatedAt: updatedIdea.updatedAt,
		ideas,
		controlPlane: rebuildControlPlaneFromIdeas(ideas),
	};
}
