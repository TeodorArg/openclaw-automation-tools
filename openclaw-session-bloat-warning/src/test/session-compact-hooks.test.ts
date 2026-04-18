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
			messages: [] as string[],
		};

		await hooks.beforeCompaction(event, {
			sessionKey: "agent:main:main",
		});

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
			messages: [] as string[],
		};

		await hooks.afterCompaction(firstEvent, {
			sessionKey: "agent:main:main",
		});
		await hooks.afterCompaction(secondEvent, {
			sessionKey: "agent:main:main",
		});

		expect(firstEvent.messages).toHaveLength(1);
		expect(secondEvent.messages).toHaveLength(0);
	});

	it("uses the default bucket when the hook context has no sessionKey", async () => {
		const fixture = await createFixture();
		const hooks = createCompactionWarningHooks(fixture.config);
		const event = {
			messages: [] as string[],
		};

		await hooks.beforeCompaction(event, {});

		const state = JSON.parse(
			await readFile(fixture.config.stateFilePath, "utf8"),
		) as {
			sessions: Record<string, { beforeWarnings: number }>;
		};
		expect(state.sessions.__default__?.beforeWarnings).toBe(1);
	});

	it("does not append or persist when the hook event has no writable messages", async () => {
		const fixture = await createFixture();
		const hooks = createCompactionWarningHooks(fixture.config);

		await hooks.beforeCompaction(
			{},
			{
				sessionKey: "agent:main:main",
			},
		);

		await expect(
			readFile(fixture.config.stateFilePath, "utf8"),
		).rejects.toMatchObject({
			code: "ENOENT",
		});
	});

	it("gates post-compaction notes against prior pre-compaction warnings", async () => {
		const fixture = await createFixture();
		const hooks = createCompactionWarningHooks(fixture.config);
		const event = {
			messages: [] as string[],
		};

		await hooks.afterCompaction(event, {
			sessionKey: "agent:main:main",
		});

		expect(event.messages).toHaveLength(0);
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
