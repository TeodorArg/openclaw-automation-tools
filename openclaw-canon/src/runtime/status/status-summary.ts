import {
	buildFindingCounts,
	type CanonFinding,
	type CanonStatusResult,
	type CanonSummary,
} from "../report/canon-contract.js";
import type { CanonState } from "../state/canon-state.js";

export function buildCanonSummary(
	headline: string,
	findings: CanonFinding[],
	stale: boolean,
	recommendedNextAction?: string,
): CanonSummary {
	return {
		headline,
		findingCounts: buildFindingCounts(findings),
		stale,
		recommendedNextAction,
	};
}

export function buildStatusSnapshot(
	state: CanonState,
	refresh: "none" | "light",
): CanonStatusResult {
	const now = new Date();
	const latestSummary = state.latestSummary;

	if (!latestSummary) {
		return {
			status: "warning",
			generatedAt: now.toISOString(),
			stale: true,
			summary: {
				headline: "No canon summary has been generated yet.",
				findingCounts: {
					info: 0,
					warning: 1,
					critical: 0,
				},
				stale: true,
				recommendedNextAction: "Run canon_doctor for a concrete scope.",
			},
			findings: [
				{
					id: "status-missing-summary",
					kind: "post_pass_gap",
					severity: "warning",
					evidence: [
						{
							kind: "runtime",
							detail: "No prior canon summary exists in plugin-owned state.",
						},
					],
					recommendedAction: "Run canon_doctor source, memory, or sync.",
					canAutoFix: false,
					requiresConfirmation: false,
					fixDisposition: "manual_only",
				},
			],
		};
	}

	const ageSeconds = Math.max(
		0,
		Math.floor((now.getTime() - Date.parse(latestSummary.generatedAt)) / 1000),
	);
	const stale =
		refresh === "light" ? ageSeconds > 900 : (latestSummary.stale ?? false);

	return {
		...latestSummary,
		generatedAt: now.toISOString(),
		stale,
		ageSeconds,
		summary: {
			...latestSummary.summary,
			stale,
		},
	};
}
