import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
	loadWarningState,
	saveWarningState,
} from "../runtime/state/plugin-state.js";
import {
	DEFAULT_SESSION_STATE_KEY,
	WARNING_STATE_PLUGIN_ID,
	WARNING_STATE_SCHEMA_VERSION,
} from "../runtime/state/state-types.js";

describe("plugin state", () => {
	it("normalizes legacy state on read", async () => {
		const fixture = await createFixture();
		await writeFile(
			fixture.stateFilePath,
			JSON.stringify({
				sessions: {
					"agent:main:main": {
						beforeWarnings: 2,
						afterWarnings: 1,
						lastUpdatedAt: "2026-04-19T10:00:00.000Z",
					},
				},
			}),
			"utf8",
		);

		const state = await loadWarningState(fixture.stateFilePath);

		expect(state).toEqual({
			schemaVersion: WARNING_STATE_SCHEMA_VERSION,
			pluginId: WARNING_STATE_PLUGIN_ID,
			updatedAt: undefined,
			sessions: {
				"agent:main:main": {
					beforeWarnings: 2,
					afterWarnings: 1,
					lastUpdatedAt: "2026-04-19T10:00:00.000Z",
				},
			},
		});
	});

	it("fails open on malformed state", async () => {
		const fixture = await createFixture();
		await writeFile(fixture.stateFilePath, "{ definitely not json", "utf8");

		await expect(loadWarningState(fixture.stateFilePath)).resolves.toEqual({
			schemaVersion: WARNING_STATE_SCHEMA_VERSION,
			pluginId: WARNING_STATE_PLUGIN_ID,
			updatedAt: undefined,
			sessions: {},
		});
	});

	it("preserves default session fallback compatibility", async () => {
		const fixture = await createFixture();

		const state = await loadWarningState(fixture.stateFilePath);
		state.sessions[DEFAULT_SESSION_STATE_KEY] = {
			beforeWarnings: 1,
			afterWarnings: 0,
		};
		await saveWarningState(fixture.stateFilePath, state);

		const reloaded = await loadWarningState(fixture.stateFilePath);
		expect(reloaded.sessions[DEFAULT_SESSION_STATE_KEY]).toEqual({
			beforeWarnings: 1,
			afterWarnings: 0,
			lastUpdatedAt: undefined,
		});
	});

	it("roundtrips normalized state read/write", async () => {
		const fixture = await createFixture();
		const state = {
			schemaVersion: WARNING_STATE_SCHEMA_VERSION as const,
			pluginId: WARNING_STATE_PLUGIN_ID,
			updatedAt: "2026-04-19T10:30:00.000Z",
			sessions: {
				"agent:main:main": {
					beforeWarnings: 3,
					afterWarnings: 2,
					lastUpdatedAt: "2026-04-19T10:29:00.000Z",
				},
			},
		};

		await saveWarningState(fixture.stateFilePath, state);
		await expect(loadWarningState(fixture.stateFilePath)).resolves.toEqual(
			state,
		);
	});
});

async function createFixture() {
	const dir = await mkdtemp(join(tmpdir(), "session-bloat-warning-state-"));

	return {
		stateFilePath: join(dir, "state.json"),
	};
}
