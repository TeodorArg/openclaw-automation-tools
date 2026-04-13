# Minimal Execute Surface

Этот документ фиксирует минимальную execute-поверхность для первого implementation slice.

## Goal

Дать skill детерминированный bounded runtime surface для execution mode без generic shell passthrough.

## Tool entry

Предпочтительный tool name:
- `git_workflow_action`

## Minimal contract

```json
{
  "action": "plan-groups" | "plan-groups-with-branches" | "execute-groups-with-branches",
  "command": "<raw skill args>",
  "commandName": "<slash command>",
  "skillName": "openclaw_git_workflow",
  "confirmedPlan": { "version": 1, "status": "confirmed", "groups": [] }
}
```

## Action behavior

### `plan-groups`
- inspect repo state
- produce logical groups
- suggest commits
- no writes

### `plan-groups-with-branches`
- same as planning
- also produce branch names and exact later commands
- no writes

### `execute-groups-with-branches`
- require `confirmedPlan`
- reject free-form execution without structured plan
- create branches and commits only
- no push
- no PR

## Bounded runtime operations

The first slice should allow only these write-side operations:

1. create a branch from current HEAD
2. stage an explicit allowlisted file set for one group
3. create a commit with validated title/body

Anything else is out of scope.

## Suggested implementation split

- plugin runtime validates request and confirmed plan
- plugin runtime maps one bounded phase to one narrow script
- scripts receive structured args, not free-form prose

## Suggested narrow helpers

- `scripts/git-create-branch.sh`
- `scripts/git-create-commit.sh`

Optional later helper:
- `scripts/git-stage-files.sh`

## Explicit non-goals

This minimal execute surface must not include:
- arbitrary shell
- arbitrary git subcommands
- push
- force push
- PR creation
- branch deletion
- reset/rebase/cleanup flows

## Trust boundary

The skill is user-facing.
The tool contract is internal and structured.
The scripts are bounded helpers.
No layer should silently widen into a generic command runner.
