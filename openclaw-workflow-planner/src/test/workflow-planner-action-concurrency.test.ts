import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { handleImplementationBrief } from "../runtime/planning/brief-flow.js";
import type {
	FlowContext,
	PlannerToolParams,
} from "../runtime/planning/flow-helpers.js";
import {
	handleTaskAdd,
	handleTaskDone,
} from "../runtime/planning/task-flow.js";
import { createWorkflowPlannerTool } from "../runtime/planning/workflow-planner-tool.js";
import {
	loadPlannerState,
	PlannerConcurrentModificationError,
	savePlannerState,
} from "../runtime/state/planner-file.js";

async function createTool() {
	const tempDir = await mkdtemp(join(tmpdir(), "workflow-planner-race-test-"));
	const plannerFilePath = join(tempDir, "WORKFLOW_PLAN.md");

	return {
		plannerFilePath,
		tool: createWorkflowPlannerTool({
			pluginConfig: {
				plannerFilePath,
			},
		}),
	};
}

async function seedAcceptedIdea(
	tool: ReturnType<typeof createWorkflowPlannerTool>,
) {
	await tool.execute("call-a", {
		action: "idea_create",
		command: "create idea",
		commandName: "plan_workflow",
		skillName: "openclaw-workflow-planner",
		ideaName: "workflow planner",
		problem: "Planning flow is not productized yet.",
		requestedOutcome:
			"Ship an OpenClaw planner plugin with an explicit lifecycle.",
		ownerSurface: "plugin package",
	});
	await tool.execute("call-b", {
		action: "research_attach",
		command: "attach research",
		commandName: "plan_workflow",
		skillName: "openclaw-workflow-research",
		ideaName: "workflow planner",
		researchSummary: "The repo already has a donor orchestration pattern.",
		valueAssessment: "high",
		riskAssessment: "safe",
		existingCoverage: "partial",
		fitAssessment: "Fits the current repository direction.",
		sourcesChecked: ["repo canon", "official OpenClaw docs"],
	});
	await tool.execute("call-c", {
		action: "idea_gate",
		command: "run idea gate",
		commandName: "plan_workflow",
		skillName: "openclaw-workflow-research",
		ideaName: "workflow planner",
	});
	await tool.execute("call-d", {
		action: "design_prepare",
		command: "prepare design",
		commandName: "plan_workflow",
		skillName: "openclaw-workflow-planner",
		ideaName: "workflow planner",
		targetSurface: "plugin package",
		constraints: [
			"Keep WORKFLOW_PLAN.md as the only persisted state file.",
			"Preserve migration-safe hydration for older planner files.",
		],
		selectedApproach:
			"Introduce a persisted lane-1 design record before plan creation.",
		alternatives: [
			"Keep skipping directly from idea_gate to plan_create.",
			"Infer design implicitly from plan text.",
		],
		verificationStrategy:
			"Cover design gating, pointer rebuild, and downstream reset behavior with tests.",
	});
	await tool.execute("call-e", {
		action: "plan_create",
		command: "create plan",
		commandName: "plan_workflow",
		skillName: "openclaw-workflow-planner",
		ideaName: "workflow planner",
	});
}

function createFlowContext(input: {
	plannerFilePath: string;
	revision: string;
	state: Awaited<ReturnType<typeof loadPlannerState>>["state"];
}): FlowContext {
	return {
		filePath: input.plannerFilePath,
		state: input.state,
		revision: input.revision,
		pluginConfig: {
			plannerFilePath: input.plannerFilePath,
		},
		save: (nextState, pluginConfig) =>
			savePlannerState(nextState, {
				...pluginConfig,
				expectedRevision: input.revision,
			}),
	};
}

const briefParams: PlannerToolParams = {
	action: "implementation_brief",
	command: "build brief",
	commandName: "implementation_handoff",
	skillName: "openclaw-workflow-implementer",
	ideaName: "workflow planner",
};

describe("workflow planner action concurrency", () => {
	it("rejects a stale task_done write after implementation_brief regenerates from the same loaded revision", async () => {
		const { plannerFilePath, tool } = await createTool();

		await seedAcceptedIdea(tool);
		await tool.execute("call-f", briefParams);
		const snapshot = JSON.parse(
			(
				await tool.execute("call-g", {
					action: "plan_snapshot",
					command: "show plan",
					commandName: "plan_workflow",
					skillName: "openclaw-workflow-planner",
					ideaName: "workflow planner",
				})
			).content[0].text,
		);
		const taskId = snapshot.idea.tasks[0].id;
		const firstLoad = await loadPlannerState({ plannerFilePath });
		const secondLoad = await loadPlannerState({ plannerFilePath });

		await handleImplementationBrief(
			createFlowContext({
				plannerFilePath,
				revision: firstLoad.revision,
				state: firstLoad.state,
			}),
			briefParams,
			"workflow planner",
		);

		await expect(
			handleTaskDone(
				createFlowContext({
					plannerFilePath,
					revision: secondLoad.revision,
					state: secondLoad.state,
				}),
				{
					action: "task_done",
					command: "complete task",
					commandName: "implementation_handoff",
					skillName: "openclaw-workflow-implementer",
					ideaName: "workflow planner",
					taskId,
				},
				"workflow planner",
			),
		).rejects.toBeInstanceOf(PlannerConcurrentModificationError);

		const reloaded = await loadPlannerState({ plannerFilePath });
		const persistedIdea = reloaded.state.ideas[0];

		expect(
			persistedIdea?.executionBriefs
				?.filter((brief) => brief.status === "fresh")
				.at(-1)?.revision,
		).toBe(2);
		expect(persistedIdea?.tasks.find((task) => task.id === taskId)?.done).toBe(
			false,
		);
	});

	it("rejects a stale task_add write after implementation_brief regenerates from the same loaded revision", async () => {
		const { plannerFilePath, tool } = await createTool();

		await seedAcceptedIdea(tool);
		await tool.execute("call-h", briefParams);
		const firstLoad = await loadPlannerState({ plannerFilePath });
		const secondLoad = await loadPlannerState({ plannerFilePath });
		const manualTaskText = "add manual task after stale load";

		await handleImplementationBrief(
			createFlowContext({
				plannerFilePath,
				revision: firstLoad.revision,
				state: firstLoad.state,
			}),
			briefParams,
			"workflow planner",
		);

		await expect(
			handleTaskAdd(
				createFlowContext({
					plannerFilePath,
					revision: secondLoad.revision,
					state: secondLoad.state,
				}),
				{
					action: "task_add",
					command: "add task",
					commandName: "implementation_handoff",
					skillName: "openclaw-workflow-implementer",
					ideaName: "workflow planner",
					taskText: manualTaskText,
				},
				"workflow planner",
			),
		).rejects.toBeInstanceOf(PlannerConcurrentModificationError);

		const reloaded = await loadPlannerState({ plannerFilePath });
		const persistedIdea = reloaded.state.ideas[0];

		expect(
			persistedIdea?.executionBriefs
				?.filter((brief) => brief.status === "fresh")
				.at(-1)?.revision,
		).toBe(2);
		expect(
			persistedIdea?.tasks.some((task) => task.text === manualTaskText),
		).toBe(false);
	});
});
