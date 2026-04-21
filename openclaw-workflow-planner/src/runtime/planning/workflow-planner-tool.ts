import { Type } from "@sinclair/typebox";
import { loadPlannerState, savePlannerState } from "../state/planner-file.js";
import { requireIdeaSlug } from "../state/planner-state.js";
import { handleImplementationBrief } from "./brief-flow.js";
import {
	handleDesignGet,
	handleDesignPrepare,
	handleIdeaGate,
	handleResearchAttach,
} from "./design-flow.js";
import type { FlowContext, PlannerToolParams } from "./flow-helpers.js";
import { handlePlanCreateOrRefresh, handlePlanSnapshot } from "./plan-flow.js";
import {
	handleIdeaClose,
	handleIdeaCreate,
	handleIdeaGet,
	handleIdeaList,
} from "./request-flow.js";
import {
	requireNonEmptyText,
	validatePlannerSkill,
	validateSkillActionPair,
} from "./request-validation.js";
import {
	handleTaskAdd,
	handleTaskDone,
	handleTaskRemove,
	handleTaskReopen,
} from "./task-flow.js";

const ToolSchema = Type.Object(
	{
		action: Type.Union([
			Type.Literal("idea_create"),
			Type.Literal("research_attach"),
			Type.Literal("idea_gate"),
			Type.Literal("design_prepare"),
			Type.Literal("design_get"),
			Type.Literal("plan_create"),
			Type.Literal("plan_refresh"),
			Type.Literal("idea_list"),
			Type.Literal("idea_get"),
			Type.Literal("plan_snapshot"),
			Type.Literal("task_add"),
			Type.Literal("task_done"),
			Type.Literal("task_remove"),
			Type.Literal("task_reopen"),
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
		targetSurface: Type.Optional(Type.String()),
		constraints: Type.Optional(Type.Array(Type.String())),
		selectedApproach: Type.Optional(Type.String()),
		alternatives: Type.Optional(Type.Array(Type.String())),
		verificationStrategy: Type.Optional(Type.String()),
		acceptanceTarget: Type.Optional(Type.String()),
		currentSlice: Type.Optional(Type.String()),
		taskText: Type.Optional(Type.String()),
		taskIndex: Type.Optional(Type.Number()),
		taskId: Type.Optional(Type.String()),
		closeNote: Type.Optional(Type.String()),
	},
	{ additionalProperties: false },
);

type ToolParams = PlannerToolParams & {
	action:
		| "idea_create"
		| "research_attach"
		| "idea_gate"
		| "design_prepare"
		| "design_get"
		| "plan_create"
		| "plan_refresh"
		| "idea_list"
		| "idea_get"
		| "plan_snapshot"
		| "task_add"
		| "task_done"
		| "task_remove"
		| "task_reopen"
		| "implementation_brief"
		| "idea_close";
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

export function createWorkflowPlannerTool(
	options: WorkflowPlannerToolOptions = {},
) {
	return {
		name: "workflow_planner_action",
		description:
			"Planning-first workflow tool for idea lifecycle, typed research attachment, design preparation, accepted-plan creation/refresh, task tracking, snapshots, and implementation handoff.",
		parameters: ToolSchema,
		async execute(_toolCallId: string, params: ToolParams) {
			const skillName = validatePlannerSkill(params.skillName);
			validateSkillActionPair(skillName, params.action);
			const { filePath, state, revision } = await loadPlannerState(
				options.pluginConfig,
			);
			const context: FlowContext = {
				filePath,
				state,
				revision,
				pluginConfig: options.pluginConfig,
				save: (nextState, pluginConfig) =>
					savePlannerState(nextState, {
						...pluginConfig,
						expectedRevision: revision,
					}),
			};

			if (params.action === "idea_list") {
				if (
					typeof params.ideaName === "string" &&
					params.ideaName.trim().length > 0
				) {
					throw new Error("idea_list does not accept ideaName.");
				}
				return formatContent(await handleIdeaList(context, params));
			}

			const ideaName = requireIdeaNameForAction(params);
			requireIdeaSlug(ideaName);

			if (params.action === "idea_create") {
				return formatContent(await handleIdeaCreate(context, params, ideaName));
			}

			if (params.action === "research_attach") {
				return formatContent(
					await handleResearchAttach(context, params, ideaName),
				);
			}

			if (params.action === "idea_gate") {
				return formatContent(await handleIdeaGate(context, params, ideaName));
			}

			if (params.action === "design_prepare") {
				return formatContent(
					await handleDesignPrepare(context, params, ideaName),
				);
			}

			if (params.action === "design_get") {
				return formatContent(await handleDesignGet(context, params, ideaName));
			}

			if (params.action === "plan_create" || params.action === "plan_refresh") {
				return formatContent(
					await handlePlanCreateOrRefresh(context, params, ideaName),
				);
			}

			if (params.action === "idea_get") {
				return formatContent(await handleIdeaGet(context, params, ideaName));
			}

			if (params.action === "plan_snapshot") {
				return formatContent(
					await handlePlanSnapshot(context, params, ideaName),
				);
			}

			if (params.action === "task_add") {
				return formatContent(await handleTaskAdd(context, params, ideaName));
			}

			if (params.action === "task_done") {
				return formatContent(await handleTaskDone(context, params, ideaName));
			}

			if (params.action === "task_remove") {
				return formatContent(await handleTaskRemove(context, params, ideaName));
			}

			if (params.action === "task_reopen") {
				return formatContent(await handleTaskReopen(context, params, ideaName));
			}

			if (params.action === "implementation_brief") {
				return formatContent(
					await handleImplementationBrief(context, params, ideaName),
				);
			}

			if (params.action === "idea_close") {
				return formatContent(await handleIdeaClose(context, params, ideaName));
			}

			throw new Error(`Unsupported workflow action: ${params.action}`);
		},
	};
}
