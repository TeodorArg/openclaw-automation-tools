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

Human phrasing is an alias layer, not the canon.
Common examples:
- RU: `отправь в гит`, `отправь изменения`
- EN: `send to git`

How the repo maps that intent:
- `send_to_git` is the operator-facing entry for the public branch + commit baseline: repo inspection, git grouping, canonical branch and commit planning, and bounded branch + commit execution

Current status split:
- validated baseline: branch + commit under `send_to_git`
- not in this repo/runtime contract: push, PR creation, or remote checks
- not an operating lane in this setup: runtime-local slash-command/container finish path for push/PR
- host-backed finish steps may exist operationally outside this repo/runtime, but they are not exposed or shipped here

Hard rule for this setup:
- do not authenticate git or GitHub in the runtime/container
- do not treat runtime-local `gh`, runtime-local SSH, or runtime-local PR creation as the operating path
- all push, PR, and remote GitHub work goes through the host-backed lane

Internal runtime safety remains the same:
- plan -> confirm -> execute stays explicit inside the implementation
- bounded branch + commit helpers stay narrow and explicit
- no arbitrary git passthrough
- no arbitrary shell execution
- no destructive recovery flows

## Repo layout

- `plugin/` — main package source and bundled workflow skill
- `plugin/scripts/` — bounded branch/commit helpers for the main package
- `docs/CONFIRMED_PLAN_FORMAT.md` — confirmed execute payload contract
- `docs/SKILL_SPEC.md` — user-facing workflow contract
- `docs/IMPLEMENTATION_SHAPE.md` — current architecture and boundaries
- `docs/FILE_ROLE_MAP.md` — file responsibility map
- `docs/REFERENCE_NOTES.md` — narrow runtime-boundary notes

## Verify main package

```bash
cd plugin
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```
