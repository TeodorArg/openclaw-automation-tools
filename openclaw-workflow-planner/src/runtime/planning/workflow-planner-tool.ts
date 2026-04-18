import { Type } from "@sinclair/typebox";
import { loadPlannerState, savePlannerState } from "../state/planner-file.js";
import {
	createManualTaskId,
	mergePlannerTasks,
	type PlannerIdea,
	type PlannerResearch,
	type PlannerTask,
	requireIdeaSlug,
	syncPlanBlockChecklistWithTasks,
	updateIdea,
	upsertIdea,
} from "../state/planner-state.js";
import { evaluateIdeaGate, type IdeaGateInput } from "./idea-gate.js";
import {
	buildImplementationBriefFromIdea,
	type ImplementationBriefResult,
} from "./implementation-brief.js";
import {
	buildDraftPlan,
	type DraftPlanInput,
	type DraftPlanResult,
} from "./plan-draft.js";
import {
	requireNonEmptyText,
	requireNonEmptyTextArray,
	validatePlannerSkill,
	validateSkillActionPair,
} from "./request-validation.js";

const ToolSchema = Type.Object(
	{
		action: Type.Union([
			Type.Literal("idea_create"),
			Type.Literal("research_attach"),
			Type.Literal("idea_gate"),
			Type.Literal("plan_create"),
			Type.Literal("plan_refresh"),
			Type.Literal("idea_list"),
			Type.Literal("idea_get"),
			Type.Literal("plan_snapshot"),
			Type.Literal("task_add"),
			Type.Literal("task_done"),
			Type.Literal("implementation_brief"),
			Type.Literal("idea_close"),
		]),
		command: Type.String(),
		commandName: Type.String(),
		skillName: Type.String(),
		ideaName: Type.Optional(Type.String()),
		problem: Type.Optional(Type.String()),
		requestedOutcome: Type.Optional(Type.String()),
		notes: Type.Optional(Type.String()),
		links: Type.Optional(Type.Array(Type.String())),
		ownerSurface: Type.Optional(Type.String()),
		researchSummary: Type.Optional(Type.String()),
		valueAssessment: Type.Optional(
			Type.Union([
				Type.Literal("low"),
				Type.Literal("medium"),
				Type.Literal("high"),
			]),
		),
		riskAssessment: Type.Optional(
			Type.Union([
				Type.Literal("safe"),
				Type.Literal("caution"),
				Type.Literal("unsafe"),
			]),
		),
		existingCoverage: Type.Optional(
			Type.Union([
				Type.Literal("none"),
				Type.Literal("partial"),
				Type.Literal("strong"),
			]),
		),
		fitAssessment: Type.Optional(Type.String()),
		sourcesChecked: Type.Optional(Type.Array(Type.String())),
		similarSurfaces: Type.Optional(Type.Array(Type.String())),
		whyNow: Type.Optional(Type.String()),
		openQuestions: Type.Optional(Type.Array(Type.String())),
		acceptanceTarget: Type.Optional(Type.String()),
		currentSlice: Type.Optional(Type.String()),
		taskText: Type.Optional(Type.String()),
		taskIndex: Type.Optional(Type.Number()),
		taskId: Type.Optional(Type.String()),
		closeNote: Type.Optional(Type.String()),
	},
	{ additionalProperties: false },
);

type ToolParams = {
	action:
		| "idea_create"
		| "research_attach"
		| "idea_gate"
		| "plan_create"
		| "plan_refresh"
		| "idea_list"
		| "idea_get"
		| "plan_snapshot"
		| "task_add"
		| "task_done"
		| "implementation_brief"
		| "idea_close";
	command: string;
	commandName: string;
	skillName: string;
	ideaName?: string;
	problem?: string;
	requestedOutcome?: string;
	notes?: string;
	links?: string[];
	ownerSurface?: string;
	researchSummary?: string;
	valueAssessment?: "low" | "medium" | "high";
	riskAssessment?: "safe" | "caution" | "unsafe";
	existingCoverage?: "none" | "partial" | "strong";
	fitAssessment?: string;
	sourcesChecked?: string[];
	similarSurfaces?: string[];
	whyNow?: string;
	openQuestions?: string[];
	acceptanceTarget?: string;
	currentSlice?: string;
	taskText?: string;
	taskIndex?: number;
	taskId?: string;
	closeNote?: string;
};

type WorkflowPlannerToolOptions = {
	pluginConfig?: {
		plannerFilePath?: unknown;
	};
	toolContext?: {
		agentId?: string;
		sessionKey?: string;
	};
};

function formatContent(payload: unknown) {
	return {
		content: [
			{
				type: "text" as const,
				text: JSON.stringify(payload, null, 2),
			},
		],
	};
}

function requireIdeaNameForAction(params: ToolParams): string {
	if (params.action === "idea_list") {
		throw new Error("idea_list does not accept ideaName.");
	}

	return requireNonEmptyText(params.ideaName ?? "", "ideaName");
}

function requirePersistedIdea(
	idea: PlannerIdea | undefined,
	slug: string,
): PlannerIdea {
	if (idea) {
		return idea;
	}

	throw new Error(`Idea ${slug} was not found in planner state.`);
}

function requireResearch(idea: PlannerIdea): PlannerResearch {
	if (idea.research) {
		return idea.research;
	}

	throw new Error(`Idea ${idea.slug} does not have attached research yet.`);
}

function requireAcceptedIdea(idea: PlannerIdea): PlannerIdea {
	if (idea.status === "accepted" && idea.plan) {
		return idea;
	}

	throw new Error(
		`Idea ${idea.slug} must be accepted and have a canonical plan for this action.`,
	);
}

function buildResearchFromParams(params: ToolParams): PlannerResearch {
	return {
		summary: requireNonEmptyText(
			params.researchSummary ?? "",
			"researchSummary",
		),
		valueAssessment: params.valueAssessment ?? "medium",
		riskAssessment: params.riskAssessment ?? "caution",
		existingCoverage: params.existingCoverage ?? "partial",
		fitAssessment: requireNonEmptyText(
			params.fitAssessment ?? "",
			"fitAssessment",
		),
		sourcesChecked: requireNonEmptyTextArray(
			params.sourcesChecked,
			"sourcesChecked",
		),
		similarSurfaces: params.similarSurfaces?.map((entry) =>
			requireNonEmptyText(entry, "similarSurfaces"),
		),
		whyNow: params.whyNow?.trim() || undefined,
		openQuestions: params.openQuestions?.map((entry) =>
			requireNonEmptyText(entry, "openQuestions"),
		),
	};
}

function buildIdeaSummary(idea: PlannerIdea) {
	return {
		slug: idea.slug,
		name: idea.name,
		status: idea.status,
		createdAt: idea.createdAt,
		updatedAt: idea.updatedAt,
		hasResearch: Boolean(idea.research),
		hasPlan: Boolean(idea.plan),
		taskCounts: {
			total: idea.tasks.length,
			open: idea.tasks.filter((task) => !task.done).length,
			done: idea.tasks.filter((task) => task.done).length,
		},
	};
}

export function createWorkflowPlannerTool(
	options: WorkflowPlannerToolOptions = {},
) {
	return {
		name: "workflow_planner_action",
		description:
			"Planning-first workflow tool for idea lifecycle, typed research attachment, accepted-plan creation/refresh, task tracking, and implementation handoff.",
		parameters: ToolSchema,
		async execute(_toolCallId: string, params: ToolParams) {
			const skillName = validatePlannerSkill(params.skillName);
			validateSkillActionPair(skillName, params.action);
			const { filePath, state } = await loadPlannerState(options.pluginConfig);

			if (params.action === "idea_list") {
				return formatContent({
					ok: true,
					action: params.action,
					commandName: params.commandName,
					command: params.command,
					plannerFilePath: filePath,
					ideas: state.ideas.map(buildIdeaSummary),
					note: "idea_list returns lightweight summaries for every tracked planner idea.",
				});
			}

			const ideaName = requireIdeaNameForAction(params);
			const ideaSlug = requireIdeaSlug(ideaName);
			const persistedIdea = state.ideas.find((idea) => idea.slug === ideaSlug);

			if (params.action === "idea_create") {
				const problem = requireNonEmptyText(params.problem ?? "", "problem");
				const requestedOutcome = requireNonEmptyText(
					params.requestedOutcome ?? "",
					"requestedOutcome",
				);
				const now = new Date().toISOString();
				const updatedState = upsertIdea(state, {
					slug: ideaSlug,
					name: ideaName,
					problem,
					requestedOutcome,
					createdAt: persistedIdea?.createdAt ?? now,
					status: persistedIdea?.status ?? "draft",
					notes: params.notes?.trim() || persistedIdea?.notes,
					links: params.links?.map((entry) =>
						requireNonEmptyText(entry, "links"),
					),
					ownerSurface:
						params.ownerSurface?.trim() || persistedIdea?.ownerSurface,
					research: persistedIdea?.research,
					ideaGate: persistedIdea?.ideaGate,
					plan: persistedIdea?.plan,
					tasks: persistedIdea?.tasks ?? [],
					closeNote: persistedIdea?.closeNote,
				});
				const saved = await savePlannerState(
					updatedState,
					options.pluginConfig,
				);
				const idea = updatedState.ideas.find(
					(entry) => entry.slug === ideaSlug,
				);

				return formatContent({
					ok: true,
					action: params.action,
					commandName: params.commandName,
					command: params.command,
					ideaName,
					ideaSlug,
					plannerFilePath: saved.filePath,
					idea,
					note: "idea_create creates or updates the base idea record before research and idea gate work begin.",
				});
			}

			if (params.action === "research_attach") {
				requirePersistedIdea(persistedIdea, ideaSlug);
				const research = buildResearchFromParams(params);
				const updatedState = updateIdea(state, ideaSlug, (existingIdea) => ({
					...existingIdea,
					research,
					status:
						existingIdea.status === "draft"
							? "needs_research"
							: existingIdea.status,
				}));
				const saved = await savePlannerState(
					updatedState,
					options.pluginConfig,
				);

				return formatContent({
					ok: true,
					action: params.action,
					commandName: params.commandName,
					command: params.command,
					ideaName,
					ideaSlug,
					plannerFilePath: saved.filePath,
					research,
					note: "research_attach persists typed evidence for the idea before the explicit idea gate runs.",
				});
			}

			if (params.action === "idea_gate") {
				const idea = requirePersistedIdea(persistedIdea, ideaSlug);
				const research = requireResearch(idea);
				const result = evaluateIdeaGate({
					ideaName: idea.name,
					problem: idea.problem,
					requestedOutcome: idea.requestedOutcome,
					research,
				} satisfies IdeaGateInput);
				const updatedState = updateIdea(state, ideaSlug, (existingIdea) => ({
					...existingIdea,
					status: result.decision,
					ideaGate: {
						...result,
						decidedAt: new Date().toISOString(),
					},
				}));
				const saved = await savePlannerState(
					updatedState,
					options.pluginConfig,
				);

				return formatContent({
					ok: true,
					action: params.action,
					commandName: params.commandName,
					command: params.command,
					ideaName,
					ideaSlug,
					plannerFilePath: saved.filePath,
					...result,
					note: "idea_gate is the explicit accept/defer/reject/needs-research checkpoint after typed research exists.",
				});
			}

			if (params.action === "plan_create" || params.action === "plan_refresh") {
				const idea = requirePersistedIdea(persistedIdea, ideaSlug);

				if (idea.status !== "accepted") {
					throw new Error(
						`Idea ${idea.slug} must be accepted before ${params.action} can run.`,
					);
				}

				if (params.action === "plan_create" && idea.plan) {
					throw new Error(
						`Idea ${idea.slug} already has a plan. Use plan_refresh instead of plan_create.`,
					);
				}

				if (params.action === "plan_refresh" && !idea.plan) {
					throw new Error(
						`Idea ${idea.slug} does not have a plan yet. Use plan_create before plan_refresh.`,
					);
				}

				const result = buildDraftPlan({
					idea,
					mode: params.action,
					acceptanceTarget: params.acceptanceTarget,
					currentSlice: params.currentSlice,
				} satisfies DraftPlanInput);
				const mergedTasks = mergePlannerTasks(result.tasks, idea.tasks);
				const syncedPlan = {
					...result.plan,
					planBlocks: syncPlanBlockChecklistWithTasks(
						result.plan.planBlocks,
						mergedTasks,
					),
				};
				const updatedState = updateIdea(state, ideaSlug, (existingIdea) => ({
					...existingIdea,
					plan: syncedPlan,
					tasks: mergedTasks,
				}));
				const saved = await savePlannerState(
					updatedState,
					options.pluginConfig,
				);

				return formatContent({
					ok: true,
					action: params.action,
					commandName: params.commandName,
					command: params.command,
					ideaName,
					ideaSlug,
					plannerFilePath: saved.filePath,
					mode: result.mode,
					taskTitle: result.taskTitle,
					plan: syncedPlan,
					tasks: mergedTasks,
					markdown: result.markdown,
					note:
						params.action === "plan_create"
							? "plan_create materializes the first canonical plan for an accepted idea."
							: "plan_refresh regenerates the accepted plan while preserving existing task state where possible.",
				} satisfies DraftPlanResult & {
					ok: true;
					action: "plan_create" | "plan_refresh";
					commandName: string;
					command: string;
					ideaName: string;
					ideaSlug: string;
					plannerFilePath: string;
					note: string;
				});
			}

			if (params.action === "idea_get" || params.action === "plan_snapshot") {
				const idea = requirePersistedIdea(persistedIdea, ideaSlug);

				return formatContent({
					ok: true,
					action: params.action,
					commandName: params.commandName,
					command: params.command,
					ideaName,
					ideaSlug,
					plannerFilePath: filePath,
					idea,
					note:
						params.action === "idea_get"
							? "idea_get returns the full persisted idea record."
							: "plan_snapshot returns the current persisted planner state for this idea.",
				});
			}

			if (params.action === "task_add") {
				const idea = requireAcceptedIdea(
					requirePersistedIdea(persistedIdea, ideaSlug),
				);
				const taskText = requireNonEmptyText(params.taskText ?? "", "taskText");
				const manualTask: PlannerTask = {
					id: createManualTaskId(taskText),
					text: taskText,
					origin: "manual",
					done: false,
				};
				const tasks = idea.tasks.concat(manualTask);
				const updatedState = updateIdea(state, ideaSlug, (existingIdea) => ({
					...existingIdea,
					tasks,
					plan: existingIdea.plan
						? {
								...existingIdea.plan,
								planBlocks: syncPlanBlockChecklistWithTasks(
									existingIdea.plan.planBlocks,
									tasks,
								),
							}
						: existingIdea.plan,
				}));
				const saved = await savePlannerState(
					updatedState,
					options.pluginConfig,
				);

				return formatContent({
					ok: true,
					action: params.action,
					commandName: params.commandName,
					command: params.command,
					ideaName,
					ideaSlug,
					plannerFilePath: saved.filePath,
					addedTask: manualTask,
					note: "task_add appends one manual unchecked task to an accepted idea.",
				});
			}

			if (params.action === "task_done") {
				const idea = requireAcceptedIdea(
					requirePersistedIdea(persistedIdea, ideaSlug),
				);

				if (params.taskId) {
					const taskId = requireNonEmptyText(params.taskId, "taskId");
					const task = idea.tasks.find((entry) => entry.id === taskId);

					if (!task) {
						throw new Error(
							`taskId ${taskId} was not found for idea ${idea.slug}.`,
						);
					}

					const tasks = idea.tasks.map((entry) =>
						entry.id === taskId
							? {
									...entry,
									done: true,
								}
							: entry,
					);
					const updatedState = updateIdea(state, ideaSlug, (existingIdea) => ({
						...existingIdea,
						tasks,
						plan: existingIdea.plan
							? {
									...existingIdea.plan,
									planBlocks: syncPlanBlockChecklistWithTasks(
										existingIdea.plan.planBlocks,
										tasks,
									),
								}
							: existingIdea.plan,
					}));
					const saved = await savePlannerState(
						updatedState,
						options.pluginConfig,
					);

					return formatContent({
						ok: true,
						action: params.action,
						commandName: params.commandName,
						command: params.command,
						ideaName,
						ideaSlug,
						plannerFilePath: saved.filePath,
						completedTaskId: taskId,
						note: "task_done marks a task complete by stable task id.",
					});
				}

				if (
					typeof params.taskIndex !== "number" ||
					!Number.isInteger(params.taskIndex)
				) {
					throw new Error(
						"task_done requires either taskId or an integer taskIndex.",
					);
				}

				const taskIndex = params.taskIndex;

				if (taskIndex < 1 || taskIndex > idea.tasks.length) {
					throw new Error(
						`taskIndex ${taskIndex} is out of range for idea ${idea.slug}.`,
					);
				}

				const tasks = idea.tasks.map((task, index) =>
					index === taskIndex - 1
						? {
								...task,
								done: true,
							}
						: task,
				);
				const updatedState = updateIdea(state, ideaSlug, (existingIdea) => ({
					...existingIdea,
					tasks,
					plan: existingIdea.plan
						? {
								...existingIdea.plan,
								planBlocks: syncPlanBlockChecklistWithTasks(
									existingIdea.plan.planBlocks,
									tasks,
								),
							}
						: existingIdea.plan,
				}));
				const saved = await savePlannerState(
					updatedState,
					options.pluginConfig,
				);

				return formatContent({
					ok: true,
					action: params.action,
					commandName: params.commandName,
					command: params.command,
					ideaName,
					ideaSlug,
					plannerFilePath: saved.filePath,
					completedTaskIndex: taskIndex,
					note: "task_done marks a task complete by legacy 1-based task index.",
				});
			}

			if (params.action === "implementation_brief") {
				const idea = requireAcceptedIdea(
					requirePersistedIdea(persistedIdea, ideaSlug),
				);
				const brief = buildImplementationBriefFromIdea(idea);

				return formatContent({
					ok: true,
					action: params.action,
					commandName: params.commandName,
					command: params.command,
					ideaName,
					plannerFilePath: filePath,
					...brief,
					note: "implementation_brief derives a bounded handoff from the accepted plan and its open tasks.",
				} satisfies ImplementationBriefResult & {
					ok: true;
					action: "implementation_brief";
					commandName: string;
					command: string;
					ideaName: string;
					ideaSlug: string;
					plannerFilePath: string;
					note: string;
				});
			}

			if (params.action === "idea_close") {
				requirePersistedIdea(persistedIdea, ideaSlug);
				const closeNote = requireNonEmptyText(
					params.closeNote ?? "",
					"closeNote",
				);
				const updatedState = updateIdea(state, ideaSlug, (existingIdea) => ({
					...existingIdea,
					status: "closed",
					closeNote,
				}));
				const saved = await savePlannerState(
					updatedState,
					options.pluginConfig,
				);

				return formatContent({
					ok: true,
					action: params.action,
					commandName: params.commandName,
					command: params.command,
					ideaName,
					ideaSlug,
					plannerFilePath: saved.filePath,
					closeNote,
					note: "idea_close marks the idea closed with an explicit outcome note.",
				});
			}

			throw new Error(`Unsupported workflow action: ${params.action}`);
		},
	};
}
