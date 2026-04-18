import { beforeEach, describe, expect, it, vi } from "vitest";

const registerHook = vi.fn();

vi.mock("openclaw/plugin-sdk/plugin-entry", () => ({
	definePluginEntry(entry: unknown) {
		return entry;
	},
}));

describe("plugin entry", () => {
	beforeEach(() => {
		registerHook.mockReset();
	});

	it("registers the official compaction hook names", async () => {
		const pluginModule = (await import("../index.js")) as {
			default: {
				register(api: {
					pluginConfig?: Record<string, unknown>;
					runtime: unknown;
					registerHook: typeof registerHook;
				}): void;
			};
		};

		pluginModule.default.register({
			pluginConfig: undefined,
			runtime: {},
			registerHook,
		});

		expect(registerHook).toHaveBeenCalledTimes(2);
		expect(registerHook).toHaveBeenNthCalledWith(
			1,
			"session:compact:before",
			expect.any(Function),
		);
		expect(registerHook).toHaveBeenNthCalledWith(
			2,
			"session:compact:after",
			expect.any(Function),
		);
	});
});
