# Migration Execution Flow

Date: 2026-04-16
Status: active execution protocol for the repo reorg

## Purpose

This document defines the exact working loop for migrating one package or companion unit at a time without structural drift.

It is intentionally procedural.
Architecture and source-of-truth decisions live in:
- [REPO_REORG_PLAN.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/REPO_REORG_PLAN.md)
- [SOURCE_INVENTORY.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/SOURCE_INVENTORY.md)

## Unit Order

Preferred execution order:
1. `openclaw-git-workflow`
2. `memory-hygiene`
3. `source-of-truth-fix`
4. `openclaw-host-git-pr`
5. `host-git-lane/`

Rule:
- only one unit is in active migration per branch

## Branch Rule

Create one branch per migrated unit.

Format:

```text
<type>/<scope>-<short-kebab>
```

Recommended examples:
- `refactor/plugin-openclaw-git-workflow-repack`
- `feat/skills-memory-hygiene-package`
- `feat/skills-source-of-truth-fix-package`
- `feat/skills-openclaw-host-git-pr-package`
- `docs/workflow-host-git-lane-companion`

## Per-Unit Working Loop

1. Re-read the relevant section in `docs/REPO_REORG_PLAN.md`.
2. Re-check the source classification in `docs/SOURCE_INVENTORY.md`.
3. Create a fresh branch for that single unit.
4. Create or move files only for that unit.
5. Sync docs that are directly affected by that unit.
6. Verify against official OpenClaw / ClawHub rules.
7. Run the appropriate local checks.
8. Commit with canonical title/body.
9. Push the branch.
10. Open a PR into `main`.
11. Confirm PR checks pass.
12. Update local `main`.
13. Mark the completed slice in plan/TODO if needed.
14. Start the next unit on a new branch.

## Verification By Unit Type

### Plugin Package

Run:

```bash
nvm use || nvm install
cd <package-folder>
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

Then verify:
- package shape is real
- `package.json` metadata is coherent
- `openclaw.plugin.json` matches the actual package
- shipped files match release intent

### Skill-Only Package

Verify:
- `SKILL.md` exists
- `LICENSE` exists
- publication metadata is documented
- no runtime code is implied unless it really exists
- ClawHub validator requirements are satisfied

### Companion Folder

Verify:
- no fake package scaffold is introduced
- boundary with package units is explicit
- local files point back to real canonical `OpenClaw` sources where needed
- runtime/container push/PR behavior is not falsely described as shipped here

## Git Canon

Use the host-backed git flow from:
- `/Users/svarnoy85/teodorArg/OpenClaw/GIT_GUIDANCE.md`

For this repo:
- commit format: `<type>(<scope>): <short summary>`
- prefer a commit body with one intro line and exactly 4 short bullets
- one branch should close one migration slice
- push and PR are host-backed only

## PR Rule

PR target:
- `main`

PR should contain:
- one unit migration only
- verification result summary
- any publication or compatibility caveats for that unit

## Hard Stops

Stop and re-evaluate if any of these happen:
- a supposed source path turns out to be installed output only
- a unit requires inventing runtime code that has no live source owner
- a change starts spilling into a second migration unit
- the docs and actual file boundary no longer match

## Current Settled Decisions

- `openclaw-host-git-pr` is a skill-only package.
- `host-git-lane/` is a companion folder, not a publishable plugin package.
- legacy `plugin-host-git-push` is reference-only input.
