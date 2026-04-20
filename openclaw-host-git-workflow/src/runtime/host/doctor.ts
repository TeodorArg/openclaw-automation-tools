import type { HostCommandRunner } from "../node/execution.js";
import type { HostNodeSelection } from "../node/selection.js";
import type { ResolvedRepoTarget } from "../repo/repo-resolution.js";
import { preflightHostOps } from "./preflight.js";

export type HostDoctorCheck = {
	id:
		| "repo_resolution"
		| "node_binding"
		| "host_repo"
		| "git_binary"
		| "origin_remote"
		| "github_cli_auth"
		| "remote_push_readiness";
	status: "ready" | "attention" | "blocked";
	summary: string;
};

export type HostDoctorResult = {
	status: "ready" | "needs_attention";
	repoResolution: ResolvedRepoTarget;
	nodeSelection: HostNodeSelection;
	checks: HostDoctorCheck[];
	hostPreflight: {
		repoPath: string;
		repoRoot: string;
		gitBin: string;
		ghBin: string;
		currentBranch: string;
		originUrl: string;
		ghAuthStatus: "ready";
		remoteReadiness: {
			protocol: "ssh" | "https" | "other";
			sshAuthStatus: "ready" | "blocked" | "skipped";
			knownHostsStatus: "ready" | "blocked" | "skipped";
			issues: string[];
			remediationCommands: string[];
		};
	} | null;
	nextSuggestedAction: "plan_with_branches" | "fix_doctor_findings";
};

export async function runHostWorkflowDoctor(params: {
	repoResolution: ResolvedRepoTarget;
	nodeSelection: HostNodeSelection;
	runner: HostCommandRunner | null;
}): Promise<HostDoctorResult> {
	const checks: HostDoctorCheck[] = [
		{
			id: "repo_resolution",
			status: "ready",
			summary: params.repoResolution.usedDefault
				? `Repo path resolved from the package default ${params.repoResolution.repoPath}.`
				: `Repo path resolved from ${params.repoResolution.resolutionSource}: ${params.repoResolution.repoPath}.`,
		},
	];

	const nodeStatus =
		params.nodeSelection.runtimeBindingStatus === "bound"
			? "ready"
			: params.nodeSelection.runtimeBindingStatus === "selection_required"
				? "attention"
				: "blocked";
	checks.push({
		id: "node_binding",
		status: nodeStatus,
		summary: params.nodeSelection.note,
	});

	if (!params.runner) {
		return {
			status: nodeStatus === "ready" ? "ready" : "needs_attention",
			repoResolution: params.repoResolution,
			nodeSelection: params.nodeSelection,
			checks,
			hostPreflight: null,
			nextSuggestedAction:
				nodeStatus === "ready" ? "plan_with_branches" : "fix_doctor_findings",
		};
	}

	try {
		const preflight = await preflightHostOps(
			params.repoResolution.repoPath,
			{
				requireGhAuth: true,
				requireNonMainBranch: false,
			},
			params.runner,
		);
		checks.push(
			{
				id: "host_repo",
				status: "ready",
				summary: `Host repo is reachable at ${preflight.repoRoot} on branch ${preflight.currentBranch}.`,
			},
			{
				id: "git_binary",
				status: "ready",
				summary: `Git is available on the bound host node as ${preflight.gitBin}.`,
			},
			{
				id: "origin_remote",
				status: "ready",
				summary: `Git remote origin resolves to ${preflight.originUrl}.`,
			},
			{
				id: "github_cli_auth",
				status: "ready",
				summary: `GitHub CLI auth is ready on the bound host node via ${preflight.ghBin}.`,
			},
			{
				id: "remote_push_readiness",
				status:
					preflight.remoteReadiness.issues.length === 0 ? "ready" : "attention",
				summary:
					preflight.remoteReadiness.issues.length === 0
						? `Remote ${preflight.remoteReadiness.protocol} push/PR readiness checks passed on the bound host node.`
						: [
								`Remote ${preflight.remoteReadiness.protocol} push/PR readiness needs attention.`,
								...preflight.remoteReadiness.issues,
								preflight.remoteReadiness.remediationCommands.length > 0
									? `Run on the host: ${preflight.remoteReadiness.remediationCommands.join(" ; ")}`
									: "",
							]
								.filter(Boolean)
								.join(" "),
			},
		);

		return {
			status: "ready",
			repoResolution: params.repoResolution,
			nodeSelection: params.nodeSelection,
			checks,
			hostPreflight: {
				...preflight,
				ghAuthStatus: "ready",
			},
			nextSuggestedAction: "plan_with_branches",
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		checks.push(
			{
				id: "host_repo",
				status: "blocked",
				summary: message,
			},
			{
				id: "git_binary",
				status: "attention",
				summary:
					"Git binary, repo root, origin remote, and GitHub CLI auth stay coupled to the host preflight result.",
			},
			{
				id: "origin_remote",
				status: "attention",
				summary:
					"Origin remote readiness is reported from the same bounded host preflight loop.",
			},
			{
				id: "github_cli_auth",
				status: "attention",
				summary:
					"GitHub CLI auth readiness is reported from the same bounded host preflight loop.",
			},
			{
				id: "remote_push_readiness",
				status: "attention",
				summary:
					"Remote push/PR readiness is reported from the same bounded host preflight loop and should surface concrete host remediation commands when blocked.",
			},
		);

		return {
			status: "needs_attention",
			repoResolution: params.repoResolution,
			nodeSelection: params.nodeSelection,
			checks,
			hostPreflight: null,
			nextSuggestedAction: "fix_doctor_findings",
		};
	}
}
