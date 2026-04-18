import { Type } from "@sinclair/typebox";
import { auditMemoryFile } from "./runtime/doctor/memory-doctor.js";
import { auditPackageCanon } from "./runtime/doctor/package-canon.js";
import { auditCanonSync } from "./runtime/doctor/sync-doctor.js";
import {
	buildStatusFromFindings,
	type CanonDoctorResult,
	normalizeResultInvariants,
} from "./runtime/report/canon-contract.js";
import { formatJsonContent } from "./runtime/report/json-content.js";
import { loadCanonState, saveCanonState } from "./runtime/state/canon-file.js";
import {
	updateCanonReport,
	updateCanonSummary,
} from "./runtime/state/canon-state.js";
import { buildCanonSummary } from "./runtime/status/status-summary.js";

const CanonDoctorSchema = Type.Object(
	{
		scope: Type.Union([
			Type.Literal("source"),
			Type.Literal("memory"),
			Type.Literal("sync"),
		]),
		execution: Type.Optional(
			Type.Union([Type.Literal("inline"), Type.Literal("auto")]),
		),
	},
	{ additionalProperties: false },
);

type CanonDoctorParams = {
	scope: "source" | "memory" | "sync";
	execution?: "inline" | "auto";
};

type CanonDoctorToolOptions = {
	pluginConfig?: {
		stateFilePath?: unknown;
		memoryFilePath?: unknown;
		packageCanonPath?: unknown;
		publishPreflightPath?: unknown;
		repoReadmePath?: unknown;
		ciWorkflowPath?: unknown;
	};
};

export function createCanonDoctorTool(options: CanonDoctorToolOptions = {}) {
	return {
		name: "canon_doctor",
		description:
			"Runs bounded canon diagnosis for source, memory, or sync and returns typed findings.",
		parameters: CanonDoctorSchema,
		async execute(_toolCallId: string, params: CanonDoctorParams) {
			const generatedAt = new Date().toISOString();
			let result: CanonDoctorResult;

			if (params.scope === "source") {
				const audit = await auditPackageCanon(options.pluginConfig);
				result = {
					status: buildStatusFromFindings(audit.findings),
					scope: "source",
					generatedAt,
					findings: audit.findings,
					proposals: audit.proposals.length > 0 ? audit.proposals : undefined,
				};
			} else if (params.scope === "memory") {
				const audit = await auditMemoryFile(options.pluginConfig);
				result = {
					status: buildStatusFromFindings(audit.findings),
					scope: "memory",
					generatedAt,
					findings: audit.findings,
					followups:
						audit.findings.length > 0
							? [
									{
										kind: "pointer_rebuild",
										detail:
											"If memory canon changed materially, sync MCP memory and the local memory.jsonl snapshot together.",
									},
								]
							: undefined,
				};
			} else {
				const audit = await auditCanonSync(options.pluginConfig);
				result = {
					status: buildStatusFromFindings(audit.findings),
					scope: "sync",
					generatedAt,
					findings: audit.findings,
				};
			}

			const normalized = normalizeResultInvariants(result);
			const { state } = await loadCanonState(options.pluginConfig);
			const nextState = updateCanonSummary(
				updateCanonReport(state, normalized),
				{
					status: normalized.status,
					generatedAt,
					stale: false,
					findings: normalized.findings,
					followups: normalized.followups,
					summary: buildCanonSummary(
						`Latest canon report for ${normalized.scope}`,
						normalized.findings,
						false,
						normalized.findings.length > 0
							? "Review findings and preview allowed fixes."
							: "No canon drift detected for this scope.",
					),
				},
			);
			await saveCanonState(nextState, options.pluginConfig);
			return formatJsonContent(normalized);
		},
	};
}
