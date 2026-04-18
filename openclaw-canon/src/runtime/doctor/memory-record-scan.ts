export type MemoryRecordShape = {
	entityName: string;
	entityType: string;
	observation: string;
	updatedAt: string;
	source: string;
};

export type MemoryScanEntry = {
	line: string;
	lineNumber: number;
	parsed?: unknown;
	parseError?: true;
	invalidShape?: true;
	invalidDate?: boolean;
	duplicateOfLine?: number;
};

export function isMemoryRecordShape(
	value: unknown,
): value is MemoryRecordShape {
	if (!value || typeof value !== "object") {
		return false;
	}

	const record = value as Record<string, unknown>;
	return (
		typeof record.entityName === "string" &&
		typeof record.entityType === "string" &&
		typeof record.observation === "string" &&
		typeof record.updatedAt === "string" &&
		typeof record.source === "string"
	);
}

export function scanMemoryFileContent(raw: string): MemoryScanEntry[] {
	const lines = raw.split("\n");
	const seenLinePayloads = new Map<string, number>();
	const entries: MemoryScanEntry[] = [];

	for (const [index, line] of lines.entries()) {
		const lineNumber = index + 1;

		if (line.trim().length === 0) {
			continue;
		}

		let parsed: unknown;

		try {
			parsed = JSON.parse(line);
		} catch {
			entries.push({
				line,
				lineNumber,
				parseError: true,
			});
			continue;
		}

		if (!isMemoryRecordShape(parsed)) {
			entries.push({
				line,
				lineNumber,
				parsed,
				invalidShape: true,
			});
			continue;
		}

		const duplicateOfLine = seenLinePayloads.get(line);

		if (!duplicateOfLine) {
			seenLinePayloads.set(line, lineNumber);
		}

		entries.push({
			line,
			lineNumber,
			parsed,
			invalidDate: Number.isNaN(Date.parse(parsed.updatedAt)),
			duplicateOfLine,
		});
	}

	return entries;
}
