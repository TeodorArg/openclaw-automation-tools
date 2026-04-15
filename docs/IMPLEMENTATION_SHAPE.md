# Implementation Shape

## Core design

The repo is built around three layers:

1. `plugin/skills/` — user-facing workflow contract
2. `plugin/` — bounded runtime tool surface
3. `scripts/` — bounded write helpers

The separate `plugin-host-git-push/` subtree is retained as a distinct finish-path bridge for push and PR.
It is not part of the main branch+commit package contract.

## Main workflow

The main workflow is:
- plan
- confirm
- execute

Supported intents:
- `разложи по git-группам`
- `разложи по git-группам с ветками`
- `выполни git-группы с ветками`

Execution requires a confirmed structured plan.
Execution performs only bounded branch + commit operations.

## Skill layer

Main responsibility:
- expose the workflow-level command surface
- separate planning from execution
- route deterministic execution into the bounded tool contract

## Plugin layer

Main responsibility:
- parse workflow requests
- inspect repo state
- build deterministic groups
- validate confirmed plans
- map bounded actions into bounded helpers

Main package shape in this repo:
- `plugin/package.json`
- `plugin/openclaw.plugin.json`
- `plugin/README.md`
- `plugin/EXECUTE_SURFACE.md`
- `plugin/skills/openclaw-git-workflow/SKILL.md`
- `plugin/src/*`

Packaged skill path:
- `skills/openclaw-git-workflow/SKILL.md`

## Script layer

Main responsibility:
- perform narrow validated writes only
- never parse free-form user text
- never widen into generic shell passthrough

Current bounded helpers:
- `scripts/git-create-branch.sh`
- `scripts/git-create-commit.sh`

## Minimal internal tool contract

Preferred tool name:
- `git_workflow_action`

Contract shape:

```json
{
  "action": "plan-groups" | "plan-groups-with-branches" | "execute-groups-with-branches",
  "command": "<raw skill args>",
  "commandName": "<slash command>",
  "skillName": "openclaw-git-workflow"
}
```

For execute, the request must also carry a confirmed plan payload.

## Main workflow boundaries

The main workflow includes:
- planning git groups
- proposing branches and commits
- confirmed-plan validation
- bounded branch creation
- bounded commit creation

The main workflow does not include:
- push
- PR creation
- arbitrary git subcommands
- arbitrary shell execution
- destructive recovery flows

## Retained bridge boundary

`plugin-host-git-push/` exists for the bounded host-backed finish path:
- push current branch
- PR readiness checks
- create PR to `main`

Keep it in the repo.
Keep it separate from the main package above.

## Verification baseline

Main package verification:

```bash
cd plugin
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```
