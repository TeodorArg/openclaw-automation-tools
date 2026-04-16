# openclaw-git-workflow

Plugin-first bounded git workflow repo for OpenClaw.

## What this repo is

This repo contains a bounded git workflow implementation built around:
- planning git groups from current repo changes
- proposing branches and canonical commits
- executing only bounded branch + commit steps from a confirmed plan

## Main package in this repo

Main package in this repo:
- `@openclaw/openclaw-git-workflow`

Current status:
- it is the main package surface for this repo
- it is currently kept private in-repo via `plugin/package.json`

Source tree:
- package source lives under `plugin/`
- bundled skill source lives under `plugin/skills/openclaw-git-workflow/`
- repo-source helper scripts live under `plugin/scripts/`
- packaged skill path is `skills/openclaw-git-workflow/SKILL.md`
- packaged helper path is `scripts/`

Operator-facing intent contract:
- `send_to_git`
- `open_pr`

Human phrasing is an alias layer, not the canon.
Common examples:
- RU: `отправь в гит`, `запушь`, `отправь изменения`, `сделай PR`
- EN: `send to git`, `push it`, `ship to git`, `make a PR`, `open a PR`

How the repo maps those intents:
- `send_to_git` is the operator-facing entry for the public branch + commit baseline: repo inspection, git grouping, canonical branch and commit planning, and bounded branch + commit execution
- `open_pr` is the separate operator-facing entry for the retained host-backed PR bridge
- push after `send_to_git` and PR work behind `open_pr` stay on the separate bounded bridge layer, not in the main public package baseline

Current status split:
- validated baseline: branch + commit under `send_to_git`
- validated optional bridge: host-backed grouping -> branches -> push -> PR into `main`
- non-baseline on this surface: runtime-local slash-command/container finish path for push/PR
- remaining manual GitHub step after the validated host-backed lane: PR approval/review confirmation

Internal runtime safety remains the same:
- plan -> confirm -> execute stays explicit inside the implementation
- bounded branch + commit helpers stay separate from push/PR bridge helpers
- no arbitrary git passthrough
- no arbitrary shell execution
- no destructive recovery flows

## Separate retained bridge

This repo also keeps:
- `plugin-host-git-push/`

That subtree is retained because it carries the bounded host-backed finish path for:
- pushing the current branch
- PR readiness checks
- creating PRs to `main`

Simple boundary:
- `plugin/` owns planning plus branch/commit execution
- `plugin-host-git-push/` owns the separate host-backed push/PR finish path

Keep it in the repo.
Do not treat it as part of the main branch + commit package contract, even though it participates in the operator-facing intent flow above.

## Repo layout

- `plugin/` — main package source and bundled workflow skill
- `plugin/scripts/` — bounded branch/commit helpers for the main package
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
