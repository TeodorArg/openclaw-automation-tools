# Migration Tables

Date: 2026-04-16
Status: planning baseline for Slice C and later unit migrations

## Purpose

This document converts the reorg plan into concrete file mapping tables.
It exists to remove guesswork before any file moves begin.

Use it together with:
- [REPO_REORG_PLAN.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/REPO_REORG_PLAN.md)
- [SOURCE_INVENTORY.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/SOURCE_INVENTORY.md)
- [MIGRATION_EXECUTION_FLOW.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/MIGRATION_EXECUTION_FLOW.md)

## Action keys

- `move` — canonical file moves into the new package folder
- `copy` — canonical content is copied, not removed from its source in the same slice
- `rewrite` — new package-local doc synthesized from canonical source inputs
- `generate` — new repo/package file created to support the new structure
- `drop` — explicitly not carried into the target unit
- `link` — keep as external canonical reference rather than copying source content

## 1. `openclaw-git-workflow`

Target unit type:
- plugin + bundled skill package

Target folder:
- `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/`

| Current path | Target path | Action | Reason / source-of-truth note |
| --- | --- | --- | --- |
| `plugin/package.json` | `openclaw-git-workflow/package.json` | `move` | live plugin manifest |
| `plugin/openclaw.plugin.json` | `openclaw-git-workflow/openclaw.plugin.json` | `move` | live plugin manifest |
| `plugin/index.ts` | `openclaw-git-workflow/index.ts` | `move` | live package entrypoint |
| `plugin/api.ts` | `openclaw-git-workflow/api.ts` | `move` | live package API surface |
| `plugin/src/**` | `openclaw-git-workflow/src/**` | `move` | live runtime source and tests |
| `plugin/scripts/**` | `openclaw-git-workflow/scripts/**` | `move` | bounded package-local helper scripts |
| `plugin/skills/openclaw-git-workflow/SKILL.md` | `openclaw-git-workflow/skills/openclaw-git-workflow/SKILL.md` | `move` | shipped bundled skill |
| `plugin/README.md` | `openclaw-git-workflow/README.md` | `move` | package README source |
| `plugin/EXECUTE_SURFACE.md` | `openclaw-git-workflow/EXECUTE_SURFACE.md` | `move` | package command-surface contract |
| `plugin/tsconfig.json` | `openclaw-git-workflow/tsconfig.json` | `move` | build baseline |
| `plugin/tsconfig.build.json` | `openclaw-git-workflow/tsconfig.build.json` | `move` | build baseline |
| `plugin/pnpm-lock.yaml` | `openclaw-git-workflow/pnpm-lock.yaml` | `move` | install reproducibility for the package |
| `plugin/dist/**` | none | `drop` | generated output, not source-of-truth |
| `plugin/node_modules/**` | none | `drop` | dependency tree, not source-of-truth |
| `plugin/.pack/**` | none | `drop` | package artifact, not source-of-truth |

## 2. `memory-hygiene`

Target unit type:
- skill-only package

Target folder:
- `/Users/svarnoy85/teodorArg/openclaw-git-workflow/memory-hygiene/`

| Current path | Target path | Action | Reason / source-of-truth note |
| --- | --- | --- | --- |
| `/home/node/workspace/skills/memory-hygiene/SKILL.md` | `memory-hygiene/SKILL.md` | `copy` | strongest live canonical skill source |
| none | `memory-hygiene/README.md` | `rewrite` | package contract and publication-facing summary |
| none | `memory-hygiene/LICENSE` | `generate` | skill publication requires package-local `MIT-0` |
| `/home/node/project/templates/skills/memory-hygiene/SKILL.md` | none | `link` | secondary template reference only |
| `/home/node/project/workspace/skills/memory-hygiene/SKILL.md` | none | `link` | secondary seed reference only |

Publication metadata to prefill in docs:
- slug: `memory-hygiene`
- display name: `Memory Hygiene`
- owner: `TBD`
- version: `0.1.0`
- tags: `memory`, `workflow`, `maintenance`

## 3. `source-of-truth-fix`

Target unit type:
- skill-only package

Target folder:
- `/Users/svarnoy85/teodorArg/openclaw-git-workflow/source-of-truth-fix/`

| Current path | Target path | Action | Reason / source-of-truth note |
| --- | --- | --- | --- |
| `/home/node/.openclaw/skills/source-of-truth-fix/SKILL.md` | `source-of-truth-fix/SKILL.md` | `copy` | strongest live canonical skill source |
| none | `source-of-truth-fix/README.md` | `rewrite` | package contract and usage boundaries |
| none | `source-of-truth-fix/LICENSE` | `generate` | skill publication requires package-local `MIT-0` |
| `/Users/svarnoy85/teodorArg/OpenClaw/templates/workspace-context/AGENTS.md` | none | `link` | contextual reference only |
| `/Users/svarnoy85/teodorArg/OpenClaw/templates/workspace-context/USER.md` | none | `link` | contextual reference only |

Publication metadata to prefill in docs:
- slug: `source-of-truth-fix`
- display name: `Source Of Truth Fix`
- owner: `TBD`
- version: `0.1.0`
- tags: `docs`, `verification`, `source-of-truth`

## 4. `openclaw-host-git-pr`

Target unit type:
- skill-only package

Target folder:
- `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-host-git-pr/`

### Exact target file set

- `openclaw-host-git-pr/SKILL.md`
- `openclaw-host-git-pr/README.md`
- `openclaw-host-git-pr/LICENSE`
- optional `.gitignore` only if package workflow proves it is needed

### README contract to ship

The package README must explicitly contain:
- what the skill does: bounded host-backed PR preparation and PR lane guidance
- what it does not do: no local runtime code, no bundled bridge implementation, no direct package-owned transport
- supported command surface / intents: PR-oriented operator commands only
- runtime boundary: execution depends on external `host-git-lane/`
- preflight requirements: host git identity, host GitHub auth, clean target branch assumptions, operator confirmation
- manual approval boundary: push and PR stay explicit host-backed actions
- publication metadata block: slug, display name, owner, version, tags, license

### Publication metadata to prefill in docs

- slug: `openclaw-host-git-pr`
- display name: `OpenClaw Host Git PR`
- owner: `TBD`
- version: `0.1.0`
- tags: `git`, `github`, `pr`, `host`
- license: `MIT-0`

| Current path | Target path | Action | Reason / source-of-truth note |
| --- | --- | --- | --- |
| `/home/node/.openclaw/extensions/openclaw-host-git-push/skills/openclaw-host-git-pr/SKILL.md` | `openclaw-host-git-pr/SKILL.md` | `copy` | strongest live skill text available today |
| `plugin-host-git-push/skills/openclaw-host-git-pr/SKILL.md` from git history | `openclaw-host-git-pr/SKILL.md` | `rewrite` | historical git source is allowed rewrite input for missing or stale wording |
| durable bridge wording from legacy docs | `openclaw-host-git-pr/README.md` | `rewrite` | rewrite only the stable contract, not legacy operations history |
| none | `openclaw-host-git-pr/LICENSE` | `generate` | skill publication requires package-local `MIT-0` |
| legacy runtime files under `plugin-host-git-push/src/**` | none | `drop` | package is skill-only; no local runtime code justified |
| legacy `package.json` / `openclaw.plugin.json` | none | `drop` | explicitly out of scope for this unit |
| copied `dist/**` | none | `drop` | installed or built output is not source-of-truth |

## 5. `host-git-lane`

Target unit type:
- companion adapter/service layer

Target folder:
- `/Users/svarnoy85/teodorArg/openclaw-git-workflow/host-git-lane/`

### Exact local file set

- `host-git-lane/README.md`
- `host-git-lane/HOST_GIT_BOUNDARY.md`
- `host-git-lane/HOST_PATHS_AND_REPO_RESOLUTION.md`
- `host-git-lane/GITHUB_AUTH_AND_PR_FLOW.md`
- `host-git-lane/CANONICAL_REFS.md`

Optional only if later justified by canonical source:
- `host-git-lane/examples/`
- `host-git-lane/schemas/`
- `host-git-lane/scripts/README.md`

### Content contract for each file

- `README.md`
  - explain why this is a companion folder and not a publishable package
  - define relation to `openclaw-git-workflow` and `openclaw-host-git-pr`
- `HOST_GIT_BOUNDARY.md`
  - define host-only boundary for git auth, GitHub auth, push, and PR
  - make clear these are not runtime/container shipped capabilities
- `HOST_PATHS_AND_REPO_RESOLUTION.md`
  - record host vs container path mapping
  - define repo resolution order and non-canonical paths
- `GITHUB_AUTH_AND_PR_FLOW.md`
  - capture the durable `gh` / SSH / push / PR operator flow from `OpenClaw` canon
- `CANONICAL_REFS.md`
  - list exact upstream canonical docs in `OpenClaw` and what each one governs

| Canonical source input | Target path | Action | Reason / source-of-truth note |
| --- | --- | --- | --- |
| `/Users/svarnoy85/teodorArg/OpenClaw/GIT_GUIDANCE.md` | `host-git-lane/HOST_GIT_BOUNDARY.md` | `rewrite` | canonical host git and PR boundary |
| `/Users/svarnoy85/teodorArg/OpenClaw/GIT_GUIDANCE.md` | `host-git-lane/GITHUB_AUTH_AND_PR_FLOW.md` | `rewrite` | canonical host auth and PR flow |
| `/Users/svarnoy85/teodorArg/OpenClaw/README.md` | `host-git-lane/README.md` | `rewrite` | product-level host-backed lane context |
| `/Users/svarnoy85/teodorArg/OpenClaw/WORKSPACE_ARCHITECTURE.md` | `host-git-lane/HOST_PATHS_AND_REPO_RESOLUTION.md` | `rewrite` | canonical host/container path semantics |
| `/Users/svarnoy85/teodorArg/OpenClaw/templates/openclaw/OPENCLAW_BOOTSTRAP_BASELINE.jsonc` | `host-git-lane/CANONICAL_REFS.md` | `link` | install/runtime evidence, not local source code |
| any discovered standalone mac-node package manifest | none for now | `link` | no such manifest is currently evidenced |
| installed runtime output | none | `drop` | not canonical source for this unit |
| fake `package.json` / `openclaw.plugin.json` | none | `drop` | explicitly forbidden for this companion layer |

## 6. legacy `openclaw-host-git-push`

Use only as reference input.

| Current path | Target path | Action | Reason / source-of-truth note |
| --- | --- | --- | --- |
| historical `plugin-host-git-push/skills/openclaw-host-git-pr/SKILL.md` | `openclaw-host-git-pr/SKILL.md` | `rewrite` | allowed rewrite input |
| historical bridge docs | `openclaw-host-git-pr/README.md` or `host-git-lane/*.md` | `rewrite` | rewrite only durable boundary wording |
| historical plugin runtime | none | `drop` | not a target package and not current live source |

## 7. Slice C prerequisites now considered documented

These repo-level planning artifacts are now expected before the first move of `plugin/`:
- this file for file mapping
- root [README.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/README.md) as repo index
- [CI_MIGRATION_PLAN.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/CI_MIGRATION_PLAN.md) for the `plugin/` to multi-unit transition
