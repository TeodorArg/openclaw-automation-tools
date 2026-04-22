import { readFile } from "node:fs/promises";

export function isEnoentError(error: unknown): error is NodeJS.ErrnoException {
	return Boolean(
		error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "ENOENT",
	);
}

export async function tryReadUtf8(
	filePath: string,
): Promise<string | undefined> {
	try {
		return await readFile(filePath, "utf8");
	} catch (error) {
		if (isEnoentError(error)) {
			return undefined;
		}

		throw error;
	}
}
