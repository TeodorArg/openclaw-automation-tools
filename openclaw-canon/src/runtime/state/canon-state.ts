import type {
	CanonDoctorResult,
	CanonFixResult,
	CanonStatusResult,
} from "../report/canon-contract.js";

export type CanonPreviewRecord = {
	token: string;
	targetIds: string[];
	createdAt: string;
	expiresAt: string;
	consumedAt?: string;
	changes: CanonFixResult["changes"];
	proposals: CanonFixResult["proposals"];
};

export type CanonState = {
	version: 1;
	updatedAt: string;
	latestSummary?: CanonStatusResult;
	reports: Partial<Record<"source" | "memory" | "sync", CanonDoctorResult>>;
	previews: CanonPreviewRecord[];
};

export function createEmptyCanonState(): CanonState {
	return {
		version: 1,
		updatedAt: new Date().toISOString(),
		reports: {},
		previews: [],
	};
}

export function updateCanonSummary(
	state: CanonState,
	summary: CanonStatusResult,
): CanonState {
	return {
		...state,
		updatedAt: summary.generatedAt,
		latestSummary: summary,
	};
}

export function updateCanonReport(
	state: CanonState,
	report: CanonDoctorResult,
): CanonState {
	return {
		...state,
		updatedAt: report.generatedAt,
		reports: {
			...state.reports,
			[report.scope]: report,
		},
	};
}

export function upsertPreviewRecord(
	state: CanonState,
	record: CanonPreviewRecord,
): CanonState {
	const nextPreviews = state.previews
		.filter((preview) => preview.token !== record.token)
		.concat(record)
		.slice(-20);

	return {
		...state,
		updatedAt: record.createdAt,
		previews: nextPreviews,
	};
}

export function consumePreviewRecord(
	state: CanonState,
	token: string,
): CanonState {
	const consumedAt = new Date().toISOString();

	return {
		...state,
		updatedAt: consumedAt,
		previews: state.previews.map((preview) =>
			preview.token === token ? { ...preview, consumedAt } : preview,
		),
	};
}
