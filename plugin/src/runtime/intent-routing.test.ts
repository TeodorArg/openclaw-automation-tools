import { describe, expect, it } from "vitest";
import {
	normalizeWorkflowIntent,
	resolveWorkflowIntent,
} from "./intent-routing.js";

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
