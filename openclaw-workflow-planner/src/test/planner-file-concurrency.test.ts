import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	loadPlannerState,
	PlannerConcurrentModificationError,
	parsePlannerMarkdown,
	savePlannerState,
} from "../runtime/state/planner-file.js";
import { upsertIdea } from "../runtime/state/planner-state.js";

async function createPlannerFilePath() {
	const tempDir = await mkdtemp(join(tmpdir(), "workflow-planner-file-test-"));
	return join(tempDir, "WORKFLOW_PLAN.md");
}

describe("planner file concurrency guard", () => {
	it("rejects stale saves after another writer updates WORKFLOW_PLAN.md", async () => {
		const plannerFilePath = await createPlannerFilePath();
		const firstLoad = await loadPlannerState({ plannerFilePath });
		const secondLoad = await loadPlannerState({ plannerFilePath });

		const firstState = upsertIdea(firstLoad.state, {
			slug: "idea-a",
			name: "idea a",
			problem: "first problem",
			requestedOutcome: "first outcome",
			createdAt: "2026-04-20T00:00:00.000Z",
			status: "draft",
			tasks: [],
		});
		await savePlannerState(firstState, {
			plannerFilePath,
			expectedRevision: firstLoad.revision,
		});

		const staleState = upsertIdea(secondLoad.state, {
			slug: "idea-b",
			name: "idea b",
			problem: "second problem",
			requestedOutcome: "second outcome",
			createdAt: "2026-04-20T00:00:00.000Z",
			status: "draft",
			tasks: [],
		});

		await expect(
			savePlannerState(staleState, {
				plannerFilePath,
				expectedRevision: secondLoad.revision,
			}),
		).rejects.toBeInstanceOf(PlannerConcurrentModificationError);

		const persisted = parsePlannerMarkdown(
			await readFile(plannerFilePath, "utf8"),
		);
		expect(persisted.ideas.map((idea) => idea.slug)).toEqual(["idea-a"]);
	});

	it("returns a fresh revision after a successful save", async () => {
		const plannerFilePath = await createPlannerFilePath();
		const loaded = await loadPlannerState({ plannerFilePath });
		const nextState = upsertIdea(loaded.state, {
			slug: "idea-a",
			name: "idea a",
			problem: "first problem",
			requestedOutcome: "first outcome",
			createdAt: "2026-04-20T00:00:00.000Z",
			status: "draft",
			tasks: [],
		});

		const saved = await savePlannerState(nextState, {
			plannerFilePath,
			expectedRevision: loaded.revision,
		});
		const reloaded = await loadPlannerState({ plannerFilePath });

		expect(saved.revision).not.toBe("missing");
		expect(reloaded.revision).toBe(saved.revision);
	});
});
