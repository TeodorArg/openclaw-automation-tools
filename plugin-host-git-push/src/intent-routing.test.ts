import { describe, expect, it } from "vitest";
import {
	normalizeWorkflowIntent,
	resolveWorkflowIntent,
} from "./intent-routing.js";

describe("host bridge intent routing", () => {
	it("normalizes send_to_git aliases", () => {
		expect(normalizeWorkflowIntent("send_to_git")).toBe("send_to_git");
		expect(normalizeWorkflowIntent("отправь в гит")).toBe("send_to_git");
		expect(normalizeWorkflowIntent("push it")).toBe("send_to_git");
	});

	it("normalizes open_pr aliases", () => {
		expect(normalizeWorkflowIntent("open_pr")).toBe("open_pr");
		expect(normalizeWorkflowIntent("сделай PR")).toBe("open_pr");
		expect(normalizeWorkflowIntent("make a PR")).toBe("open_pr");
	});

	it("resolves from commandName first, then command", () => {
		expect(
			resolveWorkflowIntent({ commandName: "open_pr", command: "push it" }),
		).toBe("open_pr");
		expect(
			resolveWorkflowIntent({
				commandName: "",
				command: "ship to git",
			}),
		).toBe("send_to_git");
	});
});
