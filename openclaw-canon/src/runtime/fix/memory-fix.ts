import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import type {
	CanonChange,
	CanonFixResult,
	CanonProposal,
} from "../report/canon-contract.js";
import type { CanonPreviewRecord, CanonState } from "../state/canon-state.js";
import { resolveMemoryFilePath } from "../state/plugin-paths.js";

type CanonPluginConfig = {
	memoryFilePath?: unknown;
};

type MemoryFixPlan = {
	changes: CanonChange[];
	proposals: CanonProposal[];
};

type MemoryRecordShape = {
	entityName: string;
	entityType: string;
	observation: string;
	updatedAt: string;
	source: string;
};

function buildProposal(
	id: string,
	title: string,
	targetId: string,
	ref: string,
	summary: string,
): CanonProposal {
	return {
		id,
		title,
		summary,
		targetIds: [targetId],
		requiresConfirmation: true,
		canAutoFix: true,
		fixDisposition: "safe_apply",
		evidence: [
			{
				kind: "memory",
				ref,
				detail: summary,
			},
		],
	};
}

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

export async function buildMemoryFixPlan(
	pluginConfig?: CanonPluginConfig,
	targetIds?: string[],
): Promise<MemoryFixPlan> {
	const memoryFilePath = resolveMemoryFilePath(pluginConfig);
	const raw = await readFile(memoryFilePath, "utf8");
	const lines = raw.split("\n");
	const changes: CanonChange[] = [];
	const proposals: CanonProposal[] = [];
	const seenPayloads = new Map<string, number>();

	lines.forEach((line, index) => {
		const lineNumber = index + 1;
		const trimmedLine = line.trim();

		if (trimmedLine.length === 0) {
			return;
		}

		try {
			const parsed = JSON.parse(trimmedLine);

			if (!isMemoryRecordShape(parsed)) {
				const targetId = `memory-invalid-shape-${lineNumber}`;
				if (!targetIds || targetIds.includes(targetId)) {
					changes.push({
						kind: "delete_line",
						targetId,
						ref: `${memoryFilePath}:${lineNumber}`,
						detail:
							"Delete valid JSON memory record that does not match the required shape.",
					});
					proposals.push(
						buildProposal(
							`proposal-${targetId}`,
							"Remove malformed memory record",
							targetId,
							`${memoryFilePath}:${lineNumber}`,
							"Line parses as JSON but does not include the required memory fields.",
						),
					);
				}

				return;
			}
		} catch {
			const targetId = `memory-invalid-json-${lineNumber}`;
			if (!targetIds || targetIds.includes(targetId)) {
				changes.push({
					kind: "delete_line",
					targetId,
					ref: `${memoryFilePath}:${lineNumber}`,
					detail: "Delete malformed JSON line from memory.jsonl.",
				});
				proposals.push(
					buildProposal(
						`proposal-${targetId}`,
						"Remove malformed memory line",
						targetId,
						`${memoryFilePath}:${lineNumber}`,
						"Line is not valid JSON and can be removed safely after preview.",
					),
				);
			}
			return;
		}

		const previousLine = seenPayloads.get(trimmedLine);
		if (previousLine) {
			const targetId = `memory-duplicate-${previousLine}-${lineNumber}`;
			if (!targetIds || targetIds.includes(targetId)) {
				changes.push({
					kind: "delete_line",
					targetId,
					ref: `${memoryFilePath}:${lineNumber}`,
					detail: "Remove byte-identical duplicate memory record.",
				});
				proposals.push(
					buildProposal(
						`proposal-${targetId}`,
						"Remove duplicate memory line",
						targetId,
						`${memoryFilePath}:${lineNumber}`,
						"Later line is byte-identical to an earlier canonical record.",
					),
				);
			}
		} else {
			seenPayloads.set(trimmedLine, lineNumber);
		}
	});

	return {
		changes,
		proposals,
	};
}

export function createPreviewRecord(
	result: CanonFixResult,
): CanonPreviewRecord {
	const createdAt = result.generatedAt;
	return {
		token: randomUUID(),
		targetIds: (result.proposals ?? []).flatMap(
			(proposal) => proposal.targetIds,
		),
		createdAt,
		expiresAt: new Date(Date.parse(createdAt) + 10 * 60 * 1000).toISOString(),
		changes: result.changes,
		proposals: result.proposals,
	};
}

export function selectPreviewRecord(
	state: CanonState,
	token: string,
	targetIds?: string[],
): CanonPreviewRecord {
	const record = state.previews.find((preview) => preview.token === token);

	if (!record) {
		throw new Error("confirmToken was not found. Run preview again.");
	}

	if (record.consumedAt) {
		throw new Error("confirmToken was already consumed. Run preview again.");
	}

	if (Date.parse(record.expiresAt) < Date.now()) {
		throw new Error("confirmToken expired. Run preview again.");
	}

	if (
		targetIds &&
		(targetIds.length !== record.targetIds.length ||
			targetIds.some((targetId) => !record.targetIds.includes(targetId)))
	) {
		throw new Error("confirmToken does not match the requested targetIds.");
	}

	return record;
}

export async function applyMemoryFixPlan(
	record: CanonPreviewRecord,
	pluginConfig?: CanonPluginConfig,
): Promise<void> {
	const memoryFilePath = resolveMemoryFilePath(pluginConfig);
	const raw = await readFile(memoryFilePath, "utf8");
	const originalLines = raw.split("\n");
	const lineNumbersToDelete = new Set<number>();

	for (const change of record.changes ?? []) {
		if (change.kind !== "delete_line" || !change.ref) {
			continue;
		}

		const match = change.ref.match(/:(\d+)$/);
		if (match) {
			lineNumbersToDelete.add(Number.parseInt(match[1], 10));
		}
	}

	const nextLines = originalLines.filter(
		(_, index) => !lineNumbersToDelete.has(index + 1),
	);
	await writeFile(memoryFilePath, nextLines.join("\n"), "utf8");
}
