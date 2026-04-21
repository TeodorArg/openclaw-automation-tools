import { beforeEach, describe, expect, it, vi } from "vitest";

const on = vi.fn();
const registerTool = vi.fn();

vi.mock("openclaw/plugin-sdk/plugin-entry", () => ({
	definePluginEntry(entry: unknown) {
		return entry;
	},
}));

describe("plugin entry", () => {
	beforeEach(() => {
		on.mockReset();
		registerTool.mockReset();
	});

	it("registers the official compaction and llm hook names", async () => {
		const pluginModule = (await import("../index.js")) as {
			default: {
				register(api: {
					pluginConfig?: Record<string, unknown>;
					runtime: unknown;
					on: typeof on;
					registerTool: typeof registerTool;
				}): void;
			};
		};

		pluginModule.default.register({
			pluginConfig: undefined,
			runtime: {},
			on,
			registerTool,
		});

		expect(registerTool).toHaveBeenCalledTimes(1);
		expect(registerTool).toHaveBeenCalledWith(expect.any(Function), {
			optional: true,
		});
		expect(on).toHaveBeenCalledTimes(6);
		expect(on).toHaveBeenNthCalledWith(
			1,
			"before_prompt_build",
			expect.any(Function),
		);
		expect(on).toHaveBeenNthCalledWith(
			2,
			"before_compaction",
			expect.any(Function),
		);
		expect(on).toHaveBeenNthCalledWith(
			3,
			"after_compaction",
			expect.any(Function),
		);
		expect(on).toHaveBeenNthCalledWith(
			4,
			"before_agent_reply",
			expect.any(Function),
		);
		expect(on).toHaveBeenNthCalledWith(5, "llm_input", expect.any(Function));
		expect(on).toHaveBeenNthCalledWith(6, "llm_output", expect.any(Function));
	});
});
