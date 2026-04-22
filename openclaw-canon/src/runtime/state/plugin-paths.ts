import { resolve } from "node:path";
import { resolveFallbackPath } from "./runtime-roots.js";

type CanonPluginConfig = {
	memoryFilePath?: unknown;
	packageCanonPath?: unknown;
	publishPreflightPath?: unknown;
	repoReadmePath?: unknown;
	ciWorkflowPath?: unknown;
};

function resolveOptionalPath(
	configuredValue: unknown,
	fallback: string,
): string {
	if (
		typeof configuredValue === "string" &&
		configuredValue.trim().length > 0
	) {
		return resolve(configuredValue.trim());
	}

	return resolveFallbackPath(fallback);
}

export function resolveMemoryFilePath(
	pluginConfig?: CanonPluginConfig,
): string {
	return resolveOptionalPath(pluginConfig?.memoryFilePath, "memory.jsonl");
}

export function resolvePackageCanonPath(
	pluginConfig?: CanonPluginConfig,
): string {
	return resolveOptionalPath(
		pluginConfig?.packageCanonPath,
		"docs/PLUGIN_PACKAGE_CANON.md",
	);
}

export function resolvePublishPreflightPath(
	pluginConfig?: CanonPluginConfig,
): string {
	return resolveOptionalPath(
		pluginConfig?.publishPreflightPath,
		"docs/CLAWHUB_PUBLISH_PREFLIGHT.md",
	);
}

export function resolveRepoReadmePath(
	pluginConfig?: CanonPluginConfig,
): string {
	return resolveOptionalPath(pluginConfig?.repoReadmePath, "README.md");
}

export function resolveCiWorkflowPath(
	pluginConfig?: CanonPluginConfig,
): string {
	return resolveOptionalPath(
		pluginConfig?.ciWorkflowPath,
		".github/workflows/ci.yml",
	);
}
