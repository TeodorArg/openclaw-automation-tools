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
	closeNote?: string;
};

export type PlannerState = {
	version: 1;
	updatedAt: string;
	ideas: PlannerIdea[];
};

export function createEmptyPlannerState(): PlannerState {
	return {
		version: 1,
		updatedAt: new Date().toISOString(),
		ideas: [],
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
	const previousByText = new Map(
		previousTasks.map((task) => [task.text, task]),
	);
	const mergedTasks = nextTasks.map(
		(task) =>
			previousById.get(task.id) ?? previousByText.get(task.text) ?? task,
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
	const taskByText = new Map(tasks.map((task) => [task.text, task]));

	return planBlocks.map((block) => ({
		...block,
		checklist: block.checklist.map(
			(task) => taskById.get(task.id) ?? taskByText.get(task.text) ?? task,
		),
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
		version: 1,
		updatedAt: updatedIdea.updatedAt,
		ideas,
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

	return {
		version: 1,
		updatedAt: updatedIdea.updatedAt,
		ideas: state.ideas.map((idea) => (idea.slug === slug ? updatedIdea : idea)),
	};
}
