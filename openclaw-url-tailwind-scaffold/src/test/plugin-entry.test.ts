import { beforeEach, describe, expect, it, vi } from "vitest";

const registerTool = vi.fn();

vi.mock("openclaw/plugin-sdk/plugin-entry", () => ({
	definePluginEntry(entry: unknown) {
		return entry;
	},
}));

describe("plugin entry", () => {
	beforeEach(() => {
		registerTool.mockReset();
	});

	it("registers the single tool surface", async () => {
		const pluginModule = (await import("../index.js")) as {
			default: {
				register(api: {
					pluginConfig?: Record<string, unknown>;
					runtime: unknown;
					registerTool: typeof registerTool;
				}): void;
			};
		};

		pluginModule.default.register({
			pluginConfig: undefined,
			runtime: {},
			registerTool,
		});

		expect(registerTool).toHaveBeenCalledTimes(1);
		expect(registerTool).toHaveBeenCalledWith(expect.any(Function), {
			optional: true,
		});

		const toolFactory = registerTool.mock.calls[0][0] as () => {
			name: string;
			description: string;
			parameters: { properties: { action: { enum: string[] } } };
		};
		const tool = toolFactory();

		expect(tool.name).toBe("url_tailwind_scaffold_action");
		expect(tool.parameters.properties.action.enum).toEqual([
			"analyze_reference_page",
		]);
	});
});
