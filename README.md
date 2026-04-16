# openclaw-git-workflow

Repo index for the classified OpenClaw publish units and the companion host-backed git lane.

Status on 2026-04-16:
- repo reorg is complete in `main`
- the active work is now post-reorg hardening: CI, publication metadata, and readiness checklists

## Canon

Read these first before changing structure or release metadata:
- [AGENTS.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/AGENTS.md)
- [TODO.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/TODO.md)
- [docs/REPO_REORG_PLAN.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/REPO_REORG_PLAN.md)
- [docs/SOURCE_INVENTORY.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/SOURCE_INVENTORY.md)
- [docs/MIGRATION_EXECUTION_FLOW.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/MIGRATION_EXECUTION_FLOW.md)
- [docs/MIGRATION_TABLES.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/MIGRATION_TABLES.md)
- [docs/CI_MIGRATION_PLAN.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/CI_MIGRATION_PLAN.md)
- [docs/PUBLISH_READINESS.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/PUBLISH_READINESS.md)
- [docs/CLAWHUB_PUBLISH_PREFLIGHT.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/CLAWHUB_PUBLISH_PREFLIGHT.md)

## Units

| Unit | Type | Status | Notes |
| --- | --- | --- | --- |
| `openclaw-git-workflow/` | plugin + bundled skill package | active package | bounded runtime/plugin surface |
| `memory-hygiene/` | skill-only package | materialized | `MIT-0`, no runtime code |
| `source-of-truth-fix/` | skill-only package | materialized | `MIT-0`, no runtime code |
| `openclaw-host-git-pr/` | skill-only package | materialized | external host-backed runtime boundary |
| `host-git-lane/` | companion folder | materialized | docs-only companion, not a publishable package |

## Verify

Plugin package:

```bash
nvm use || nvm install
cd openclaw-git-workflow
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

Repo-wide CI now also validates:
- skill-only package shape for `memory-hygiene/`, `source-of-truth-fix/`, and `openclaw-host-git-pr/`
- required docs and forbidden manifests for `host-git-lane/`

## Package Index

- [openclaw-git-workflow/README.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/README.md): publishable plugin package with bundled skill
- [memory-hygiene/README.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/memory-hygiene/README.md): skill-only package for memory compaction and hygiene
- [source-of-truth-fix/README.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/source-of-truth-fix/README.md): skill-only package for durable canonical-source fixes
- [openclaw-host-git-pr/README.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-host-git-pr/README.md): skill-only package for bounded host-backed PR flow
- [host-git-lane/README.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/host-git-lane/README.md): companion-layer docs for host-backed git/GitHub execution

## Current Focus

- keep CI aligned with the classified units
- keep package publication metadata explicit and non-placeholder
- keep repo-level readiness checklists current as units move from materialized to publish-ready
- keep the first ClawHub upload procedure explicit, including local CLI compatibility differences
