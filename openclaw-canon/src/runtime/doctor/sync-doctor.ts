import { buildSyncDoctorFindings } from "../fix/sync-fix.js";
import type { CanonFinding } from "../report/canon-contract.js";

type CanonPluginConfig = {
	packageCanonPath?: unknown;
	publishPreflightPath?: unknown;
	repoReadmePath?: unknown;
	ciWorkflowPath?: unknown;
};

export async function auditCanonSync(
	pluginConfig?: CanonPluginConfig,
): Promise<{ findings: CanonFinding[] }> {
	return {
		findings: await buildSyncDoctorFindings(pluginConfig),
	};
}
