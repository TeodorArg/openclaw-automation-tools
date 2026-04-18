import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { SessionBloatWarningConfig } from "../runtime/config/plugin-config.js";
import { createCompactionWarningHooks } from "../runtime/hooks/session-compact-hooks.js";

describe("session compact hooks", () => {
	it("adds a pre-compaction warning and persists state", async () => {
		const fixture = await createFixture();
		const hooks = createCompactionWarningHooks(fixture.config);
		const event = {
			sessionKey: "agent:main:main",
			timestamp: "2026-04-18T12:00:00.000Z",
			messages: [] as string[],
		};

		await hooks.beforeCompaction(event);

		expect(event.messages).toHaveLength(1);
		const state = JSON.parse(
			await readFile(fixture.config.stateFilePath, "utf8"),
		) as {
			sessions: Record<
				string,
				{ beforeWarnings: number; afterWarnings: number }
			>;
		};
		expect(state.sessions["agent:main:main"]?.beforeWarnings).toBe(1);
	});

	it("does not emit duplicate post-compaction notes beyond the configured ceiling", async () => {
		const fixture = await createFixture();
		const hooks = createCompactionWarningHooks({
			...fixture.config,
			enablePreCompactionWarning: false,
			maxWarningsPerSession: 1,
		});
		const firstEvent = {
			sessionKey: "agent:main:main",
			messages: [] as string[],
		};
		const secondEvent = {
			sessionKey: "agent:main:main",
			messages: [] as string[],
		};

		await hooks.afterCompaction(firstEvent);
		await hooks.afterCompaction(secondEvent);

		expect(firstEvent.messages).toHaveLength(1);
		expect(secondEvent.messages).toHaveLength(0);
	});
});

async function createFixture() {
	const dir = await mkdtemp(join(tmpdir(), "session-bloat-warning-"));
	const config: SessionBloatWarningConfig = {
		stateFilePath: join(dir, "state.json"),
		defaultLanguage: "en",
		enablePreCompactionWarning: true,
		enablePostCompactionNote: true,
		maxWarningsPerSession: 2,
	};

	return {
		config,
	};
}
