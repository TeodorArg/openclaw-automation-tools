import { describe, expect, it } from "vitest";
import {
	normalizeWorkflowIntent,
	resolveWorkflowIntent,
} from "./intent-routing.js";

describe("normalizeWorkflowIntent", () => {
	it("normalizes canonical intent ids", () => {
		expect(normalizeWorkflowIntent("send_to_git")).toBe("send_to_git");
		expect(normalizeWorkflowIntent("open_pr")).toBe("open_pr");
	});

	it("normalizes supported RU aliases", () => {
		expect(normalizeWorkflowIntent("отправь в гит")).toBe("send_to_git");
		expect(normalizeWorkflowIntent("запушь")).toBe("send_to_git");
		expect(normalizeWorkflowIntent("отправь изменения")).toBe("send_to_git");
		expect(normalizeWorkflowIntent("сделай PR")).toBe("open_pr");
	});

	it("normalizes supported EN aliases", () => {
		expect(normalizeWorkflowIntent("send to git")).toBe("send_to_git");
		expect(normalizeWorkflowIntent("push it")).toBe("send_to_git");
		expect(normalizeWorkflowIntent("ship to git")).toBe("send_to_git");
		expect(normalizeWorkflowIntent("make a PR")).toBe("open_pr");
		expect(normalizeWorkflowIntent("open a PR")).toBe("open_pr");
	});

	it("handles slash-prefixed and mixed-case inputs", () => {
		expect(normalizeWorkflowIntent("/send_to_git")).toBe("send_to_git");
		expect(normalizeWorkflowIntent("/Open_PR")).toBe("open_pr");
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
				command: "open a PR",
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
