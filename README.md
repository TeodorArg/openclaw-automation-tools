# openclaw-git-workflow

Skill-first git workflow repo for OpenClaw.

## What this repo is

This repo contains a bounded git workflow implementation built around:
- planning git groups from current repo changes
- proposing branches and canonical commits
- executing only bounded branch + commit steps from a confirmed plan

## Main package in this repo

Main package in this repo:
- `@openclaw/openclaw-git-workflow`

Current status:
- it is the intended main release surface for this repo
- it is currently kept private in-repo via `plugin/package.json`

Source tree:
- package source lives under `plugin/`
- bundled skill source lives under `plugin/skills/openclaw-git-workflow/`
- packaged skill path is `skills/openclaw-git-workflow/SKILL.md`

Main workflow contract:
- `разложи по git-группам`
- `разложи по git-группам с ветками`
- `выполни git-группы с ветками`

This workflow does:
- inspect repo state
- build logical git groups
- suggest branches
- validate a confirmed plan
- create branches
- create commits

This workflow does not do:
- push
- PR creation
- arbitrary git passthrough
- arbitrary shell execution
- destructive recovery flows

## Separate retained bridge

This repo also keeps:
- `plugin-host-git-push/`

That subtree is retained because it carries the bounded host-backed finish path for:
- pushing the current branch
- PR readiness checks
- creating PRs to `main`

Keep it in the repo.
Do not treat it as part of the main package contract above.

## Repo layout

- `plugin/` — main package source and bundled workflow skill
- `scripts/` — bounded branch/commit helpers
- `docs/CONFIRMED_PLAN_FORMAT.md` — confirmed execute payload contract
- `docs/SKILL_SPEC.md` — user-facing workflow contract
- `docs/IMPLEMENTATION_SHAPE.md` — current architecture and boundaries
- `docs/FILE_ROLE_MAP.md` — file responsibility map
- `docs/REFERENCE_NOTES.md` — narrow retained-boundary notes
- `plugin-host-git-push/` — separate bounded host-backed push/PR bridge

## Verify main package

```bash
cd plugin
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```
