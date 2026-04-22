import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { type CanonState, createEmptyCanonState } from "./canon-state.js";
import { resolveFallbackPath } from "./runtime-roots.js";

type CanonPluginConfig = {
	stateFilePath?: unknown;
};

export function resolveCanonStateFilePath(
	pluginConfig?: CanonPluginConfig,
): string {
	const configuredPath =
		typeof pluginConfig?.stateFilePath === "string"
			? pluginConfig.stateFilePath.trim()
			: "";

	return configuredPath
		? resolve(configuredPath)
		: resolveFallbackPath(".openclaw-canon-state.json");
}

export async function loadCanonState(
	pluginConfig?: CanonPluginConfig,
): Promise<{ filePath: string; state: CanonState }> {
	const filePath = resolveCanonStateFilePath(pluginConfig);

	try {
		const raw = await readFile(filePath, "utf8");
		const parsed = JSON.parse(raw) as CanonState;

		if (parsed.version !== 1 || typeof parsed.updatedAt !== "string") {
			throw new Error("Canon state file has an unsupported shape.");
		}

		return {
			filePath,
			state: parsed,
		};
	} catch (error) {
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "ENOENT"
		) {
			return {
				filePath,
				state: createEmptyCanonState(),
			};
		}

		throw error;
	}
}

export async function saveCanonState(
	state: CanonState,
	pluginConfig?: CanonPluginConfig,
): Promise<{ filePath: string }> {
	const filePath = resolveCanonStateFilePath(pluginConfig);
	await mkdir(dirname(filePath), { recursive: true });
	await writeFile(
		filePath,
		JSON.stringify(state, null, 2).concat("\n"),
		"utf8",
	);

	return { filePath };
}
