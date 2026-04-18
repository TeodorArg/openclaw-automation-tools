import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { scanMemoryFileContent } from "../doctor/memory-record-scan.js";
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

export async function buildMemoryFixPlan(
	pluginConfig?: CanonPluginConfig,
	targetIds?: string[],
): Promise<MemoryFixPlan> {
	const memoryFilePath = resolveMemoryFilePath(pluginConfig);
	const raw = await readFile(memoryFilePath, "utf8");
	const changes: CanonChange[] = [];
	const proposals: CanonProposal[] = [];

	for (const entry of scanMemoryFileContent(raw)) {
		if (entry.parseError) {
			const targetId = `memory-invalid-json-${entry.lineNumber}`;
			if (!targetIds || targetIds.includes(targetId)) {
				changes.push({
					kind: "delete_line",
					targetId,
					ref: `${memoryFilePath}:${entry.lineNumber}`,
					detail: "Delete malformed JSON line from memory.jsonl.",
				});
				proposals.push(
					buildProposal(
						`proposal-${targetId}`,
						"Remove malformed memory line",
						targetId,
						`${memoryFilePath}:${entry.lineNumber}`,
						"Line is not valid JSON and can be removed safely after preview.",
					),
				);
			}
			continue;
		}

		if (entry.invalidShape) {
			const targetId = `memory-invalid-shape-${entry.lineNumber}`;
			if (!targetIds || targetIds.includes(targetId)) {
				changes.push({
					kind: "delete_line",
					targetId,
					ref: `${memoryFilePath}:${entry.lineNumber}`,
					detail:
						"Delete valid JSON memory record that does not match the required shape.",
				});
				proposals.push(
					buildProposal(
						`proposal-${targetId}`,
						"Remove malformed-shape memory record",
						targetId,
						`${memoryFilePath}:${entry.lineNumber}`,
						"Line parses as JSON but does not include the required memory fields.",
					),
				);
			}
			continue;
		}

		if (entry.duplicateOfLine) {
			const targetId = `memory-duplicate-${entry.duplicateOfLine}-${entry.lineNumber}`;
			if (!targetIds || targetIds.includes(targetId)) {
				changes.push({
					kind: "delete_line",
					targetId,
					ref: `${memoryFilePath}:${entry.lineNumber}`,
					detail: "Remove byte-identical duplicate memory record.",
				});
				proposals.push(
					buildProposal(
						`proposal-${targetId}`,
						"Remove duplicate memory line",
						targetId,
						`${memoryFilePath}:${entry.lineNumber}`,
						"Later line is byte-identical to an earlier canonical record.",
					),
				);
			}
		}
	}

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
