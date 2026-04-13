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
  "skillName": "openclaw-git-workflow",
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
- also emit a ready-to-confirm structured payload in canonical confirmed-plan shape
- no writes

### `execute-groups-with-branches`
- require `confirmedPlan`
- accept either a structured object or a JSON string containing the confirmed plan
- reject free-form execution without structured plan
- return structured success or rejection/failure payloads
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
- the plugin package itself must be scaffolded as a real TypeScript package, not just loose source files

## Required package baseline

For this repo's plugin slice, `plugin/package.json` should exist immediately with at least these scripts:
- `build`: `tsc -p tsconfig.build.json`
- `format`: `biome format --write .`
- `format:check`: `biome format --check .`
- `lint`: `biome check .`
- `lint:fix`: `biome check --write .`
- `check`: `pnpm lint && pnpm test && pnpm build`
- `typecheck`: `tsc --noEmit -p tsconfig.json`
- `test`: `vitest run --config ./vitest.config.ts`

Expected devDependencies baseline:
- `@biomejs/biome`
- `@types/node`
- `typescript`
- `vitest`

If this repo is developed as a standalone repo rather than the main OpenClaw monorepo, do not assume workspace-only package references like `@openclaw/plugin-sdk: workspace:*` will resolve locally. Keep the standalone verification path honest and compatible with the actual repo shape.

After scaffolding, immediately run install plus verification rather than leaving the package unbuilt.

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
