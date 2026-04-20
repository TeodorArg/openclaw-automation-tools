import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateIdeaGate } from "../runtime/planning/idea-gate.js";
import { createWorkflowPlannerTool } from "../runtime/planning/workflow-planner-tool.js";
import {
	parsePlannerMarkdown,
	renderPlannerMarkdown,
} from "../runtime/state/planner-file.js";

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

async function completeAllTasks(
	tool: ReturnType<typeof createWorkflowPlannerTool>,
	taskCount: number,
) {
	for (let taskIndex = 1; taskIndex <= taskCount; taskIndex += 1) {
		await tool.execute(`call-task-${taskIndex}`, {
			action: "task_done",
			command: "complete task",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
			taskIndex,
		});
	}
}

describe("createWorkflowPlannerTool", () => {
	it("rejects unsupported skill names before planner state is touched", async () => {
		const { tool } = await createTool();

		await expect(
			tool.execute("call-0", {
				action: "idea_list",
				command: "list ideas",
				commandName: "plan_workflow",
				skillName: "unsupported-skill",
			}),
		).rejects.toThrow(
			"workflow_planner_action only accepts requests from bundled openclaw-workflow-planner skills.",
		);
	});

	it("creates an idea before research begins", async () => {
		const { plannerFilePath, tool } = await createTool();
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
		const persistedMarkdown = await readFile(plannerFilePath, "utf8");
		const parsed = parsePlannerMarkdown(persistedMarkdown);

		expect(payload.idea.status).toBe("draft");
		expect(payload.idea.problem).toContain("not productized");
		expect(payload.idea.slug).toBe("workflow-planner");
		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"].currentPhase,
		).toBe("intake");
		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"]
				.aggregateStatus,
		).toBe("active");
		expect(
			parsed.controlPlane.currentPointers.byRequestId["req_workflow-planner"]
				.currentPlanId,
		).toBeUndefined();
	});

	it("updates an existing idea without resetting lifecycle state", async () => {
		const { tool } = await createTool();

		const first = await tool.execute("call-2u-a", {
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
		const firstPayload = JSON.parse(first.content[0].text);
		await tool.execute("call-2u-b", {
			action: "idea_create",
			command: "update idea",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
			problem: "Planning flow needs a hardened plugin runtime.",
			requestedOutcome:
				"Ship an OpenClaw planner plugin with an explicit lifecycle.",
			ownerSurface: "production plugin package",
			notes: "Keep public tool contract stable during Slice 1.",
			links: [
				"https://docs.openclaw.ai",
				"https://github.com/openclaw/openclaw",
			],
		});
		const getResult = await tool.execute("call-2u-c", {
			action: "idea_get",
			command: "get idea",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const getPayload = JSON.parse(getResult.content[0].text);

		expect(getPayload.idea.problem).toContain("hardened plugin runtime");
		expect(getPayload.idea.ownerSurface).toBe("production plugin package");
		expect(getPayload.idea.notes).toContain("Slice 1");
		expect(getPayload.idea.links).toHaveLength(2);
		expect(getPayload.idea.createdAt).toBe(firstPayload.idea.createdAt);
		expect(getPayload.idea.status).toBe("draft");
		expect(getPayload.controlPlane.requestId).toBe("req_workflow-planner");
		expect(getPayload.controlPlane.counts.requests).toBe(1);
	});

	it("resets downstream lifecycle state when the core idea request changes", async () => {
		const { tool } = await createTool();

		await seedAcceptedIdea(tool);
		await tool.execute("call-2r-a", {
			action: "plan_create",
			command: "create plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		await tool.execute("call-2r-b", {
			action: "task_add",
			command: "add task",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
			taskText: "capture user-facing examples",
		});
		const resetResult = await tool.execute("call-2r-c", {
			action: "idea_create",
			command: "retarget idea",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
			problem:
				"Planning flow needs to support a narrower package release slice.",
			requestedOutcome:
				"Ship a tighter planner runtime contract for a release-ready package.",
			ownerSurface: "release plugin package",
		});
		const resetPayload = JSON.parse(resetResult.content[0].text);

		expect(resetPayload.idea.status).toBe("draft");
		expect(resetPayload.idea.research).toBeUndefined();
		expect(resetPayload.idea.ideaGate).toBeUndefined();
		expect(resetPayload.idea.plan).toBeUndefined();
		expect(resetPayload.idea.tasks).toEqual([]);
		expect(resetPayload.idea.closeNote).toBeUndefined();
		expect(resetPayload.idea.problem).toContain(
			"narrower package release slice",
		);
		expect(resetPayload.idea.requestedOutcome).toContain(
			"release-ready package",
		);
		expect(
			resetPayload.controlPlane.requestRuntime.currentResearchId,
		).toBeUndefined();
		expect(
			resetPayload.controlPlane.requestRuntime.currentPlanId,
		).toBeUndefined();
	});

	it("attaches typed research and accepts the idea through idea gate", async () => {
		const { plannerFilePath, tool } = await createTool();

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
		const persisted = parsePlannerMarkdown(
			await readFile(plannerFilePath, "utf8"),
		);

		expect(payload.decision).toBe("accepted");
		expect(payload.nextSuggestedAction).toBe("plan_create");
		expect(
			persisted.controlPlane.requestRuntime["req_workflow-planner"]
				.currentResearchId,
		).toBe("research_workflow-planner");
		expect(
			persisted.controlPlane.requestRuntime["req_workflow-planner"]
				.currentPhase,
		).toBe("design");
		expect(
			persisted.controlPlane.entityRegistry.records["research_workflow-planner"]
				.entityType,
		).toBe("PlannerResearch");
	});

	it("creates and refreshes a canonical accepted plan", async () => {
		const { plannerFilePath, tool } = await createTool();

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
		const persistedAfterCreate = parsePlannerMarkdown(
			await readFile(plannerFilePath, "utf8"),
		);
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
		expect(
			persistedAfterCreate.controlPlane.requestRuntime["req_workflow-planner"]
				.currentPlanId,
		).toBe("plan_workflow-planner");
		expect(
			persistedAfterCreate.controlPlane.requestRuntime["req_workflow-planner"]
				.aggregateVerdict,
		).toBe("ready_for_review");
		expect(
			persistedAfterCreate.controlPlane.requestRuntime["req_workflow-planner"]
				.currentPhase,
		).toBe("planning");
		expect(
			Object.keys(persistedAfterCreate.controlPlane.artifactRegistry.records),
		).toHaveLength(0);
		expect(
			persistedAfterCreate.controlPlane.requestRuntime["req_workflow-planner"]
				.currentBriefBySlice,
		).toEqual({});
		expect(
			persistedAfterCreate.controlPlane.currentPointers.byRequestId[
				"req_workflow-planner"
			].currentPlanId,
		).toBe("plan_workflow-planner");
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
		expect(listPayload.controlPlane.counts.requests).toBe(1);
		expect(getPayload.idea.slug).toBe("workflow-planner");
		expect(getPayload.controlPlane.requestId).toBe("req_workflow-planner");
		expect(getPayload.controlPlane.requestRuntime.currentResearchId).toBe(
			"research_workflow-planner",
		);
	});

	it("tracks manual tasks and preserves them across plan refresh", async () => {
		const { plannerFilePath, tool } = await createTool();

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
		const parsed = parsePlannerMarkdown(
			await readFile(plannerFilePath, "utf8"),
		);

		expect(addPayload.addedTask.origin).toBe("manual");
		expect(
			payload.idea.tasks.some(
				(task: { text: string }) =>
					task.text === "capture user-facing examples",
			),
		).toBe(true);
		expect(payload.controlPlane.currentPointers.currentTaskSetId).toBe(
			"tasks_workflow-planner",
		);
		expect(
			Object.keys(parsed.controlPlane.artifactRegistry.records),
		).toHaveLength(0);
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
		expect(reloadedPayload.controlPlane.requestRuntime.requestId).toBe(
			"req_workflow-planner",
		);
		expect(reloadedPayload.controlPlane.currentPointers.currentTaskSetId).toBe(
			"tasks_workflow-planner",
		);
		expect(reloadedPayload.controlPlane.linkedArtifacts).toEqual([]);
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
		const snapshotBefore = await tool.execute("call-7b", {
			action: "plan_snapshot",
			command: "show plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const snapshotBeforePayload = JSON.parse(snapshotBefore.content[0].text);
		const completedTaskId = snapshotBeforePayload.idea.tasks[0].id;
		const completedTaskText = snapshotBeforePayload.idea.tasks[0].text;

		expect(
			snapshotBeforePayload.controlPlane.requestRuntime.currentBriefBySlice,
		).toEqual({});
		expect(
			snapshotBeforePayload.controlPlane.currentPointers.currentBriefBySlice,
		).toEqual({});

		await tool.execute("call-7c", {
			action: "task_done",
			command: "complete task",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
			taskId: completedTaskId,
		});
		const briefResult = await tool.execute("call-7d", {
			action: "implementation_brief",
			command: "build brief",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
		});
		const briefPayload = JSON.parse(briefResult.content[0].text);
		const markdown = await readFile(plannerFilePath, "utf8");
		const parsed = parsePlannerMarkdown(markdown);

		expect(briefPayload.currentSlice).toContain("bounded runtime slice");
		expect(Array.isArray(briefPayload.taskRefs)).toBe(true);
		expect(Array.isArray(briefPayload.openTasks)).toBe(true);
		expect(briefPayload.remainingOpenTaskCount).toBe(5);
		expect(briefPayload.remainingOpenTaskGuidance).toContain(
			"5 open tasks remain.",
		);
		expect(briefPayload.remainingOpenTaskGuidance).toContain("taskId=");
		expect(briefPayload.taskRefs).not.toContain(completedTaskId);
		expect(
			briefPayload.openTasks.some(
				(task: { id: string }) => task.id === completedTaskId,
			),
		).toBe(false);
		expect(briefPayload.scope.join("\n")).not.toContain(completedTaskText);
		expect(briefPayload.scope.join("\n")).toMatch(
			/Open task #\d+: .* \(.+\) \[use taskId=.+ or taskIndex=\d+\]/,
		);
		expect(
			briefPayload.openTasks.every(
				(task: {
					id: string;
					taskIndex: number;
					selectorHint: string;
					text: string;
					origin: string;
					done: boolean;
				}) =>
					typeof task.id === "string" &&
					Number.isInteger(task.taskIndex) &&
					task.taskIndex >= 1 &&
					task.selectorHint ===
						`taskId=${task.id} | taskIndex=${task.taskIndex}` &&
					typeof task.text === "string" &&
					typeof task.origin === "string" &&
					task.done === false,
			),
		).toBe(true);
		expect(briefPayload.openTasks[0]).toHaveProperty("taskIndex");
		expect(briefPayload.openTasks[0]).toHaveProperty("selectorHint");
		expect(markdown).toContain("# Workflow Planner");
		expect(
			briefPayload.controlPlane.requestRuntime.currentBriefBySlice,
		).toEqual({});
		expect(
			briefPayload.controlPlane.currentPointers.currentBriefBySlice,
		).toEqual({});
		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"]
				.currentBriefBySlice,
		).toEqual({});
		expect(
			parsed.controlPlane.currentPointers.byRequestId["req_workflow-planner"]
				.currentBriefBySlice,
		).toEqual({});
		expect(
			Object.keys(parsed.controlPlane.artifactRegistry.records),
		).toHaveLength(0);
	});

	it("returns close guidance from implementation_brief when no open tasks remain", async () => {
		const { tool } = await createTool();

		await seedAcceptedIdea(tool);
		await tool.execute("call-7e0", {
			action: "plan_create",
			command: "create plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		await completeAllTasks(tool, 6);

		const briefResult = await tool.execute("call-7e1", {
			action: "implementation_brief",
			command: "build brief",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
		});
		const briefPayload = JSON.parse(briefResult.content[0].text);

		expect(briefPayload.remainingOpenTaskCount).toBe(0);
		expect(briefPayload.taskRefs).toEqual([]);
		expect(briefPayload.openTasks).toEqual([]);
		expect(briefPayload.remainingOpenTaskGuidance).toBe(
			"No open tasks remain. Verify the slice against doneWhen, then use idea_close to record the delivered outcome.",
		);
	});

	it("returns close guidance from task_done when the last open task is completed", async () => {
		const { tool } = await createTool();

		await seedAcceptedIdea(tool);
		await tool.execute("call-7f0", {
			action: "plan_create",
			command: "create plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const snapshot = await tool.execute("call-7f1", {
			action: "plan_snapshot",
			command: "show plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const payload = JSON.parse(snapshot.content[0].text);
		const finalTaskId = payload.idea.tasks[payload.idea.tasks.length - 1].id;

		for (let index = 0; index < payload.idea.tasks.length - 1; index += 1) {
			await tool.execute(`call-7f-pre-${index + 1}`, {
				action: "task_done",
				command: "complete task",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				taskId: payload.idea.tasks[index].id,
			});
		}

		const doneResult = await tool.execute("call-7f2", {
			action: "task_done",
			command: "complete task",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
			taskId: finalTaskId,
		});
		const donePayload = JSON.parse(doneResult.content[0].text);

		expect(donePayload.completedTaskId).toBe(finalTaskId);
		expect(donePayload.remainingOpenTaskCount).toBe(0);
		expect(donePayload.remainingOpenTaskGuidance).toBe(
			"No open tasks remain. Verify the slice against doneWhen, then use idea_close to record the delivered outcome.",
		);
	});

	it("closes an idea with an explicit outcome note and marks controlPlane complete", async () => {
		const { plannerFilePath, tool } = await createTool();

		await seedAcceptedIdea(tool);
		await tool.execute("call-8a", {
			action: "plan_create",
			command: "create plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		await completeAllTasks(tool, 6);
		const result = await tool.execute("call-8b", {
			action: "idea_close",
			command: "close idea",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
			closeNote:
				"Initial product contract slice is complete and verified against the accepted plan.",
		});
		const payload = JSON.parse(result.content[0].text);
		const parsed = parsePlannerMarkdown(
			await readFile(plannerFilePath, "utf8"),
		);

		expect(payload.closeNote).toContain("accepted plan");
		expect(parsed.ideas[0].status).toBe("closed");
		expect(parsed.ideas[0].closeNote).toContain("accepted plan");
		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"].currentPhase,
		).toBe("done");
		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"]
				.aggregateStatus,
		).toBe("completed");
		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"]
				.aggregateVerdict,
		).toBe("done");
		expect(
			parsed.controlPlane.currentPointers.byRequestId["req_workflow-planner"]
				.currentPlanId,
		).toBe("plan_workflow-planner");
	});

	it("rejects idea_close before accepted-plan completion", async () => {
		const { tool } = await createTool();

		await seedAcceptedIdea(tool);
		await expect(
			tool.execute("call-8c", {
				action: "idea_close",
				command: "close idea",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				closeNote: "done",
			}),
		).rejects.toThrow(
			"requires an accepted idea with a current plan before completion can be recorded",
		);

		await tool.execute("call-8d", {
			action: "plan_create",
			command: "create plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		await expect(
			tool.execute("call-8e", {
				action: "idea_close",
				command: "close idea",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				closeNote: "done",
			}),
		).rejects.toThrow("requires all tasks to be complete");
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

	it("returns positive non-accepted idea-gate outcomes for needs_research and deferred", () => {
		const needsResearch = evaluateIdeaGate({
			ideaName: "workflow planner",
			problem: "Planning flow is not productized yet.",
			requestedOutcome:
				"Ship an OpenClaw planner plugin with an explicit lifecycle.",
			research: {
				summary: "The direction is promising but still needs more validation.",
				valueAssessment: "medium",
				riskAssessment: "caution",
				existingCoverage: "partial",
				fitAssessment:
					"It likely fits, but the operating model needs more proof.",
				sourcesChecked: ["repo canon"],
			},
		});
		const deferred = evaluateIdeaGate({
			ideaName: "workflow planner",
			problem: "Planning flow is not productized yet.",
			requestedOutcome:
				"Ship an OpenClaw planner plugin with an explicit lifecycle.",
			research: {
				summary: "The idea is valid but not worth prioritizing right now.",
				valueAssessment: "low",
				riskAssessment: "safe",
				existingCoverage: "partial",
				fitAssessment: "It fits, but the opportunity cost is too high today.",
				sourcesChecked: ["repo canon"],
			},
		});

		expect(needsResearch.decision).toBe("needs_research");
		expect(needsResearch.nextSuggestedAction).toBe("research_attach");
		expect(deferred.decision).toBe("deferred");
		expect(deferred.nextSuggestedAction).toBe("narrow_scope");
	});

	it("returns rejected idea-gate decisions for unsafe research", () => {
		const result = evaluateIdeaGate({
			ideaName: "workflow planner",
			problem: "Planning flow is not productized yet.",
			requestedOutcome:
				"Ship an OpenClaw planner plugin with an explicit lifecycle.",
			research: {
				summary: "The idea currently has unacceptable operational risk.",
				valueAssessment: "high",
				riskAssessment: "unsafe",
				existingCoverage: "partial",
				fitAssessment: "The desired surface is plausible, but not yet safe.",
				sourcesChecked: ["repo canon"],
			},
		});

		expect(result.decision).toBe("rejected");
		expect(result.nextSuggestedAction).toBe("stop");
	});

	it("supports legacy task_done by 1-based taskIndex", async () => {
		const { plannerFilePath, tool } = await createTool();

		await seedAcceptedIdea(tool);
		await tool.execute("call-11a", {
			action: "plan_create",
			command: "create plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const doneResult = await tool.execute("call-11b", {
			action: "task_done",
			command: "complete task",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
			taskIndex: 1,
		});
		const donePayload = JSON.parse(doneResult.content[0].text);
		const snapshot = await tool.execute("call-11c", {
			action: "idea_get",
			command: "get idea",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
		});
		const payload = JSON.parse(snapshot.content[0].text);
		const parsed = parsePlannerMarkdown(
			await readFile(plannerFilePath, "utf8"),
		);

		expect(donePayload.completedTaskIndex).toBe(1);
		expect(donePayload.completedTaskId).toBe(payload.idea.tasks[0].id);
		expect(donePayload.targetSelectorHint).toBe(
			`taskId=${payload.idea.tasks[0].id} | taskIndex=1`,
		);
		expect(donePayload.completedTaskSelectorHint).toBe(
			`taskId=${payload.idea.tasks[0].id} | taskIndex=1`,
		);
		expect(donePayload.completedTask).toMatchObject({
			id: payload.idea.tasks[0].id,
			done: true,
		});
		expect(donePayload.remainingOpenTaskCount).toBe(
			payload.idea.tasks.length - 1,
		);
		expect(donePayload.remainingOpenTaskGuidance).toContain(
			`${payload.idea.tasks.length - 1} open tasks remain`,
		);
		expect(donePayload.remainingOpenTaskGuidance).toContain(
			`taskId=${payload.idea.tasks[1].id}`,
		);
		expect(payload.idea.tasks[0].done).toBe(true);
		expect(
			payload.idea.plan.planBlocks.some(
				(block: { checklist: Array<{ done: boolean }> }) =>
					block.checklist.some((task: { done: boolean }) => task.done),
			),
		).toBe(true);
		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"]
				.currentTaskSetId,
		).toBe("tasks_workflow-planner");
	});

	it("removes a task by stable taskId and removes synced checklist entries", async () => {
		const { plannerFilePath, tool } = await createTool();

		await seedAcceptedIdea(tool);
		await tool.execute("call-11rm-a", {
			action: "plan_create",
			command: "create plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const before = await tool.execute("call-11rm-b", {
			action: "plan_snapshot",
			command: "show plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const beforePayload = JSON.parse(before.content[0].text);
		const taskId = beforePayload.idea.tasks[0].id;
		const taskText = beforePayload.idea.tasks[0].text;

		const removeResult = await tool.execute("call-11rm-c", {
			action: "task_remove",
			command: "remove task",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
			taskId,
		});
		const removePayload = JSON.parse(removeResult.content[0].text);
		const after = await tool.execute("call-11rm-d", {
			action: "idea_get",
			command: "get idea",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
		});
		const afterPayload = JSON.parse(after.content[0].text);
		const persistedMarkdown = await readFile(plannerFilePath, "utf8");

		expect(removePayload.targetTaskId).toBe(taskId);
		expect(removePayload.targetTaskIndex).toBe(1);
		expect(removePayload.targetSelectorHint).toBe(
			`taskId=${taskId} | taskIndex=1`,
		);
		expect(removePayload.targetTask).toMatchObject({
			id: taskId,
			done: false,
		});
		expect(removePayload.removedTaskId).toBe(taskId);
		expect(removePayload.removedTaskIndex).toBe(1);
		expect(removePayload.removedTaskSelectorHint).toBe(
			`taskId=${taskId} | taskIndex=1`,
		);
		expect(removePayload.remainingOpenTaskCount).toBe(
			afterPayload.idea.tasks.length,
		);
		expect(removePayload.remainingOpenTaskGuidance).toContain(
			`${afterPayload.idea.tasks.length} open tasks remain`,
		);
		expect(removePayload.remainingOpenTaskGuidance).toContain(
			`taskId=${afterPayload.idea.tasks[0].id}`,
		);
		expect(removePayload.removedTask.id).toBe(taskId);
		expect(
			afterPayload.idea.tasks.find(
				(task: { id: string }) => task.id === taskId,
			),
		).toBeUndefined();
		expect(persistedMarkdown).not.toContain(taskText);
		expect(
			afterPayload.idea.plan.planBlocks.some(
				(block: { checklist: Array<{ id: string }> }) =>
					block.checklist.some((task: { id: string }) => task.id === taskId),
			),
		).toBe(false);
	});

	it("reopens a completed task by stable taskId and keeps checklist sync", async () => {
		const { plannerFilePath, tool } = await createTool();

		await seedAcceptedIdea(tool);
		await tool.execute("call-11ro-a", {
			action: "plan_create",
			command: "create plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const before = await tool.execute("call-11ro-b", {
			action: "plan_snapshot",
			command: "show plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const beforePayload = JSON.parse(before.content[0].text);
		const taskId = beforePayload.idea.tasks[0].id;
		const taskText = beforePayload.idea.tasks[0].text;

		await tool.execute("call-11ro-c", {
			action: "task_done",
			command: "complete task",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
			taskId,
		});
		const reopenResult = await tool.execute("call-11ro-d", {
			action: "task_reopen",
			command: "reopen task",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
			taskId,
		});
		const reopenPayload = JSON.parse(reopenResult.content[0].text);
		const after = await tool.execute("call-11ro-e", {
			action: "idea_get",
			command: "get idea",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
		});
		const afterPayload = JSON.parse(after.content[0].text);
		const persistedMarkdown = await readFile(plannerFilePath, "utf8");

		expect(reopenPayload.reopenedTaskId).toBe(taskId);
		expect(reopenPayload.reopenedTaskIndex).toBe(1);
		expect(reopenPayload.targetSelectorHint).toBe(
			`taskId=${taskId} | taskIndex=1`,
		);
		expect(reopenPayload.reopenedTaskSelectorHint).toBe(
			`taskId=${taskId} | taskIndex=1`,
		);
		expect(reopenPayload.reopenedTask).toMatchObject({
			id: taskId,
			done: false,
		});
		expect(reopenPayload.remainingOpenTaskCount).toBe(
			afterPayload.idea.tasks.length,
		);
		expect(reopenPayload.remainingOpenTaskGuidance).toContain(
			`${afterPayload.idea.tasks.length} open tasks remain`,
		);
		expect(reopenPayload.remainingOpenTaskGuidance).toContain(
			`taskId=${taskId}`,
		);
		expect(
			afterPayload.idea.tasks.find((task: { id: string }) => task.id === taskId)
				?.done,
		).toBe(false);
		expect(persistedMarkdown).toContain(
			`- [ ] ${taskText} (\`${taskId}\`, generated)`,
		);
		expect(
			afterPayload.idea.plan.planBlocks.some(
				(block: { checklist: Array<{ id: string; done: boolean }> }) =>
					block.checklist.some(
						(task: { id: string; done: boolean }) =>
							task.id === taskId && !task.done,
					),
			),
		).toBe(true);
	});

	it("preserves completed task state across plan_refresh and keeps checklist synced", async () => {
		const { plannerFilePath, tool } = await createTool();

		await seedAcceptedIdea(tool);
		await tool.execute("call-11r-a", {
			action: "plan_create",
			command: "create plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const snapshotBefore = await tool.execute("call-11r-b", {
			action: "plan_snapshot",
			command: "show plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const beforePayload = JSON.parse(snapshotBefore.content[0].text);
		const taskId = beforePayload.idea.tasks[0].id;
		const taskText = beforePayload.idea.tasks[0].text;
		await tool.execute("call-11r-c", {
			action: "task_done",
			command: "complete task",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
			taskId,
		});
		await tool.execute("call-11r-d", {
			action: "plan_refresh",
			command: "refresh plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const snapshotAfter = await tool.execute("call-11r-e", {
			action: "plan_snapshot",
			command: "show plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const afterPayload = JSON.parse(snapshotAfter.content[0].text);
		const parsed = parsePlannerMarkdown(
			await readFile(plannerFilePath, "utf8"),
		);

		expect(
			afterPayload.idea.tasks.filter(
				(task: { id: string }) => task.id === taskId,
			),
		).toHaveLength(1);
		expect(
			afterPayload.idea.tasks.find((task: { id: string }) => task.id === taskId)
				?.done,
		).toBe(true);
		expect(
			afterPayload.idea.plan.planBlocks.some(
				(block: { checklist: Array<{ id: string; done: boolean }> }) =>
					block.checklist.some(
						(task: { id: string; done: boolean }) =>
							task.id === taskId && task.done,
					),
			),
		).toBe(true);
		expect(
			parsed.ideas[0].tasks.find((task: { id: string }) => task.id === taskId)
				?.done,
		).toBe(true);
		expect(await readFile(plannerFilePath, "utf8")).toContain(
			`- [x] ${taskText} (\`${taskId}\`, generated)`,
		);
	});

	it("does not merge manual tasks into generated checklist items by matching text alone", async () => {
		const { tool } = await createTool();

		await seedAcceptedIdea(tool);
		await tool.execute("call-11t-a", {
			action: "plan_create",
			command: "create plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const beforeSnapshot = await tool.execute("call-11t-b", {
			action: "plan_snapshot",
			command: "show plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const beforePayload = JSON.parse(beforeSnapshot.content[0].text);
		const generatedTask = beforePayload.idea.tasks[0];
		const addResult = await tool.execute("call-11t-c", {
			action: "task_add",
			command: "add task",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
			taskText: generatedTask.text,
		});
		const addPayload = JSON.parse(addResult.content[0].text);

		await tool.execute("call-11t-d", {
			action: "task_done",
			command: "complete task",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
			taskId: addPayload.addedTask.id,
		});
		await tool.execute("call-11t-e", {
			action: "plan_refresh",
			command: "refresh plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const afterSnapshot = await tool.execute("call-11t-f", {
			action: "plan_snapshot",
			command: "show plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const afterPayload = JSON.parse(afterSnapshot.content[0].text);
		const matchingGeneratedTasks = afterPayload.idea.tasks.filter(
			(task: { id: string; text: string; origin: string }) =>
				task.text === generatedTask.text && task.origin === "generated",
		);
		const matchingManualTasks = afterPayload.idea.tasks.filter(
			(task: { id: string; text: string; origin: string; done: boolean }) =>
				task.text === generatedTask.text &&
				task.origin === "manual" &&
				task.id === addPayload.addedTask.id &&
				task.done,
		);
		const refreshedChecklistTask = afterPayload.idea.plan.planBlocks
			.flatMap(
				(block: {
					checklist: Array<{
						id: string;
						text: string;
						origin: string;
						done: boolean;
					}>;
				}) => block.checklist,
			)
			.find((task: { id: string }) => task.id === generatedTask.id);

		expect(matchingGeneratedTasks).toHaveLength(1);
		expect(matchingGeneratedTasks[0].id).toBe(generatedTask.id);
		expect(matchingGeneratedTasks[0].done).toBe(false);
		expect(matchingManualTasks).toHaveLength(1);
		expect(refreshedChecklistTask?.id).toBe(generatedTask.id);
		expect(refreshedChecklistTask?.origin).toBe("generated");
		expect(refreshedChecklistTask?.done).toBe(false);
	});

	it("rejects duplicate plan creation and refresh before plan exists", async () => {
		const { tool } = await createTool();

		await seedAcceptedIdea(tool);
		await tool.execute("call-12a", {
			action: "plan_create",
			command: "create plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});

		await expect(
			tool.execute("call-12b", {
				action: "plan_create",
				command: "create plan again",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-planner",
				ideaName: "workflow planner",
			}),
		).rejects.toThrow("already has a plan");

		const { tool: secondTool } = await createTool();
		await secondTool.execute("call-12c", {
			action: "idea_create",
			command: "create idea",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
			problem: "Planning flow is not productized yet.",
			requestedOutcome:
				"Ship an OpenClaw planner plugin with an explicit lifecycle.",
		});
		await secondTool.execute("call-12d", {
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
		await secondTool.execute("call-12e", {
			action: "idea_gate",
			command: "run idea gate",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-research",
			ideaName: "workflow planner",
		});

		await expect(
			secondTool.execute("call-12f", {
				action: "plan_refresh",
				command: "refresh plan",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-planner",
				ideaName: "workflow planner",
			}),
		).rejects.toThrow("does not have a plan yet");
	});

	it("rejects invalid implementation brief and task completion requests", async () => {
		const { tool } = await createTool();

		await tool.execute("call-13a", {
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
			tool.execute("call-13b", {
				action: "implementation_brief",
				command: "build brief",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
			}),
		).rejects.toThrow("must be accepted and have a canonical plan");

		await seedAcceptedIdea(tool);
		await tool.execute("call-13c", {
			action: "plan_create",
			command: "create plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});

		await expect(
			tool.execute("call-13d", {
				action: "task_done",
				command: "complete task",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				taskId: "missing-task-id",
			}),
		).rejects.toThrow("was not found");

		await expect(
			tool.execute("call-13e", {
				action: "task_done",
				command: "complete task",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				taskIndex: 999,
			}),
		).rejects.toThrow("out of range");
	});

	it("hydrates simple legacy planner state into version 2 controlPlane state", () => {
		const parsed = parsePlannerMarkdown(
			[
				"<!-- openclaw-workflow-planner-state",
				JSON.stringify({
					updatedAt: "2026-04-20T00:00:00.000Z",
					ideas: [
						{
							slug: "workflow-planner",
							name: "workflow planner",
							problem: "Planning flow is not productized yet.",
							requestedOutcome:
								"Ship an OpenClaw planner plugin with an explicit lifecycle.",
							createdAt: "2026-04-20T00:00:00.000Z",
							updatedAt: "2026-04-20T00:00:00.000Z",
							status: "draft",
							tasks: [],
						},
					],
				}),
				"-->",
				"",
				"# Workflow Planner",
			].join("\n"),
		);

		expect(parsed.version).toBe(2);
		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"],
		).toBeDefined();
		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"].currentPhase,
		).toBe("intake");
	});

	it("hydrates rich legacy planner state and preserves round-trip state", () => {
		const legacyMarkdown = [
			"<!-- openclaw-workflow-planner-state",
			JSON.stringify({
				version: 1,
				updatedAt: "2026-04-20T00:00:00.000Z",
				ideas: [
					{
						slug: "workflow-planner",
						name: "workflow planner",
						problem: "Planning flow is not productized yet.",
						requestedOutcome:
							"Ship an OpenClaw planner plugin with an explicit lifecycle.",
						createdAt: "2026-04-20T00:00:00.000Z",
						updatedAt: "2026-04-20T00:00:00.000Z",
						status: "closed",
						ownerSurface: "plugin package",
						research: {
							summary: "The repo already has a donor orchestration pattern.",
							valueAssessment: "high",
							riskAssessment: "safe",
							existingCoverage: "strong",
							fitAssessment: "Fits the current repository direction.",
							sourcesChecked: ["repo canon", "official OpenClaw docs"],
						},
						ideaGate: {
							decision: "accepted",
							reasoning: ["Strong fit and low risk."],
							nextSuggestedAction: "plan_create",
							decidedAt: "2026-04-20T00:00:00.000Z",
						},
						plan: {
							goal: "Ship the planner runtime contract.",
							scope: ["Define runtime state", "Split flows"],
							outOfScope: ["Rewrite public API"],
							acceptanceTarget: "Planner contract is implemented and verified.",
							currentSlice: "Build the next bounded runtime slice.",
							planBlocks: [
								{
									title: "Foundation",
									what: "Persist workflow control-plane state.",
									why: "Need durable orchestration state.",
									evidence: ["planner-state.ts", "planner-file.ts"],
									checklist: [
										{
											id: "generated-persist-workflow-control-plane-state",
											text: "Persist workflow control-plane state",
											origin: "generated",
											done: true,
										},
									],
									doneWhen: "State persists cleanly.",
								},
							],
						},
						tasks: [
							{
								id: "generated-persist-workflow-control-plane-state",
								text: "Persist workflow control-plane state",
								origin: "generated",
								done: true,
							},
						],
						closeNote: "Initial product contract slice is complete.",
					},
				],
			}),
			"-->",
			"",
			"# Workflow Planner",
		].join("\n");
		const parsed = parsePlannerMarkdown(legacyMarkdown);
		const roundTripped = parsePlannerMarkdown(renderPlannerMarkdown(parsed));

		expect(parsed.version).toBe(2);
		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"]
				.currentResearchId,
		).toBe("research_workflow-planner");
		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"].currentPlanId,
		).toBe("plan_workflow-planner");
		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"]
				.currentTaskSetId,
		).toBe("tasks_workflow-planner");
		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"].currentPhase,
		).toBe("done");
		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"]
				.aggregateStatus,
		).toBe("completed");
		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"]
				.aggregateVerdict,
		).toBe("done");
		expect(
			parsed.controlPlane.entityRegistry.records["req_workflow-planner"]
				.entityType,
		).toBe("Request");
		expect(
			parsed.controlPlane.entityRegistry.records["plan_workflow-planner"]
				.entityType,
		).toBe("PlannerPlan");
		expect(
			parsed.controlPlane.entityRegistry.records["tasks_workflow-planner"]
				.entityType,
		).toBe("TaskSet");
		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"]
				.currentBriefBySlice,
		).toEqual({});
		expect(
			parsed.controlPlane.currentPointers.byRequestId["req_workflow-planner"]
				.currentBriefBySlice,
		).toEqual({});
		expect(
			parsed.controlPlane.entityRegistry.records[
				"brief_workflow-planner_build-the-next-bounded-runtime-slice"
			],
		).toBeUndefined();
		expect(
			Object.keys(parsed.controlPlane.artifactRegistry.records),
		).toHaveLength(0);
		expect(
			parsed.controlPlane.currentPointers.byRequestId["req_workflow-planner"]
				.currentPlanId,
		).toBe("plan_workflow-planner");
		expect(roundTripped).toEqual(parsed);
	});

	it("rebuilds stale version 2 controlPlane data from persisted ideas", () => {
		const parsed = parsePlannerMarkdown(
			[
				"<!-- openclaw-workflow-planner-state",
				JSON.stringify({
					version: 2,
					updatedAt: "2026-04-20T00:00:00.000Z",
					ideas: [
						{
							slug: "workflow-planner",
							name: "workflow planner",
							problem: "Planning flow is not productized yet.",
							requestedOutcome:
								"Ship an OpenClaw planner plugin with an explicit lifecycle.",
							createdAt: "2026-04-20T00:00:00.000Z",
							updatedAt: "2026-04-20T00:00:00.000Z",
							status: "accepted",
							research: {
								summary: "The repo already has a donor orchestration pattern.",
								valueAssessment: "high",
								riskAssessment: "safe",
								existingCoverage: "strong",
								fitAssessment: "Fits the current repository direction.",
								sourcesChecked: ["repo canon", "official OpenClaw docs"],
							},
							plan: {
								goal: "Ship the planner runtime contract.",
								scope: ["Define runtime state", "Split flows"],
								outOfScope: ["Rewrite public API"],
								acceptanceTarget:
									"Planner contract is implemented and verified.",
								currentSlice: "Build the next bounded runtime slice.",
								planBlocks: [],
							},
							tasks: [
								{
									id: "generated-define-runtime-state",
									text: "define runtime state",
									origin: "generated",
									done: false,
								},
							],
						},
					],
					controlPlane: {
						requestRuntime: {
							"req_workflow-planner": {
								requestId: "req_workflow-planner",
								title: "stale title",
								currentPhase: "done",
								aggregateStatus: "completed",
								aggregateVerdict: "done",
								currentResearchId: "research_workflow-planner",
								currentDesignId: "design_workflow-planner",
								currentPlanId: "plan_workflow-planner",
								currentTaskSetId: "tasks_workflow-planner",
								currentBriefBySlice: {
									"Build the next bounded runtime slice.":
										"brief_workflow-planner_build-the-next-bounded-runtime-slice",
								},
								activeBlockers: ["stale blocker"],
								updatedAt: "2026-04-20T00:00:00.000Z",
							},
						},
						entityRegistry: {
							records: {
								"design_workflow-planner": {
									entityId: "design_workflow-planner",
									entityType: "PlannerDesign",
									entityVersion: 1,
									versionStatus: "current",
									validityStatus: "current",
									createdAt: "2026-04-20T00:00:00.000Z",
									updatedAt: "2026-04-20T00:00:00.000Z",
									governingRequestId: "req_workflow-planner",
									artifactRefIds: [],
									summary: "stale design",
								},
							},
						},
						artifactRegistry: {
							records: {
								"art_brief_workflow-planner": {
									artifactId: "art_brief_workflow-planner",
									artifactType: "execution_brief",
									artifactVersion: 1,
									status: "current",
									path: "requests/workflow-planner/canon/slices/stale/execution-brief-stale.md",
									governingEntityType: "ExecutionBrief",
									governingEntityId:
										"brief_workflow-planner_build-the-next-bounded-runtime-slice",
									derivedFromEntityVersion: 1,
									materializationTimestamp: "2026-04-20T00:00:00.000Z",
									isCurrent: true,
									summary: "stale brief",
								},
							},
						},
						currentPointers: {
							byRequestId: {
								"req_workflow-planner": {
									requestId: "req_workflow-planner",
									currentResearchId: "research_workflow-planner",
									currentDesignId: "design_workflow-planner",
									currentPlanId: "plan_workflow-planner",
									currentTaskSetId: "tasks_workflow-planner",
									currentBriefBySlice: {
										"Build the next bounded runtime slice.":
											"brief_workflow-planner_build-the-next-bounded-runtime-slice",
									},
									lastResolvedAt: "2026-04-20T00:00:00.000Z",
									unresolvedReasons: [],
								},
							},
						},
					},
				}),
				"-->",
				"",
				"# Workflow Planner",
			].join("\n"),
		);

		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"].title,
		).toBe("workflow planner");
		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"].currentPhase,
		).toBe("planning");
		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"]
				.currentBriefBySlice,
		).toEqual({});
		expect(
			parsed.controlPlane.requestRuntime["req_workflow-planner"],
		).not.toHaveProperty("currentDesignId");
		expect(parsed.controlPlane.entityRegistry.records).not.toHaveProperty(
			"design_workflow-planner",
		);
		expect(
			Object.keys(parsed.controlPlane.artifactRegistry.records),
		).toHaveLength(0);
		expect(
			parsed.controlPlane.currentPointers.byRequestId["req_workflow-planner"]
				.currentBriefBySlice,
		).toEqual({});
		expect(
			parsed.controlPlane.currentPointers.byRequestId["req_workflow-planner"],
		).not.toHaveProperty("currentDesignId");
	});

	it("rejects idea_gate before research is attached", async () => {
		const { tool } = await createTool();

		await tool.execute("call-14a", {
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
			tool.execute("call-14b", {
				action: "idea_gate",
				command: "run idea gate",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-research",
				ideaName: "workflow planner",
			}),
		).rejects.toThrow("does not have attached research yet");
	});

	it("rejects task_add, task_done, task_remove, and task_reopen before accepted plan exists", async () => {
		const { tool } = await createTool();

		await tool.execute("call-15a", {
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
			tool.execute("call-15b", {
				action: "task_add",
				command: "add task",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				taskText: "do something",
			}),
		).rejects.toThrow("must be accepted and have a canonical plan");

		await expect(
			tool.execute("call-15c", {
				action: "task_done",
				command: "complete task",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				taskIndex: 1,
			}),
		).rejects.toThrow("must be accepted and have a canonical plan");

		await expect(
			tool.execute("call-15d", {
				action: "task_remove",
				command: "remove task",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				taskIndex: 1,
			}),
		).rejects.toThrow("must be accepted and have a canonical plan");

		await expect(
			tool.execute("call-15e", {
				action: "task_reopen",
				command: "reopen task",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				taskIndex: 1,
			}),
		).rejects.toThrow("must be accepted and have a canonical plan");
	});

	it("rejects planner actions from the wrong bundled skills", async () => {
		const { tool } = await createTool();

		await expect(
			tool.execute("call-16a", {
				action: "plan_create",
				command: "create plan",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
			}),
		).rejects.toThrow("does not support action plan_create");

		await expect(
			tool.execute("call-16b", {
				action: "idea_create",
				command: "create idea",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-research",
				ideaName: "workflow planner",
				problem: "Planning flow is not productized yet.",
				requestedOutcome:
					"Ship an OpenClaw planner plugin with an explicit lifecycle.",
			}),
		).rejects.toThrow("does not support action idea_create");
	});

	it("rejects blank and slug-invalid idea names", async () => {
		const { tool } = await createTool();

		await expect(
			tool.execute("call-17a", {
				action: "idea_get",
				command: "get idea",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-planner",
				ideaName: "   ",
			}),
		).rejects.toThrow("ideaName must be a non-empty string");

		await expect(
			tool.execute("call-17b", {
				action: "idea_get",
				command: "get idea",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-planner",
				ideaName: "!!!",
			}),
		).rejects.toThrow("must contain at least one letter or digit");
	});

	it("rejects missing required text fields", async () => {
		const { tool } = await createTool();

		await expect(
			tool.execute("call-18a", {
				action: "idea_create",
				command: "create idea",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-planner",
				ideaName: "workflow planner",
				problem: "   ",
				requestedOutcome:
					"Ship an OpenClaw planner plugin with an explicit lifecycle.",
			}),
		).rejects.toThrow("problem must be a non-empty string");

		await expect(
			tool.execute("call-18b", {
				action: "idea_create",
				command: "create idea",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-planner",
				ideaName: "workflow planner",
				problem: "Planning flow is not productized yet.",
				requestedOutcome: "   ",
			}),
		).rejects.toThrow("requestedOutcome must be a non-empty string");

		await expect(
			tool.execute("call-18c", {
				action: "idea_close",
				command: "close idea",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				closeNote: "   ",
			}),
		).rejects.toThrow("closeNote must be a non-empty string");
		await expect(
			tool.execute("call-18d", {
				action: "idea_close",
				command: "close idea",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				closeNote: "done",
			}),
		).rejects.toThrow(
			"requires an accepted idea with a current plan before completion can be recorded",
		);
	});

	it("rejects research_attach when idea is missing or research fields are invalid", async () => {
		const { tool } = await createTool();

		await expect(
			tool.execute("call-19a", {
				action: "research_attach",
				command: "attach research",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-research",
				ideaName: "workflow planner",
				researchSummary: "summary",
				fitAssessment: "fit",
				sourcesChecked: ["repo canon"],
			}),
		).rejects.toThrow("was not found in planner state");

		await tool.execute("call-19b", {
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
			tool.execute("call-19c", {
				action: "research_attach",
				command: "attach research",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-research",
				ideaName: "workflow planner",
				researchSummary: "   ",
				fitAssessment: "fit",
				sourcesChecked: ["repo canon"],
			}),
		).rejects.toThrow("researchSummary must be a non-empty string");

		await expect(
			tool.execute("call-19d", {
				action: "research_attach",
				command: "attach research",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-research",
				ideaName: "workflow planner",
				researchSummary: "summary",
				fitAssessment: "   ",
				sourcesChecked: ["repo canon"],
			}),
		).rejects.toThrow("fitAssessment must be a non-empty string");

		await expect(
			tool.execute("call-19e", {
				action: "research_attach",
				command: "attach research",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-research",
				ideaName: "workflow planner",
				researchSummary: "summary",
				fitAssessment: "fit",
				sourcesChecked: [],
			}),
		).rejects.toThrow("sourcesChecked must be a non-empty string array");

		await expect(
			tool.execute("call-19f", {
				action: "research_attach",
				command: "attach research",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-research",
				ideaName: "workflow planner",
				researchSummary: "summary",
				fitAssessment: "fit",
				sourcesChecked: ["repo canon", "   "],
			}),
		).rejects.toThrow("sourcesChecked must be a non-empty string");

		await expect(
			tool.execute("call-19g", {
				action: "research_attach",
				command: "attach research",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-research",
				ideaName: "workflow planner",
				researchSummary: "summary",
				fitAssessment: "fit",
				sourcesChecked: ["repo canon"],
				similarSurfaces: ["good", "   "],
			}),
		).rejects.toThrow("similarSurfaces must be a non-empty string");

		await expect(
			tool.execute("call-19h", {
				action: "research_attach",
				command: "attach research",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-research",
				ideaName: "workflow planner",
				researchSummary: "summary",
				fitAssessment: "fit",
				sourcesChecked: ["repo canon"],
				openQuestions: ["good", "   "],
			}),
		).rejects.toThrow("openQuestions must be a non-empty string");
	});

	it("prefers taskId over taskIndex when both are provided across task actions", async () => {
		const { tool } = await createTool();

		await seedAcceptedIdea(tool);
		await tool.execute("call-20a", {
			action: "plan_create",
			command: "create plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const snapshot = await tool.execute("call-20b", {
			action: "plan_snapshot",
			command: "show plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});
		const payload = JSON.parse(snapshot.content[0].text);
		const firstTaskId = payload.idea.tasks[0].id;
		const secondTaskId = payload.idea.tasks[1].id;

		const done = await tool.execute("call-20c", {
			action: "task_done",
			command: "complete task",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
			taskId: firstTaskId,
			taskIndex: 999,
		});
		const donePayload = JSON.parse(done.content[0].text);
		expect(donePayload.targetTaskId).toBe(firstTaskId);
		expect(donePayload.targetTaskIndex).toBe(1);
		expect(donePayload.targetSelectorHint).toBe(
			`taskId=${firstTaskId} | taskIndex=1`,
		);
		expect(donePayload.targetTask).toMatchObject({
			id: firstTaskId,
			done: true,
		});
		expect(donePayload.completedTaskId).toBe(firstTaskId);
		expect(donePayload.completedTaskIndex).toBe(1);
		expect(donePayload.completedTaskSelectorHint).toBe(
			`taskId=${firstTaskId} | taskIndex=1`,
		);
		expect(donePayload.completedTask).toMatchObject({
			id: firstTaskId,
			done: true,
		});

		const reopen = await tool.execute("call-20d", {
			action: "task_reopen",
			command: "reopen task",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
			taskId: firstTaskId,
			taskIndex: 999,
		});
		const reopenPayload = JSON.parse(reopen.content[0].text);
		expect(reopenPayload.targetTaskId).toBe(firstTaskId);
		expect(reopenPayload.targetTaskIndex).toBe(1);
		expect(reopenPayload.targetSelectorHint).toBe(
			`taskId=${firstTaskId} | taskIndex=1`,
		);
		expect(reopenPayload.targetTask).toMatchObject({
			id: firstTaskId,
			done: false,
		});
		expect(reopenPayload.reopenedTaskId).toBe(firstTaskId);
		expect(reopenPayload.reopenedTaskIndex).toBe(1);
		expect(reopenPayload.reopenedTaskSelectorHint).toBe(
			`taskId=${firstTaskId} | taskIndex=1`,
		);
		expect(reopenPayload.reopenedTask).toMatchObject({
			id: firstTaskId,
			done: false,
		});

		const remove = await tool.execute("call-20e", {
			action: "task_remove",
			command: "remove task",
			commandName: "implementation_handoff",
			skillName: "openclaw-workflow-implementer",
			ideaName: "workflow planner",
			taskId: secondTaskId,
			taskIndex: 999,
		});
		const removePayload = JSON.parse(remove.content[0].text);
		expect(removePayload.targetTaskId).toBe(secondTaskId);
		expect(removePayload.targetTaskIndex).toBe(2);
		expect(removePayload.targetSelectorHint).toBe(
			`taskId=${secondTaskId} | taskIndex=2`,
		);
		expect(removePayload.targetTask).toMatchObject({
			id: secondTaskId,
			done: false,
		});
		expect(removePayload.removedTaskId).toBe(secondTaskId);
		expect(removePayload.removedTaskIndex).toBe(2);
		expect(removePayload.removedTaskSelectorHint).toBe(
			`taskId=${secondTaskId} | taskIndex=2`,
		);
	});

	it("rejects invalid taskText, blank taskId, missing task target, and invalid taskIndex variants", async () => {
		const { tool } = await createTool();

		await seedAcceptedIdea(tool);
		await tool.execute("call-21a", {
			action: "plan_create",
			command: "create plan",
			commandName: "plan_workflow",
			skillName: "openclaw-workflow-planner",
			ideaName: "workflow planner",
		});

		await expect(
			tool.execute("call-21b", {
				action: "task_add",
				command: "add task",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				taskText: "   ",
			}),
		).rejects.toThrow("taskText must be a non-empty string");

		await expect(
			tool.execute("call-21c", {
				action: "task_done",
				command: "complete task",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				taskId: "   ",
			}),
		).rejects.toThrow("taskId must be a non-empty string");

		await expect(
			tool.execute("call-21c2", {
				action: "task_done",
				command: "complete task",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				taskId: "",
				taskIndex: 1,
			}),
		).rejects.toThrow("taskId must be a non-empty string");

		await expect(
			tool.execute("call-21c3", {
				action: "task_remove",
				command: "remove task",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				taskId: "",
				taskIndex: 1,
			}),
		).rejects.toThrow("taskId must be a non-empty string");

		await expect(
			tool.execute("call-21c4", {
				action: "task_reopen",
				command: "reopen task",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				taskId: "",
				taskIndex: 1,
			}),
		).rejects.toThrow("taskId must be a non-empty string");

		await expect(
			tool.execute("call-21d", {
				action: "task_done",
				command: "complete task",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
			}),
		).rejects.toThrow("requires either taskId or an integer taskIndex");

		await expect(
			tool.execute("call-21e", {
				action: "task_done",
				command: "complete task",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				taskIndex: 1.5,
			}),
		).rejects.toThrow("requires either taskId or an integer taskIndex");

		await expect(
			tool.execute("call-21f", {
				action: "task_done",
				command: "complete task",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				taskIndex: 0,
			}),
		).rejects.toThrow("taskIndex 0 is out of range");

		await expect(
			tool.execute("call-21g", {
				action: "task_done",
				command: "complete task",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				taskIndex: -1,
			}),
		).rejects.toThrow("taskIndex -1 is out of range");

		await expect(
			tool.execute("call-21h", {
				action: "task_remove",
				command: "remove task",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
			}),
		).rejects.toThrow("requires either taskId or an integer taskIndex");

		await expect(
			tool.execute("call-21i", {
				action: "task_reopen",
				command: "reopen task",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
			}),
		).rejects.toThrow("requires either taskId or an integer taskIndex");
	});

	it("rejects unknown idea lookups and idea_list with ideaName", async () => {
		const { tool } = await createTool();

		await expect(
			tool.execute("call-22a", {
				action: "idea_get",
				command: "get idea",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-planner",
				ideaName: "workflow planner",
			}),
		).rejects.toThrow("was not found in planner state");

		await expect(
			tool.execute("call-22b", {
				action: "plan_snapshot",
				command: "show plan",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-planner",
				ideaName: "workflow planner",
			}),
		).rejects.toThrow("was not found in planner state");

		await expect(
			tool.execute("call-22c", {
				action: "idea_close",
				command: "close idea",
				commandName: "implementation_handoff",
				skillName: "openclaw-workflow-implementer",
				ideaName: "workflow planner",
				closeNote: "done",
			}),
		).rejects.toThrow(
			"requires an accepted idea with a current plan before completion can be recorded",
		);

		await expect(
			tool.execute("call-22d", {
				action: "idea_list",
				command: "list ideas",
				commandName: "plan_workflow",
				skillName: "openclaw-workflow-planner",
				ideaName: "workflow planner",
			}),
		).rejects.toThrow("idea_list does not accept ideaName");
	});

	it("rejects malformed and unsupported planner state shapes", () => {
		expect(() =>
			parsePlannerMarkdown(
				[
					"<!-- openclaw-workflow-planner-state",
					JSON.stringify({ version: 2, ideas: {} }),
					"-->",
					"",
					"# Workflow Planner",
				].join("\n"),
			),
		).toThrow("unsupported shape");

		expect(() =>
			parsePlannerMarkdown(
				[
					"<!-- openclaw-workflow-planner-state",
					JSON.stringify({ version: 2, ideas: [] }),
					"",
					"# Workflow Planner",
				].join("\n"),
			),
		).toThrow("malformed");
	});

	it("rejects malformed planner markdown state", () => {
		expect(() =>
			parsePlannerMarkdown(
				[
					"<!-- openclaw-workflow-planner-state",
					"{bad json",
					"-->",
					"",
					"# Workflow Planner",
				].join("\n"),
			),
		).toThrow();
	});
});
