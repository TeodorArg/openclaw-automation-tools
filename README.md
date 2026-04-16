# openclaw-git-workflow

Repo index for the reorg from one technical `plugin/` folder into classified publish units plus one companion layer.

Status on 2026-04-16:
- Slice C for `openclaw-git-workflow` is complete in `main`
- `memory-hygiene` is now in progress on branch `feat/skills-memory-hygiene-package`
- remaining units after that are still planning-only

## Canon

Read these first before moving structure:
- [AGENTS.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/AGENTS.md)
- [TODO.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/TODO.md)
- [docs/REPO_REORG_PLAN.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/REPO_REORG_PLAN.md)
- [docs/SOURCE_INVENTORY.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/SOURCE_INVENTORY.md)
- [docs/MIGRATION_EXECUTION_FLOW.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/MIGRATION_EXECUTION_FLOW.md)
- [docs/MIGRATION_TABLES.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/MIGRATION_TABLES.md)
- [docs/CI_MIGRATION_PLAN.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/CI_MIGRATION_PLAN.md)

## Current Live Package

Live source today:
- [openclaw-git-workflow](/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow)

This is still the active plugin-plus-skill package baseline.

Verify it with:

```bash
nvm use || nvm install
cd openclaw-git-workflow
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

## Target Units

Planned top-level units after the reorg:

| Unit | Type | Status | Canonical source today |
| --- | --- | --- | --- |
| `openclaw-git-workflow/` | plugin + bundled skill package | moved in Slice C on the current branch | current live package in this repo |
| `memory-hygiene/` | skill-only package | in progress on current branch | workspace skill copy and local package folder |
| `source-of-truth-fix/` | skill-only package | in progress on current branch | shared config skill copy and local package folder |
| `openclaw-host-git-pr/` | skill-only package | in progress on current branch | installed skill + historical git source + local package folder |
| `host-git-lane/` | companion folder | in progress on current branch | `OpenClaw` docs/config canon plus local companion docs |

## Scope Rules

- one migration unit per branch
- no mixed package migrations in one PR
- `plugin-host-git-push` stays historical input only
- `host-git-lane/` is not a publishable plugin package by current evidence
- `openclaw-host-git-pr` stays skill-only unless a real live runtime source owner appears

## Repo Docs By Role

- [docs/REPO_REORG_PLAN.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/REPO_REORG_PLAN.md): architecture, package classification, target boundaries
- [docs/SOURCE_INVENTORY.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/SOURCE_INVENTORY.md): source-of-truth and non-source evidence
- [docs/MIGRATION_EXECUTION_FLOW.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/MIGRATION_EXECUTION_FLOW.md): exact per-unit execution loop
- [docs/MIGRATION_TABLES.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/MIGRATION_TABLES.md): current-to-target path mapping tables
- [docs/CI_MIGRATION_PLAN.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/CI_MIGRATION_PLAN.md): plan for multi-unit CI after the first package move

## Current Blockers

Broad reorg execution is still blocked until actual package folders are created one unit at a time.

What is no longer ambiguous:
- `host-git-lane/` exact planned file set
- `openclaw-host-git-pr` exact package contents and publication metadata baseline
- repo-level migration tables
- repo-level CI migration plan

What still remains execution work:
- create the new folders in dedicated branches
- add skill package folders and companion docs in later slices
- complete verification and commit for the current Slice C branch
