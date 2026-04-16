# Implementation Shape

## Core design

The repo is built around three layers:

1. `plugin/skills/` — user-facing workflow contract
2. `plugin/` — bounded runtime tool surface
3. `plugin/scripts/` — bounded write helpers

## Main workflow

Shipped runtime canonical intent id:
- `send_to_git`

Human wording is an alias layer over that intent id, so RU, EN, and future localized phrasings can map to the same workflow when alias support exists in code.
The current shipped alias set includes both direct send-style wording and the RU planning/execute workflow phrases.
Shipped canon for runtime behavior must follow the actual normalized intent set implemented in code.

Internal execution model under `send_to_git` remains:
- plan
- confirm
- execute

Execution still requires a confirmed structured plan.
The main package still performs only bounded branch + commit operations.

## Skill layer

Main responsibility:
- expose the workflow-level intent surface for the branch + commit package
- normalize human phrasing into stable workflow intent ids
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
- `plugin/scripts/git-create-branch.sh`
- `plugin/scripts/git-create-commit.sh`

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

The main branch + commit package includes:
- planning git groups
- proposing branches and commits
- confirmed-plan validation
- bounded branch creation
- bounded commit creation

The main branch + commit package does not include:
- arbitrary git subcommands
- arbitrary shell execution
- destructive recovery flows
- push
- PR creation
- git or GitHub auth in runtime
- remote checks in runtime

Push, PR creation, GitHub auth, git auth, and remote checks are outside this repo runtime contract.
If a host-backed finish path exists operationally, it must stay explicitly host-side and outside the plugin/runtime surface shipped by this repo.

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
