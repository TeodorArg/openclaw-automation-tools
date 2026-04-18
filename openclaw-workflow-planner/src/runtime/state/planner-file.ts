import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
	createEmptyPlannerState,
	type PlannerIdea,
	type PlannerPlanBlock,
	type PlannerState,
	type PlannerTask,
} from "./planner-state.js";

const STATE_START = "<!-- openclaw-workflow-planner-state";
const STATE_END = "-->";

function renderTask(task: PlannerTask): string {
	return `- [${task.done ? "x" : " "}] ${task.text} (\`${task.id}\`, ${task.origin})`;
}

function renderPlanBlock(block: PlannerPlanBlock): string[] {
	return [
		`### ${block.title}`,
		"",
		`What: ${block.what}`,
		`Why: ${block.why}`,
		"Evidence:",
		...block.evidence.map((item) => `- ${item}`),
		"Checklist:",
		...block.checklist.map(renderTask),
		`Done when: ${block.doneWhen}`,
		"",
	];
}

function renderIdea(idea: PlannerIdea): string[] {
	return [
		`## ${idea.name}`,
		"",
		`- Slug: \`${idea.slug}\``,
		`- Status: \`${idea.status}\``,
		`- Created: ${idea.createdAt}`,
		`- Updated: ${idea.updatedAt}`,
		`- Owner surface: ${idea.ownerSurface ?? "n/a"}`,
		idea.closeNote ? `- Close note: ${idea.closeNote}` : "- Close note: n/a",
		"",
		"### Problem",
		"",
		idea.problem,
		"",
		"### Requested Outcome",
		"",
		idea.requestedOutcome,
		"",
		"### Research",
		"",
		...(idea.research
			? [
					`- Summary: ${idea.research.summary}`,
					`- Value: \`${idea.research.valueAssessment}\``,
					`- Risk: \`${idea.research.riskAssessment}\``,
					`- Existing coverage: \`${idea.research.existingCoverage}\``,
					`- Fit: ${idea.research.fitAssessment}`,
					`- Sources checked: ${idea.research.sourcesChecked.join(", ")}`,
					idea.research.similarSurfaces?.length
						? `- Similar surfaces: ${idea.research.similarSurfaces.join(", ")}`
						: "- Similar surfaces: n/a",
					idea.research.whyNow
						? `- Why now: ${idea.research.whyNow}`
						: "- Why now: n/a",
					idea.research.openQuestions?.length
						? `- Open questions: ${idea.research.openQuestions.join("; ")}`
						: "- Open questions: n/a",
				]
			: ["No research attached yet."]),
		"",
		"### Idea Gate",
		"",
		...(idea.ideaGate
			? [
					`- Decision: \`${idea.ideaGate.decision}\``,
					`- Next action: \`${idea.ideaGate.nextSuggestedAction}\``,
					`- Decided at: ${idea.ideaGate.decidedAt}`,
					"Reasoning:",
					...idea.ideaGate.reasoning.map((item) => `- ${item}`),
				]
			: ["No idea gate decision recorded yet."]),
		"",
		"### Tasks",
		"",
		...(idea.tasks.length > 0
			? idea.tasks.map(renderTask)
			: ["- [ ] No tasks recorded yet."]),
		"",
		"### Plan",
		"",
		...(idea.plan
			? [
					`Goal: ${idea.plan.goal}`,
					"",
					"Scope:",
					...idea.plan.scope.map((item) => `- ${item}`),
					"",
					"Out of scope:",
					...idea.plan.outOfScope.map((item) => `- ${item}`),
					"",
					`Acceptance target: ${idea.plan.acceptanceTarget}`,
					`Current slice: ${idea.plan.currentSlice}`,
					"",
					...idea.plan.planBlocks.flatMap(renderPlanBlock),
				]
			: ["No canonical plan created yet."]),
	];
}

export function resolvePlannerFilePath(pluginConfig?: {
	plannerFilePath?: unknown;
}): string {
	const configuredPath =
		typeof pluginConfig?.plannerFilePath === "string"
			? pluginConfig.plannerFilePath.trim()
			: "";

	return resolve(configuredPath || "WORKFLOW_PLAN.md");
}

export function renderPlannerMarkdown(state: PlannerState): string {
	const encodedState = JSON.stringify(state, null, 2);
	const ideaCount = state.ideas.length;

	return [
		STATE_START,
		encodedState,
		STATE_END,
		"",
		"# Workflow Planner",
		"",
		"This file is the planner source of truth for the OpenClaw workflow planner plugin.",
		"It stays human-readable in Markdown and keeps a structured state block at the top for safe machine updates.",
		"",
		`Updated at: ${state.updatedAt}`,
		`Ideas tracked: ${ideaCount}`,
		"",
		...(ideaCount > 0
			? state.ideas.flatMap((idea) => [...renderIdea(idea), ""])
			: ["No ideas recorded yet."]),
	]
		.join("\n")
		.trimEnd()
		.concat("\n");
}

export function parsePlannerMarkdown(markdown: string): PlannerState {
	const startIndex = markdown.indexOf(STATE_START);

	if (startIndex === -1) {
		return createEmptyPlannerState();
	}

	const contentStart = startIndex + STATE_START.length;
	const endIndex = markdown.indexOf(STATE_END, contentStart);

	if (endIndex === -1) {
		throw new Error("Planner state block is malformed.");
	}

	const jsonText = markdown.slice(contentStart, endIndex).trim();

	if (jsonText.length === 0) {
		return createEmptyPlannerState();
	}

	const parsed = JSON.parse(jsonText) as PlannerState;

	if (parsed.version !== 1 || !Array.isArray(parsed.ideas)) {
		throw new Error("Planner state block has an unsupported shape.");
	}

	return parsed;
}

export async function loadPlannerState(pluginConfig?: {
	plannerFilePath?: unknown;
}): Promise<{
	filePath: string;
	state: PlannerState;
}> {
	const filePath = resolvePlannerFilePath(pluginConfig);

	try {
		const markdown = await readFile(filePath, "utf8");
		return {
			filePath,
			state: parsePlannerMarkdown(markdown),
		};
	} catch (error) {
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "ENOENT"
		) {
			return {
				filePath,
				state: createEmptyPlannerState(),
			};
		}

		throw error;
	}
}

export async function savePlannerState(
	state: PlannerState,
	pluginConfig?: {
		plannerFilePath?: unknown;
	},
): Promise<{
	filePath: string;
	markdown: string;
}> {
	const filePath = resolvePlannerFilePath(pluginConfig);
	const markdown = renderPlannerMarkdown(state);

	await mkdir(dirname(filePath), { recursive: true });
	await writeFile(filePath, markdown, "utf8");

	return {
		filePath,
		markdown,
	};
}
