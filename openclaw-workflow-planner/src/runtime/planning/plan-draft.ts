import {
	createGeneratedTaskId,
	type PlannerIdea,
	type PlannerPlan,
	type PlannerPlanBlock,
	type PlannerTask,
} from "../state/planner-state.js";

export type DraftPlanMode = "plan_create" | "plan_refresh";

export type DraftPlanInput = {
	idea: PlannerIdea;
	mode: DraftPlanMode;
	acceptanceTarget?: string;
	currentSlice?: string;
};

export type DraftPlanResult = {
	mode: DraftPlanMode;
	taskTitle: string;
	plan: PlannerPlan;
	tasks: PlannerTask[];
	markdown: string;
};

function createGeneratedTask(text: string): PlannerTask {
	return {
		id: createGeneratedTaskId(text),
		text,
		origin: "generated",
		done: false,
	};
}

export function buildDraftPlan(input: DraftPlanInput): DraftPlanResult {
	const idea = input.idea;
	const ownerSurface = idea.ownerSurface ?? "plugin package";
	const research = idea.research;
	const acceptanceTarget =
		input.acceptanceTarget?.trim() ||
		idea.plan?.acceptanceTarget ||
		`Accepted work for ${idea.name} is implemented, verified, and ready for a bounded handoff or next execution slice.`;
	const currentSlice =
		input.currentSlice?.trim() ||
		idea.plan?.currentSlice ||
		"Define the first bounded implementation slice from the accepted plan.";
	const evidence = [
		`idea problem: ${idea.problem}`,
		`requested outcome: ${idea.requestedOutcome}`,
		research
			? `research summary: ${research.summary}`
			: "research summary: n/a",
		`owner surface: ${ownerSurface}`,
	];

	const planBlocks: PlannerPlanBlock[] = [
		{
			title: "Plan Block 1",
			what: `Materialize ${ownerSurface} for ${idea.name}.`,
			why: "A package boundary keeps planning behavior reviewable and reusable.",
			evidence,
			checklist: [
				createGeneratedTask("scaffold package shape"),
				createGeneratedTask("define typed planning actions"),
				createGeneratedTask("bundle orchestrator-facing skill"),
			],
			doneWhen:
				"The package builds and exposes a clear first planning-oriented surface.",
		},
		{
			title: "Plan Block 2",
			what: "Define the handoff contract from planning into implementation.",
			why: "The planner should produce a bounded next step, not only broad advice.",
			evidence,
			checklist: [
				createGeneratedTask("draft implementation brief shape"),
				createGeneratedTask("document what remains local governance only"),
				createGeneratedTask(`align acceptance target: ${acceptanceTarget}`),
			],
			doneWhen:
				"An implementation agent can start from the produced brief without guessing the next slice.",
		},
	];
	const tasks = planBlocks.flatMap((block) => block.checklist);
	const plan: PlannerPlan = {
		goal: idea.requestedOutcome,
		scope: [
			"keep one idea as the unit of planning",
			"use explicit typed research before Idea Gate",
			"produce a plan that can drive bounded implementation slices",
		],
		outOfScope: [
			"implicit background automation without visible planner state",
			"mixing repo-local Codex governance with shipped runtime behavior",
		],
		planBlocks,
		acceptanceTarget,
		currentSlice,
	};
	const markdown = [
		`# Task: ${idea.name}`,
		"",
		`Mode: ${input.mode}`,
		"",
		`Goal: ${plan.goal}`,
		"",
		"Scope:",
		...plan.scope.map((item) => `- ${item}`),
		"",
		"Out of scope:",
		...plan.outOfScope.map((item) => `- ${item}`),
		"",
		`Acceptance target: ${plan.acceptanceTarget}`,
		`Current slice: ${plan.currentSlice}`,
		"",
		...planBlocks.flatMap((block) => [
			`## ${block.title}`,
			"",
			`What: ${block.what}`,
			`Why: ${block.why}`,
			"Evidence:",
			...block.evidence.map((item) => `- ${item}`),
			"Checklist:",
			...block.checklist.map(
				(task) => `- [${task.done ? "x" : " "}] ${task.text}`,
			),
			`Done when: ${block.doneWhen}`,
			"",
		]),
	]
		.join("\n")
		.trim();

	return {
		mode: input.mode,
		taskTitle: idea.name,
		plan,
		tasks,
		markdown,
	};
}
