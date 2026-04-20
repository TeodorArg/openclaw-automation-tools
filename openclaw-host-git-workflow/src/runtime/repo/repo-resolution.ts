import path from "node:path";

export const DEFAULT_REPO_PATH = "/home/node/project";

export type RepoResolutionSource =
	| "pluginConfig.hostRepoPath"
	| "pluginConfig.pathMappings"
	| "OPENCLAW_HOST_GIT_WORKFLOW_REPO"
	| "OPENCLAW_PROJECT_DIR"
	| "default";

export type RepoPathMapping = {
	containerPath: string;
	hostPath: string;
};

export type ResolvedRepoTarget = {
	repoPath: string;
	requestedRepoPath: string;
	resolutionSource: RepoResolutionSource;
	usedDefault: boolean;
	hostPath: string;
	containerPath: string | null;
	pathMapping:
		| {
				applied: true;
				source: RepoResolutionSource;
				containerPath: string;
				hostPath: string;
		  }
		| {
				applied: false;
				source: RepoResolutionSource;
				containerPath: null;
				hostPath: string;
		  };
	resolutionDetail: {
		pathForHostExecution: string;
		pathForContainerDiscovery: string | null;
		shouldAvoidContainerPathForHostExecution: boolean;
	};
};

type RepoResolutionEnv = {
	OPENCLAW_HOST_GIT_WORKFLOW_REPO?: string;
	OPENCLAW_PROJECT_DIR?: string;
};

export type RepoResolutionPluginConfig = {
	hostRepoPath?: unknown;
	pathMappings?: unknown;
};

function readFirstNonEmpty(
	values: Array<{ source: RepoResolutionSource; value: string | undefined }>,
): { source: RepoResolutionSource; value: string } | null {
	for (const candidate of values) {
		if (candidate.value && candidate.value.trim() !== "") {
			return {
				source: candidate.source,
				value: candidate.value.trim(),
			};
		}
	}

	return null;
}

function readConfiguredHostRepoPath(
	pluginConfig?: RepoResolutionPluginConfig,
): string | null {
	if (typeof pluginConfig?.hostRepoPath !== "string") {
		return null;
	}

	const trimmed = pluginConfig.hostRepoPath.trim();
	return trimmed === "" ? null : trimmed;
}

function normalizePathMappings(
	pluginConfig?: RepoResolutionPluginConfig,
): RepoPathMapping[] {
	if (!Array.isArray(pluginConfig?.pathMappings)) {
		return [];
	}

	return pluginConfig.pathMappings.flatMap((entry) => {
		if (!entry || typeof entry !== "object") {
			return [];
		}

		const containerPath =
			typeof (entry as { containerPath?: unknown }).containerPath === "string"
				? (entry as { containerPath: string }).containerPath.trim()
				: "";
		const hostPath =
			typeof (entry as { hostPath?: unknown }).hostPath === "string"
				? (entry as { hostPath: string }).hostPath.trim()
				: "";

		if (containerPath === "" || hostPath === "") {
			return [];
		}

		return [
			{
				containerPath: path.resolve(containerPath),
				hostPath: path.resolve(hostPath),
			},
		];
	});
}

function applyPathMapping(
	requestedPath: string,
	mappings: RepoPathMapping[],
): RepoPathMapping | null {
	const normalizedRequestedPath = path.resolve(requestedPath);

	for (const mapping of mappings) {
		if (
			normalizedRequestedPath === mapping.containerPath ||
			normalizedRequestedPath.startsWith(`${mapping.containerPath}${path.sep}`)
		) {
			const relativeSuffix = path.relative(
				mapping.containerPath,
				normalizedRequestedPath,
			);
			return {
				containerPath: normalizedRequestedPath,
				hostPath: path.resolve(mapping.hostPath, relativeSuffix),
			};
		}
	}

	return null;
}

export function resolveRepoTarget(
	env: RepoResolutionEnv = process.env,
	pluginConfig?: RepoResolutionPluginConfig,
): ResolvedRepoTarget {
	const configuredHostRepoPath = readConfiguredHostRepoPath(pluginConfig);
	if (configuredHostRepoPath) {
		const resolvedHostPath = path.resolve(configuredHostRepoPath);
		return {
			repoPath: resolvedHostPath,
			requestedRepoPath: configuredHostRepoPath,
			resolutionSource: "pluginConfig.hostRepoPath",
			usedDefault: false,
			hostPath: resolvedHostPath,
			containerPath: null,
			pathMapping: {
				applied: false,
				source: "pluginConfig.hostRepoPath",
				containerPath: null,
				hostPath: resolvedHostPath,
			},
			resolutionDetail: {
				pathForHostExecution: resolvedHostPath,
				pathForContainerDiscovery: null,
				shouldAvoidContainerPathForHostExecution: true,
			},
		};
	}

	const explicitTarget = readFirstNonEmpty([
		{
			source: "OPENCLAW_HOST_GIT_WORKFLOW_REPO",
			value: env.OPENCLAW_HOST_GIT_WORKFLOW_REPO,
		},
		{
			source: "OPENCLAW_PROJECT_DIR",
			value: env.OPENCLAW_PROJECT_DIR,
		},
	]);

	if (explicitTarget) {
		const mappings = normalizePathMappings(pluginConfig);
		const mapped = applyPathMapping(explicitTarget.value, mappings);
		const requestedRepoPath = explicitTarget.value;

		if (mapped) {
			return {
				repoPath: mapped.hostPath,
				requestedRepoPath,
				resolutionSource: "pluginConfig.pathMappings",
				usedDefault: false,
				hostPath: mapped.hostPath,
				containerPath: mapped.containerPath,
				pathMapping: {
					applied: true,
					source: "pluginConfig.pathMappings",
					containerPath: mapped.containerPath,
					hostPath: mapped.hostPath,
				},
				resolutionDetail: {
					pathForHostExecution: mapped.hostPath,
					pathForContainerDiscovery: mapped.containerPath,
					shouldAvoidContainerPathForHostExecution: true,
				},
			};
		}

		const resolvedPath = path.resolve(explicitTarget.value);
		return {
			repoPath: resolvedPath,
			requestedRepoPath,
			resolutionSource: explicitTarget.source,
			usedDefault: false,
			hostPath: resolvedPath,
			containerPath: null,
			pathMapping: {
				applied: false,
				source: explicitTarget.source,
				containerPath: null,
				hostPath: resolvedPath,
			},
			resolutionDetail: {
				pathForHostExecution: resolvedPath,
				pathForContainerDiscovery: null,
				shouldAvoidContainerPathForHostExecution: false,
			},
		};
	}

	const resolvedDefault = path.resolve(DEFAULT_REPO_PATH);
	return {
		repoPath: resolvedDefault,
		requestedRepoPath: DEFAULT_REPO_PATH,
		resolutionSource: "default",
		usedDefault: true,
		hostPath: resolvedDefault,
		containerPath: null,
		pathMapping: {
			applied: false,
			source: "default",
			containerPath: null,
			hostPath: resolvedDefault,
		},
		resolutionDetail: {
			pathForHostExecution: resolvedDefault,
			pathForContainerDiscovery: resolvedDefault,
			shouldAvoidContainerPathForHostExecution: false,
		},
	};
}
