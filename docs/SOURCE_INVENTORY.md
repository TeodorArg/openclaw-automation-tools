# Source Inventory

Date: 2026-04-16
Status: verified against current repo state, `openclaw-gateway` runtime state, and adjacent local `OpenClaw` checkout

## Status taxonomy

- `live-source` — current editable canonical source path
- `installed-runtime` — installed artifact visible to the running gateway
- `historical-git` — source path available only through git history
- `derived-config` — config/docs path that records install/runtime state but is not source code
- `non-source` — observed path explicitly rejected as canonical source

## Inventory summary

| Unit | Classification | Canonical source verdict | Notes |
| --- | --- | --- | --- |
| `openclaw-git-workflow` | publishable plugin + bundled skill package | `live-source` in this repo under `openclaw-git-workflow/` | current working package baseline |
| `memory-hygiene` | skill-only package target | `live-source` is workspace skill copy | template/seed copies are secondary |
| `source-of-truth-fix` | skill-only package target | `live-source` is shared `~/.openclaw` skill copy | no repo-local source package exists yet |
| `openclaw-host-git-pr` | skill-only package target | current best source is installed skill + historical git source | runtime stays external to the package |
| legacy `openclaw-host-git-push` | historical bounded bridge plugin package | `historical-git` in this repo history under `plugin-host-git-push/` | installed runtime copy still exists |
| `host-git-lane` | companion adapter/service layer over product-level `openclaw node` transport | canonical source family is `OpenClaw` docs/config, not a standalone plugin package | chosen local companion-folder name is `host-git-lane/` |

## 1. `openclaw-git-workflow`

Classification:
- publishable plugin + bundled skill package

Canonical source:
- `live-source`: [openclaw-git-workflow](/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow)

Verified source files:
- [openclaw-git-workflow/package.json](/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/package.json)
- [openclaw-git-workflow/openclaw.plugin.json](/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/openclaw.plugin.json)
- [openclaw-git-workflow/index.ts](/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/index.ts)
- [openclaw-git-workflow/api.ts](/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/api.ts)
- [openclaw-git-workflow/src](/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/src)
- [openclaw-git-workflow/skills/openclaw-git-workflow/SKILL.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/skills/openclaw-git-workflow/SKILL.md)

Runtime/install evidence:
- `installed-runtime`: `/home/node/.openclaw/extensions/openclaw-git-workflow`
- `derived-config`: `/Users/svarnoy85/teodorArg/OpenClaw/templates/openclaw/OPENCLAW_BOOTSTRAP_BASELINE.jsonc`

Notes:
- `openclaw plugins inspect openclaw-git-workflow` reports an archive source path under `~/repos/...`, but `/home/node/repos` does not exist in the current container; treat that as install metadata only.

## 2. `memory-hygiene`

Classification:
- skill-only package target

Canonical source:
- `live-source`: `/home/node/workspace/skills/memory-hygiene/SKILL.md`

Secondary references:
- `derived-config`: `/home/node/project/templates/skills/memory-hygiene/SKILL.md`
- `derived-config`: `/home/node/project/workspace/skills/memory-hygiene/SKILL.md`

Notes:
- workspace copy is the strongest current source-of-truth because it is the active shared skill copy in the running setup.

## 3. `source-of-truth-fix`

Classification:
- skill-only package target

Canonical source:
- `live-source`: `/home/node/.openclaw/skills/source-of-truth-fix/SKILL.md`

Secondary references:
- `derived-config`: `/Users/svarnoy85/teodorArg/OpenClaw/templates/workspace-context/AGENTS.md`
- `derived-config`: `/Users/svarnoy85/teodorArg/OpenClaw/templates/workspace-context/USER.md`

Notes:
- current strongest source is the managed shared skill copy under `~/.openclaw/skills`.

## 4. `openclaw-host-git-pr`

Classification:
- skill-only package target
- runtime stays external to this package

Current strongest source inputs:
- `installed-runtime`: `/home/node/.openclaw/extensions/openclaw-host-git-push/skills/openclaw-host-git-pr/SKILL.md`
- `historical-git`: `plugin-host-git-push/skills/openclaw-host-git-pr/SKILL.md` in this repo history

Historical git evidence:
- added as bounded PR bridge in commit `2a490ce0039d5e5852516109e9a6af3811da66de`
- still present immediately before removal in commit parent `601102a04b74de9bea8dd03bc196d329d5abf161^`

Notes:
- current local filesystem has no standalone live source folder for `openclaw-host-git-pr`.
- until extracted, use the installed skill plus historical git source as the canonical rewrite input.
- package contents should be limited to skill instructions, publish metadata, and README/LICENSE; no local runtime code is currently justified.

Exact target file set:
- `openclaw-host-git-pr/SKILL.md`
- `openclaw-host-git-pr/README.md`
- `openclaw-host-git-pr/LICENSE`
- optional `.gitignore` only if package workflow really needs it

Publication metadata baseline:
- slug: `openclaw-host-git-pr`
- display name: `OpenClaw Host Git PR`
- owner: `TBD`
- version: `0.1.0`
- tags: `git`, `github`, `pr`, `host`
- license: `MIT-0`

Explicit non-files:
- no `package.json`
- no `openclaw.plugin.json`
- no `src/**`
- no copied `dist/**`

## 5. legacy `openclaw-host-git-push`

Classification:
- historical bounded bridge plugin package
- not a target package for the new repo layout

Historical canonical source:
- `historical-git`: `plugin-host-git-push/` in this repo history

Historical git evidence:
- package introduced in commit `cfbbd0cd66ab18ea45f36281630d40eee533974c`
- PR skill added in commit `2a490ce0039d5e5852516109e9a6af3811da66de`
- package removed from current tree in commit `601102a04b74de9bea8dd03bc196d329d5abf161`

Runtime/install evidence:
- `installed-runtime`: `/home/node/.openclaw/extensions/openclaw-host-git-push`
- `derived-config`: `/Users/svarnoy85/teodorArg/OpenClaw/templates/openclaw/OPENCLAW_BOOTSTRAP_BASELINE.jsonc`

Verified package metadata from installed runtime:
- package name: `@openclaw/openclaw-host-git-push`
- plugin id: `openclaw-host-git-push`

Non-source evidence:
- `non-source`: `/Users/svarnoy85/teodorArg/openclaw-host-git-push/`

Notes:
- the sibling host path exists but is empty, so it must not be treated as canonical source.
- use this package only as historical/runtime reference for extracting durable bridge contracts and skills.

## 6. `host-git-lane`

Classification verdict:
- companion adapter/service layer over product-level `openclaw node` transport
- not currently evidenced as a standalone publishable plugin package

Canonical source family:
- `live-source` for product-level canon:
  - [OpenClaw/GIT_GUIDANCE.md](/Users/svarnoy85/teodorArg/OpenClaw/GIT_GUIDANCE.md)
  - [OpenClaw/README.md](/Users/svarnoy85/teodorArg/OpenClaw/README.md)
  - [OpenClaw/WORKSPACE_ARCHITECTURE.md](/Users/svarnoy85/teodorArg/OpenClaw/WORKSPACE_ARCHITECTURE.md)
  - [OpenClaw/templates/openclaw/OPENCLAW_BOOTSTRAP_BASELINE.jsonc](/Users/svarnoy85/teodorArg/OpenClaw/templates/openclaw/OPENCLAW_BOOTSTRAP_BASELINE.jsonc)

Key evidence:
- `OpenClaw` docs consistently describe push/PR/git auth/GitHub auth as an external host workflow outside the runtime surface of the core repo.
- bootstrap baseline records `openclaw-host-git-push` only as an installed plugin archive with `sourcePath` and `installPath`; it does not expose a dedicated mac-node package source tree.
- a filesystem scan under `/Users/svarnoy85/teodorArg/OpenClaw` found no local `package.json`, `openclaw.plugin.json`, or `openclaw.bundle.json` that define a separate publishable mac-node git package.

Non-source conclusions:
- `non-source`: `OpenClaw` core repo does not currently provide a standalone package root for a separate mac-node git plugin package.
- `non-source`: installed `openclaw-host-git-push` plugin is not the same thing as the product-level mac-node lane; it is a repo-specific bounded bridge package riding on top of that lane.

Resulting repo decision:
- in this repo, this unit is modeled as companion folder `host-git-lane/`, not as a standalone publishable plugin package, unless new manifests/source roots are found later.

Exact target file set:
- `host-git-lane/README.md`
- `host-git-lane/HOST_GIT_BOUNDARY.md`
- `host-git-lane/HOST_PATHS_AND_REPO_RESOLUTION.md`
- `host-git-lane/GITHUB_AUTH_AND_PR_FLOW.md`
- `host-git-lane/CANONICAL_REFS.md`

Local content contract:
- `README.md` explains why this unit is a companion folder and how it relates to package units
- `HOST_GIT_BOUNDARY.md` captures host-only git/GitHub boundary
- `HOST_PATHS_AND_REPO_RESOLUTION.md` captures host vs container path canon and repo resolution order
- `GITHUB_AUTH_AND_PR_FLOW.md` captures durable host auth, push, and PR flow
- `CANONICAL_REFS.md` lists exact upstream `OpenClaw` canon used for this folder

Optional only if directly justified:
- `host-git-lane/examples/`
- `host-git-lane/schemas/`
- `host-git-lane/scripts/README.md`

Explicit non-files:
- no `package.json`
- no `openclaw.plugin.json`
- no `openclaw.bundle.json`
- no fake build/test scaffold
- no copied installed runtime output

## 7. Immediate implications for the reorg

- `docs/REPO_REORG_PLAN.md` can now treat mac-node lane classification as resolved: companion layer, not standalone package by current evidence.
- local companion-folder naming is fixed as `host-git-lane/`.
- `openclaw-host-git-pr` is fixed as a skill-only package target.
- `plugin-host-git-push` remains historical source input only.
- exact file mapping now lives in [MIGRATION_TABLES.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/MIGRATION_TABLES.md).
