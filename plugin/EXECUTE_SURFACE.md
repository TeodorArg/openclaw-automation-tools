# Execute Surface

Repo-local contract doc for the main workflow package source tree.
This file documents the current bounded runtime surface used by `plugin/`.
Repo paths in this file use the source-tree frame, while packaged plugin paths use package-root paths like `skills/`.
The packaged plugin file list currently ships `dist`, `openclaw.plugin.json`, `skills`, `README.md`, and `LICENSE`.
Repo-local shell helpers under `plugin/scripts/` are not shipped in the package tarball and remain source-tree implementation details.

## Goal

Give the workflow skill a deterministic bounded runtime surface for execution mode without generic shell passthrough.

## Tool entry

Preferred tool name:
- `git_workflow_action`

## Minimal contract

```json
{
  "action": "plan-groups" | "plan-groups-with-branches" | "execute-groups-with-branches",
  "command": "<raw skill args or normalized intent alias>",
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
- do planning work
- also produce branch names and the exact next confirmation step
- also emit a ready-to-confirm structured payload in canonical confirmed-plan shape
- no writes

### `execute-groups-with-branches`
- require `confirmedPlan`
- accept either a structured object or a JSON string containing the confirmed plan
- reject free-form execution without structured plan
- return structured success or rejection/failure payloads
- create branches and commits only
- no direct push
- no direct PR

## Bounded runtime operations

The main workflow allows only these write-side operations:

1. create each planned branch from the initial HEAD captured at execute start
2. stage an explicit allowlisted file set for one group
3. create a commit with validated title/body

Anything else is out of scope.

## Suggested implementation split

- plugin runtime validates request and confirmed plan
- plugin runtime maps one bounded phase to one narrow script
- scripts under `plugin/scripts/` receive structured args, not free-form prose
- the plugin package itself remains a real TypeScript package

## Current package scripts

Current scripts in `plugin/package.json`:
- `build`: `tsc -p tsconfig.build.json`
- `format`: `biome format --write . --files-ignore-unknown=true`
- `format:check`: `biome format --check . --files-ignore-unknown=true`
- `lint`: `biome check index.ts api.ts openclaw.plugin.json package.json tsconfig.json tsconfig.build.json src skills --files-ignore-unknown=true`
- `lint:fix`: `biome check --write index.ts api.ts openclaw.plugin.json package.json tsconfig.json tsconfig.build.json src skills --files-ignore-unknown=true`
- `check`: `pnpm lint && pnpm test && pnpm build`
- `typecheck`: `tsc --noEmit -p tsconfig.json`
- `test`: `vitest run --passWithNoTests`
- `pack:smoke`: package smoke-check for the shipped file list

## Current bounded helpers

Current source-tree bounded helpers:
- `plugin/scripts/git-create-branch.sh`
- `plugin/scripts/git-create-commit.sh`

These helpers are repo-local implementation details and are not part of the packaged plugin file list.

## Explicit non-goals

This execute surface must not include:
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
The scripts under `plugin/scripts/` are bounded helpers.
No layer should silently widen into a generic command runner.
