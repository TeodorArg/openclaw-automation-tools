import type { CanonFinding } from "../report/canon-contract.js";
import { tryReadUtf8 } from "../report/file-state.js";
import { resolveMemoryFilePath } from "../state/plugin-paths.js";
import { scanMemoryFileContent } from "./memory-record-scan.js";

type CanonPluginConfig = {
	memoryFilePath?: unknown;
};

type MemoryDoctorFinding = {
	findings: CanonFinding[];
};

export async function auditMemoryFile(
	pluginConfig?: CanonPluginConfig,
): Promise<MemoryDoctorFinding> {
	const memoryFilePath = resolveMemoryFilePath(pluginConfig);
	const raw = await tryReadUtf8(memoryFilePath);
	const findings: CanonFinding[] = [];

	if (typeof raw !== "string") {
		findings.push({
			id: "memory-file-missing",
			kind: "memory_drift",
			severity: "warning",
			evidence: [
				{
					kind: "memory",
					ref: memoryFilePath,
					detail: "Configured memory snapshot file does not exist.",
				},
			],
			sourceOfTruth: {
				kind: "memory_policy",
				ref: memoryFilePath,
				note: "canon memory scope requires a memory.jsonl snapshot file.",
			},
			recommendedAction:
				"Point memoryFilePath at a valid memory.jsonl snapshot or run canon memory checks in a repo that ships one.",
			canAutoFix: false,
			requiresConfirmation: false,
			fixDisposition: "manual_only",
		});

		return { findings };
	}

	for (const entry of scanMemoryFileContent(raw)) {
		if (entry.parseError) {
			findings.push({
				id: `memory-invalid-json-${entry.lineNumber}`,
				kind: "memory_drift",
				severity: "warning",
				evidence: [
					{
						kind: "memory",
						ref: `${memoryFilePath}:${entry.lineNumber}`,
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
			continue;
		}

		if (entry.invalidShape) {
			findings.push({
				id: `memory-invalid-shape-${entry.lineNumber}`,
				kind: "memory_drift",
				severity: "warning",
				evidence: [
					{
						kind: "memory",
						ref: `${memoryFilePath}:${entry.lineNumber}`,
						detail: "Line does not match the required memory record shape.",
					},
				],
				sourceOfTruth: {
					kind: "memory_policy",
					ref: memoryFilePath,
					note: "Records require entityName, entityType, observation, updatedAt, and source.",
				},
				recommendedAction:
					"Preview and remove the malformed-shape memory record.",
				canAutoFix: true,
				requiresConfirmation: true,
				fixDisposition: "safe_apply",
			});
			continue;
		}

		if (entry.invalidDate) {
			findings.push({
				id: `memory-invalid-date-${entry.lineNumber}`,
				kind: "memory_drift",
				severity: "warning",
				evidence: [
					{
						kind: "memory",
						ref: `${memoryFilePath}:${entry.lineNumber}`,
						detail: `updatedAt is not a valid date: ${(entry.parsed as { updatedAt: string }).updatedAt}`,
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
		} else if (entry.duplicateOfLine) {
			findings.push({
				id: `memory-duplicate-${entry.duplicateOfLine}-${entry.lineNumber}`,
				kind: "memory_drift",
				severity: "info",
				evidence: [
					{
						kind: "memory",
						ref: `${memoryFilePath}:${entry.duplicateOfLine}`,
						detail:
							"Byte-identical memory record already exists earlier in the file.",
					},
					{
						kind: "memory",
						ref: `${memoryFilePath}:${entry.lineNumber}`,
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
		}
	}

	return { findings };
}
