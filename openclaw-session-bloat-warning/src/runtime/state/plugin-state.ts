import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import {
	createEmptyWarningState,
	normalizeWarningState,
} from "./state-normalize.js";
import type { WarningState } from "./state-types.js";

export type { SessionWarningState, WarningState } from "./state-types.js";

export async function loadWarningState(
	stateFilePath: string,
): Promise<WarningState> {
	try {
		const raw = await readFile(stateFilePath, "utf8");
		return normalizeWarningState(JSON.parse(raw));
	} catch (error) {
		if (isMissingFileError(error) || error instanceof SyntaxError) {
			return createEmptyWarningState();
		}

		throw error;
	}
}

export async function saveWarningState(
	stateFilePath: string,
	state: WarningState,
): Promise<void> {
	await mkdir(dirname(stateFilePath), { recursive: true });
	await writeFile(
		stateFilePath,
		`${JSON.stringify(normalizeWarningState(state), null, 2)}\n`,
		"utf8",
	);
}

function isMissingFileError(error: unknown) {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "ENOENT"
	);
}
