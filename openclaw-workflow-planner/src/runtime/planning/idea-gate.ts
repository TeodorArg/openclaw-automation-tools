import type {
	PlannerIdeaGate,
	PlannerIdeaGateDecision,
	PlannerResearch,
} from "../state/planner-state.js";

export type IdeaGateInput = {
	ideaName: string;
	problem: string;
	requestedOutcome: string;
	research: PlannerResearch;
};

export type IdeaGateResult = Omit<PlannerIdeaGate, "decidedAt">;

function buildDecision(
	decision: PlannerIdeaGateDecision,
	reasoning: string[],
	nextSuggestedAction: IdeaGateResult["nextSuggestedAction"],
): IdeaGateResult {
	return {
		decision,
		reasoning,
		nextSuggestedAction,
	};
}

export function evaluateIdeaGate(input: IdeaGateInput): IdeaGateResult {
	const reasoning = [
		`Idea: ${input.ideaName}`,
		`Problem: ${input.problem}`,
		`Requested outcome: ${input.requestedOutcome}`,
		`Value assessed as ${input.research.valueAssessment}.`,
		`Risk assessed as ${input.research.riskAssessment}.`,
		`Existing coverage assessed as ${input.research.existingCoverage}.`,
		`Fit assessment: ${input.research.fitAssessment}`,
		`Research summary: ${input.research.summary}`,
	];

	if (input.research.openQuestions?.length) {
		reasoning.push(
			`Open questions: ${input.research.openQuestions.join("; ")}`,
		);
	}

	if (input.research.riskAssessment === "unsafe") {
		return buildDecision(
			"rejected",
			reasoning.concat(
				"Unsafe ideas should not proceed into planning until the risk model changes.",
			),
			"stop",
		);
	}

	if (
		input.research.valueAssessment === "low" &&
		input.research.existingCoverage === "strong"
	) {
		return buildDecision(
			"rejected",
			reasoning.concat(
				"The value is low and existing coverage is already strong, so new work is not justified.",
			),
			"stop",
		);
	}

	if (
		input.research.riskAssessment === "caution" ||
		(input.research.valueAssessment === "medium" &&
			input.research.existingCoverage === "strong")
	) {
		return buildDecision(
			"needs_research",
			reasoning.concat(
				"The idea may still be viable, but it needs more evidence or tighter scoping before planning.",
			),
			"research_attach",
		);
	}

	if (input.research.valueAssessment === "low") {
		return buildDecision(
			"deferred",
			reasoning.concat(
				"The idea is not strong enough for immediate work, but it may be worth revisiting later.",
			),
			"narrow_scope",
		);
	}

	return buildDecision(
		"accepted",
		reasoning.concat(
			"The idea clears the initial gate and can move into explicit plan creation.",
		),
		"plan_create",
	);
}
