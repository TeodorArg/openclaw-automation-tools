import { readFile } from "node:fs/promises";
import type { CanonFinding } from "../report/canon-contract.js";
import { resolveMemoryFilePath } from "../state/plugin-paths.js";

type CanonPluginConfig = {
	memoryFilePath?: unknown;
};

type MemoryDoctorFinding = {
	findings: CanonFinding[];
};

type MemoryRecordShape = {
	entityName: string;
	entityType: string;
	observation: string;
	updatedAt: string;
	source: string;
};

function isMemoryRecordShape(value: unknown): value is MemoryRecordShape {
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

export function parseJsonlLines(raw: string): string[] {
	return raw.split("\n").filter((line) => line.trim().length > 0);
}

export async function auditMemoryFile(
	pluginConfig?: CanonPluginConfig,
): Promise<MemoryDoctorFinding> {
	const memoryFilePath = resolveMemoryFilePath(pluginConfig);
	const raw = await readFile(memoryFilePath, "utf8");
	const lines = parseJsonlLines(raw);
	const findings: CanonFinding[] = [];
	const seenLinePayloads = new Map<string, number>();

	lines.forEach((line, index) => {
		let parsed: unknown;

		try {
			parsed = JSON.parse(line);
		} catch {
			findings.push({
				id: `memory-invalid-json-${index + 1}`,
				kind: "memory_drift",
				severity: "warning",
				evidence: [
					{
						kind: "memory",
						ref: `${memoryFilePath}:${index + 1}`,
						detail: "Line is not valid JSON.",
					},
				],
				sourceOfTruth: {
					kind: "memory_policy",
					ref: memoryFilePath,
					note: "memory.jsonl must contain one valid JSON object per line.",
				},
				recommendedAction:
					"Preview and remove or rewrite the malformed memory line.",
				canAutoFix: true,
				requiresConfirmation: true,
				fixDisposition: "safe_apply",
			});
			return;
		}

		if (!isMemoryRecordShape(parsed)) {
			findings.push({
				id: `memory-invalid-shape-${index + 1}`,
				kind: "memory_drift",
				severity: "warning",
				evidence: [
					{
						kind: "memory",
						ref: `${memoryFilePath}:${index + 1}`,
						detail: "Line does not match the required memory record shape.",
					},
				],
				sourceOfTruth: {
					kind: "memory_policy",
					ref: memoryFilePath,
					note: "Records require entityName, entityType, observation, updatedAt, and source.",
				},
				recommendedAction:
					"Preview and remove or normalize the malformed memory record.",
				canAutoFix: true,
				requiresConfirmation: true,
				fixDisposition: "safe_apply",
			});
			return;
		}

		if (Number.isNaN(Date.parse(parsed.updatedAt))) {
			findings.push({
				id: `memory-invalid-date-${index + 1}`,
				kind: "memory_drift",
				severity: "warning",
				evidence: [
					{
						kind: "memory",
						ref: `${memoryFilePath}:${index + 1}`,
						detail: `updatedAt is not a valid date: ${parsed.updatedAt}`,
					},
				],
				sourceOfTruth: {
					kind: "memory_policy",
					ref: memoryFilePath,
				},
				recommendedAction:
					"Rewrite the malformed memory date or regenerate the record.",
				canAutoFix: false,
				requiresConfirmation: false,
				fixDisposition: "manual_only",
			});
		}

		const previousLine = seenLinePayloads.get(line);

		if (previousLine) {
			findings.push({
				id: `memory-duplicate-${previousLine}-${index + 1}`,
				kind: "memory_drift",
				severity: "info",
				evidence: [
					{
						kind: "memory",
						ref: `${memoryFilePath}:${previousLine}`,
						detail:
							"Byte-identical memory record already exists earlier in the file.",
					},
					{
						kind: "memory",
						ref: `${memoryFilePath}:${index + 1}`,
						detail:
							"Later line duplicates the earlier canonical record exactly.",
					},
				],
				sourceOfTruth: {
					kind: "memory_policy",
					ref: memoryFilePath,
					note: "Byte-identical duplicates are safe to remove after preview.",
				},
				recommendedAction: "Preview and remove the duplicate memory line.",
				canAutoFix: true,
				requiresConfirmation: true,
				fixDisposition: "safe_apply",
			});
		} else {
			seenLinePayloads.set(line, index + 1);
		}
	});

	return { findings };
}
