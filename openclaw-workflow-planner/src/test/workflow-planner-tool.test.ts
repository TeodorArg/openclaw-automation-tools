import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createWorkflowPlannerTool } from "../workflow-planner-tool.js";

async function createTool() {
	const tempDir = await mkdtemp(join(tmpdir(), "workflow-planner-test-"));
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
}

describe("createWorkflowPlannerTool", () => {
	it("creates an idea before research begins", async () => {
		const { tool } = await createTool();
		const result = await tool.execute("call-1", {
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
		const payload = JSON.parse(result.content[0].text);

		expect(payload.idea.status).toBe("draft");
		expect(payload.idea.problem).toContain("not productized");
	});

	it("attaches typed research and accepts the idea through idea gate", async () => {
		const { tool } = await createTool();

		await tool.execute("call-2a", {
			action: "idea_create",
			command: "create idea",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
			problem: "Planning flow is not productized yet.",
			requestedOutcome:
				"Ship an OpenClaw planner plugin with an explicit lifecycle.",
		});
		await tool.execute("call-2b", {
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
		const result = await tool.execute("call-2c", {
			action: "idea_gate",
			command: "run idea gate",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-research",
			ideaName: "workflow planner",
		});
		const payload = JSON.parse(result.content[0].text);

		expect(payload.decision).toBe("accepted");
		expect(payload.nextSuggestedAction).toBe("plan_create");
	});

	it("creates and refreshes a canonical accepted plan", async () => {
		const { tool } = await createTool();

		await seedAcceptedIdea(tool);

		const createResult = await tool.execute("call-3a", {
			action: "plan_create",
			command: "create plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
			currentSlice: "Define the planner runtime contract.",
		});
		const createPayload = JSON.parse(createResult.content[0].text);
		const refreshResult = await tool.execute("call-3b", {
			action: "plan_refresh",
			command: "refresh plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
			acceptanceTarget: "Planner contract is implemented and verified.",
		});
		const refreshPayload = JSON.parse(refreshResult.content[0].text);

		expect(createPayload.plan.currentSlice).toContain("runtime contract");
		expect(refreshPayload.plan.acceptanceTarget).toContain(
			"implemented and verified",
		);
	});

	it("lists ideas and returns a persisted idea record", async () => {
		const { tool } = await createTool();

		await seedAcceptedIdea(tool);

		const listResult = await tool.execute("call-4a", {
			action: "idea_list",
			command: "list ideas",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
		});
		const listPayload = JSON.parse(listResult.content[0].text);
		const getResult = await tool.execute("call-4b", {
			action: "idea_get",
			command: "get idea",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-research",
			ideaName: "workflow planner",
		});
		const getPayload = JSON.parse(getResult.content[0].text);

		expect(listPayload.ideas).toHaveLength(1);
		expect(getPayload.idea.slug).toBe("workflow-planner");
	});

	it("tracks manual tasks and preserves them across plan refresh", async () => {
		const { tool } = await createTool();

		await seedAcceptedIdea(tool);
		await tool.execute("call-5a", {
			action: "plan_create",
			command: "create plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const addResult = await tool.execute("call-5b", {
			action: "task_add",
			command: "add task",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
			taskText: "capture user-facing examples",
		});
		const addPayload = JSON.parse(addResult.content[0].text);
		await tool.execute("call-5c", {
			action: "plan_refresh",
			command: "refresh plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const snapshot = await tool.execute("call-5d", {
			action: "plan_snapshot",
			command: "show plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const payload = JSON.parse(snapshot.content[0].text);

		expect(addPayload.addedTask.origin).toBe("manual");
		expect(
			payload.idea.tasks.some(
				(task: { text: string }) =>
					task.text === "capture user-facing examples",
			),
		).toBe(true);
	});

	it("marks tasks done by stable task id and syncs persisted plan checklist state", async () => {
		const { plannerFilePath, tool } = await createTool();

		await seedAcceptedIdea(tool);
		await tool.execute("call-6a", {
			action: "plan_create",
			command: "create plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const snapshotBefore = await tool.execute("call-6b", {
			action: "plan_snapshot",
			command: "show plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const snapshotBeforePayload = JSON.parse(snapshotBefore.content[0].text);
		const taskId = snapshotBeforePayload.idea.tasks[0].id;
		const taskText = snapshotBeforePayload.idea.tasks[0].text;

		await tool.execute("call-6c", {
			action: "task_done",
			command: "complete task",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
			taskId,
		});
		const snapshotAfter = await tool.execute("call-6d", {
			action: "idea_get",
			command: "get idea",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
		});
		const snapshotAfterPayload = JSON.parse(snapshotAfter.content[0].text);
		const persistedMarkdown = await readFile(plannerFilePath, "utf8");
		const reloadedTool = createWorkflowPlannerTool({
			pluginConfig: {
				plannerFilePath,
			},
		});
		const reloadedSnapshot = await reloadedTool.execute("call-6e", {
			action: "idea_get",
			command: "get idea",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
		});
		const reloadedPayload = JSON.parse(reloadedSnapshot.content[0].text);

		expect(
			snapshotAfterPayload.idea.tasks.find(
				(task: { id: string }) => task.id === taskId,
			).done,
		).toBe(true);
		expect(persistedMarkdown).toContain(
			`- [x] ${taskText} (\`${taskId}\`, generated)`,
		);
		expect(
			reloadedPayload.idea.plan.planBlocks.some(
				(block: { checklist: Array<{ id: string; done: boolean }> }) =>
					block.checklist.some(
						(task: { id: string; done: boolean }) =>
							task.id === taskId && task.done,
					),
			),
		).toBe(true);
	});

	it("derives implementation brief from accepted plan and open tasks", async () => {
		const { plannerFilePath, tool } = await createTool();

		await seedAcceptedIdea(tool);
		await tool.execute("call-7a", {
			action: "plan_create",
			command: "create plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
			currentSlice: "Build the next bounded runtime slice.",
		});
		const briefResult = await tool.execute("call-7b", {
			action: "implementation_brief",
			command: "build brief",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
		});
		const briefPayload = JSON.parse(briefResult.content[0].text);
		const markdown = await readFile(plannerFilePath, "utf8");

		expect(briefPayload.currentSlice).toContain("bounded runtime slice");
		expect(Array.isArray(briefPayload.taskRefs)).toBe(true);
		expect(markdown).toContain("# Workflow Planner");
	});

	it("closes an idea with an explicit outcome note", async () => {
		const { tool } = await createTool();

		await seedAcceptedIdea(tool);
		const result = await tool.execute("call-8", {
			action: "idea_close",
			command: "close idea",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
			closeNote: "Initial product contract slice is complete.",
		});
		const payload = JSON.parse(result.content[0].text);

		expect(payload.closeNote).toContain("product contract slice");
	});

	it("rejects plan creation before the idea is accepted", async () => {
		const { tool } = await createTool();

		await tool.execute("call-9a", {
			action: "idea_create",
			command: "create idea",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
			problem: "Planning flow is not productized yet.",
			requestedOutcome:
				"Ship an OpenClaw planner plugin with an explicit lifecycle.",
		});

		await expect(
			tool.execute("call-9b", {
				action: "plan_create",
				command: "create plan",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-planner",
				ideaName: "workflow planner",
			}),
		).rejects.toThrow("must be accepted");
	});

	it("rejects action calls from the wrong bundled skill", async () => {
		const { tool } = await createTool();

		await expect(
			tool.execute("call-10", {
				action: "implementation_brief",
				command: "build brief",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-research",
				ideaName: "workflow planner",
			}),
		).rejects.toThrow(
			"openclaw-workflow-research does not support action implementation_brief",
		);
	});
});
