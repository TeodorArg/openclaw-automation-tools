import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type SessionWarningState = {
	beforeWarnings: number;
	afterWarnings: number;
	lastUpdatedAt?: string;
};

export type WarningState = {
	sessions: Record<string, SessionWarningState>;
};

export async function loadWarningState(
	stateFilePath: string,
): Promise<WarningState> {
	try {
		const raw = await readFile(stateFilePath, "utf8");
		const parsed = JSON.parse(raw) as Partial<WarningState>;

		return {
			sessions:
				parsed.sessions && typeof parsed.sessions === "object"
					? Object.fromEntries(
							Object.entries(parsed.sessions).map(([key, value]) => [
								key,
								normalizeSessionWarningState(value),
							]),
						)
					: {},
		};
	} catch (error) {
		if (isMissingFileError(error)) {
			return {
				sessions: {},
			};
		}

		throw error;
	}
}

export async function saveWarningState(
	stateFilePath: string,
	state: WarningState,
): Promise<void> {
	await mkdir(dirname(stateFilePath), { recursive: true });
	await writeFile(stateFilePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function normalizeSessionWarningState(value: unknown): SessionWarningState {
	const record =
		value && typeof value === "object"
			? (value as Record<string, unknown>)
			: {};

	return {
		beforeWarnings: readCounter(record.beforeWarnings),
		afterWarnings: readCounter(record.afterWarnings),
		lastUpdatedAt:
			typeof record.lastUpdatedAt === "string"
				? record.lastUpdatedAt
				: undefined,
	};
}

function readCounter(value: unknown) {
	return typeof value === "number" && Number.isInteger(value) && value >= 0
		? value
		: 0;
}

function isMissingFileError(error: unknown) {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "ENOENT"
	);
}
