import { describe, expect, it } from "vitest";
import {
	normalizeWorkflowIntent,
	resolveWorkflowIntent,
} from "../runtime/planning/intent-routing.js";

describe("normalizeWorkflowIntent", () => {
	it("normalizes canonical intent ids", () => {
		expect(normalizeWorkflowIntent("send_to_git")).toBe("send_to_git");
	});

	it("normalizes supported RU aliases", () => {
		expect(normalizeWorkflowIntent("отправь в гит")).toBe("send_to_git");
		expect(normalizeWorkflowIntent("отправь изменения")).toBe("send_to_git");
	});

	it("normalizes supported EN aliases", () => {
		expect(normalizeWorkflowIntent("send to git")).toBe("send_to_git");
	});

	it("normalizes full-cycle verification requests for the active plugin", () => {
		expect(
			normalizeWorkflowIntent(
				"давай проверим работает ли плагин openclaw-host-git-workflow нужно полный цикл",
			),
		).toBe("send_to_git");
		expect(
			normalizeWorkflowIntent(
				"check whether plugin openclaw-host-git-workflow works, need full cycle",
			),
		).toBe("send_to_git");
		expect(
			normalizeWorkflowIntent(
				"verify openclaw-host-git-workflow with an end-to-end run",
			),
		).toBe("send_to_git");
		expect(
			normalizeWorkflowIntent(
				"запусти openclaw-host-git-workflow и сделай полный прогон",
			),
		).toBe("send_to_git");
		expect(
			normalizeWorkflowIntent(
				"test plugin openclaw-host-git-workflow with the complete workflow",
			),
		).toBe("send_to_git");
	});

	it("normalizes shipped RU planning and execute aliases", () => {
		expect(normalizeWorkflowIntent("разложи по git-группам")).toBe(
			"send_to_git",
		);
		expect(normalizeWorkflowIntent("разложи по git-группам с ветками")).toBe(
			"send_to_git",
		);
		expect(normalizeWorkflowIntent("выполни git-группы с ветками")).toBe(
			"send_to_git",
		);
		expect(normalizeWorkflowIntent("разложи по git группам")).toBe(
			"send_to_git",
		);
	});

	it("handles slash-prefixed and mixed-case inputs", () => {
		expect(normalizeWorkflowIntent("/send_to_git")).toBe("send_to_git");
		expect(normalizeWorkflowIntent("Send To Git")).toBe("send_to_git");
		expect(normalizeWorkflowIntent("SEND_TO_GIT")).toBe("send_to_git");
	});

	it("returns null for unsupported text", () => {
		expect(normalizeWorkflowIntent("git status")).toBeNull();
		expect(normalizeWorkflowIntent("проверь другой плагин")).toBeNull();
		expect(
			normalizeWorkflowIntent("run complete workflow for another plugin"),
		).toBeNull();
		expect(
			normalizeWorkflowIntent("openclaw-host-git-workflow docs"),
		).toBeNull();
	});
});

describe("resolveWorkflowIntent", () => {
	it("prefers commandName when both are present", () => {
		expect(
			resolveWorkflowIntent({
				commandName: "send_to_git",
				command: "отправь изменения",
			}),
		).toBe("send_to_git");
	});

	it("falls back to command text", () => {
		expect(
			resolveWorkflowIntent({
				commandName: "",
				command: "отправь изменения",
			}),
		).toBe("send_to_git");
	});
});
