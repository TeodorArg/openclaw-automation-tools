import { beforeEach, describe, expect, it, vi } from "vitest";

const on = vi.fn();

vi.mock("openclaw/plugin-sdk/plugin-entry", () => ({
	definePluginEntry(entry: unknown) {
		return entry;
	},
}));

describe("plugin entry", () => {
	beforeEach(() => {
		on.mockReset();
	});

	it("registers the official compaction and llm hook names", async () => {
		const pluginModule = (await import("../index.js")) as {
			default: {
				register(api: {
					pluginConfig?: Record<string, unknown>;
					runtime: unknown;
					on: typeof on;
				}): void;
			};
		};

		pluginModule.default.register({
			pluginConfig: undefined,
			runtime: {},
			on,
		});

		expect(on).toHaveBeenCalledTimes(5);
		expect(on).toHaveBeenNthCalledWith(
			1,
			"before_compaction",
			expect.any(Function),
		);
		expect(on).toHaveBeenNthCalledWith(
			2,
			"after_compaction",
			expect.any(Function),
		);
		expect(on).toHaveBeenNthCalledWith(
			3,
			"before_agent_reply",
			expect.any(Function),
		);
		expect(on).toHaveBeenNthCalledWith(4, "llm_input", expect.any(Function));
		expect(on).toHaveBeenNthCalledWith(5, "llm_output", expect.any(Function));
	});
});
