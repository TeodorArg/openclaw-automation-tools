export type CanonStatus = "clean" | "warning" | "critical";
export type CanonScope = "source" | "memory" | "sync";
export type CanonFindingKind =
	| "source_drift"
	| "memory_drift"
	| "template_drift"
	| "post_pass_gap";
export type CanonSeverity = "info" | "warning" | "critical";
export type CanonEvidenceKind = "file" | "memory" | "task" | "runtime";
export type CanonSourceOfTruthKind =
	| "file"
	| "doc"
	| "memory_policy"
	| "runtime_rule";
export type CanonFixDisposition =
	| "safe_apply"
	| "proposal_only"
	| "manual_only";

export type CanonEvidence = {
	kind: CanonEvidenceKind;
	ref?: string;
	detail: string;
};

export type CanonSourceOfTruth = {
	kind: CanonSourceOfTruthKind;
	ref: string;
	note?: string;
};

export type CanonFinding = {
	id: string;
	kind: CanonFindingKind;
	severity: CanonSeverity;
	evidence: CanonEvidence[];
	sourceOfTruth?: CanonSourceOfTruth;
	recommendedAction: string;
	canAutoFix: boolean;
	requiresConfirmation: boolean;
	fixDisposition: CanonFixDisposition;
};

export type CanonFollowupKind =
	| "rebuild"
	| "restart"
	| "redeploy"
	| "template_sync"
	| "pointer_rebuild"
	| "todo_cleanup";

export type CanonFollowup = {
	kind: CanonFollowupKind;
	detail: string;
};

export type CanonProposal = {
	id: string;
	title: string;
	summary: string;
	targetIds: string[];
	requiresConfirmation: boolean;
	canAutoFix: boolean;
	fixDisposition: CanonFixDisposition;
	confidence?: "low" | "medium" | "high";
	evidence: CanonEvidence[];
};

export type CanonSummary = {
	headline: string;
	findingCounts: {
		info: number;
		warning: number;
		critical: number;
	};
	stale: boolean;
	recommendedNextAction?: string;
};

export type CanonStatusResult = {
	status: CanonStatus;
	generatedAt: string;
	summary: CanonSummary;
	findings?: CanonFinding[];
	stale?: boolean;
	ageSeconds?: number;
	followups?: CanonFollowup[];
};

export type CanonDoctorResult = {
	status: CanonStatus;
	scope: CanonScope;
	generatedAt: string;
	findings: CanonFinding[];
	followups?: CanonFollowup[];
	proposals?: CanonProposal[];
	taskRef?: string;
};

export type CanonFixMode = "preview" | "apply";

export type CanonChange =
	| {
			kind: "delete_line";
			targetId: string;
			ref?: string;
			detail: string;
	  }
	| {
			kind: "rewrite_block";
			targetId: string;
			ref?: string;
			detail: string;
			content: string;
	  };

export type CanonFixResult = {
	status: CanonStatus;
	scope: CanonScope;
	mode: CanonFixMode;
	generatedAt: string;
	changes?: CanonChange[];
	findings?: CanonFinding[];
	followups?: CanonFollowup[];
	proposals?: CanonProposal[];
	taskRef?: string;
	confirmToken?: string;
};

export function buildStatusFromFindings(findings: CanonFinding[]): CanonStatus {
	if (findings.some((finding) => finding.severity === "critical")) {
		return "critical";
	}

	if (findings.some((finding) => finding.severity === "warning")) {
		return "warning";
	}

	return "clean";
}

export function buildFindingCounts(
	findings: CanonFinding[],
): CanonSummary["findingCounts"] {
	const counts: CanonSummary["findingCounts"] = {
		info: 0,
		warning: 0,
		critical: 0,
	};

	for (const finding of findings) {
		counts[finding.severity] += 1;
	}

	return counts;
}

export function normalizeResultInvariants<
	T extends {
		status: CanonStatus;
		findings?: CanonFinding[];
		proposals?: CanonProposal[];
	},
>(result: T): T {
	const findings = result.findings ?? [];
	const expectedStatus =
		findings.length === 0 && (result.proposals?.length ?? 0) > 0
			? "warning"
			: buildStatusFromFindings(findings);

	if (result.status !== expectedStatus) {
		return {
			...result,
			status: expectedStatus,
		};
	}

	if (result.status === "clean" && (result.proposals?.length ?? 0) > 0) {
		throw new Error("Clean canon results cannot carry proposals.");
	}

	return result;
}
