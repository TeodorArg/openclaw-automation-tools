import { existsSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_CANON_ROOT = "/home/node/tools";

const CANON_ROOT_MARKERS = [
	{ relativePath: "docs/PLUGIN_PACKAGE_CANON.md", score: 6 },
	{ relativePath: "memory.jsonl", score: 5 },
	{ relativePath: "docs/CLAWHUB_PUBLISH_PREFLIGHT.md", score: 4 },
	{ relativePath: ".github/workflows/ci.yml", score: 3 },
	{ relativePath: "README.md", score: 1 },
] as const;

function uniqueRoots(values: Array<string | undefined>): string[] {
	const seen = new Set<string>();
	const results: string[] = [];

	for (const value of values) {
		const trimmed = value?.trim();

		if (!trimmed) {
			continue;
		}

		const absolute = resolve(trimmed);

		if (seen.has(absolute)) {
			continue;
		}

		seen.add(absolute);
		results.push(absolute);
	}

	return results;
}

function scoreRoot(root: string): number {
	return CANON_ROOT_MARKERS.reduce((total, marker) => {
		return (
			total +
			(existsSync(resolve(root, marker.relativePath)) ? marker.score : 0)
		);
	}, 0);
}

export function resolveCanonRoot(): string {
	const candidates = uniqueRoots([
		process.env.OPENCLAW_PROJECT_DIR,
		process.env.OPENCLAW_PLUGIN_SOURCE_ROOT,
		DEFAULT_CANON_ROOT,
		process.env.OPENCLAW_WORKSPACE_CONTAINER_DIR,
		process.env.OPENCLAW_WORKSPACE_DIR,
		process.cwd(),
	]);

	let bestRoot = candidates[0] ?? resolve(DEFAULT_CANON_ROOT);
	let bestScore = -1;

	for (const candidate of candidates) {
		const score = scoreRoot(candidate);

		if (score > bestScore) {
			bestRoot = candidate;
			bestScore = score;
		}
	}

	return bestRoot;
}

export function resolveFallbackPath(relativePath: string): string {
	return resolve(resolveCanonRoot(), relativePath);
}
