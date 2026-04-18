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

	it("registers the official compaction hook names", async () => {
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

		expect(on).toHaveBeenCalledTimes(2);
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
	});
});
