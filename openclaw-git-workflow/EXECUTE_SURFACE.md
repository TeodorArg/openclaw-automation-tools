# Execute Surface

Contract doc for the bounded runtime surface of `openclaw-git-workflow`.
Repo paths in this file use repo-relative source paths.
Packaged plugin paths use package-root paths like `skills/`.
The packaged plugin currently ships `dist`, `openclaw.plugin.json`, `skills`, `README.md`, and `LICENSE`.
Repo-local shell helpers under `openclaw-git-workflow/scripts/` are source-tree implementation details and are not part of the published tarball.

## Goal

Give the workflow skill a deterministic bounded runtime surface for execution mode without generic shell passthrough.

## Tool entry

Preferred tool name:
- `git_workflow_action`

## Minimal contract

```json
{
  "action": "plan-groups" | "plan-groups-with-branches" | "execute-groups-with-branches" | "push_branch" | "create_pr" | "wait_for_checks" | "merge_pr" | "sync_main",
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

### `push_branch`
- push only the current local non-`main` branch
- push only to remote `origin`
- no arbitrary remote or ref override

### `create_pr`
- open a PR only from the current local non-`main` branch into `main`
- derive PR title/body from the latest local commit
- no arbitrary base/head override

### `wait_for_checks`
- poll only required checks for the current branch PR
- continue until checks pass or a failing/cancelled check requires a fix cycle
- no arbitrary PR selector or custom gh passthrough

### `merge_pr`
- merge only the current branch PR into `main`
- require required checks to pass before merge continues
- delete the merged branch as part of the bounded finish step

### `sync_main`
- require a clean working tree
- switch to local `main`
- run only `git pull --ff-only origin main`

## Bounded runtime operations

The main workflow allows only these write-side operations:

1. create each planned branch from the initial HEAD captured at execute start
2. stage an explicit allowlisted file set for one group
3. create a commit with validated title/body
4. push the current non-`main` branch to `origin`
5. open the current branch PR into `main`
6. merge the current branch PR into `main` after required checks pass
7. switch to local `main` and fast-forward it from `origin/main`

Anything else is out of scope.

## Suggested implementation split

- plugin runtime validates request and confirmed plan
- plugin runtime maps one bounded phase to one narrow script
- scripts under `openclaw-git-workflow/scripts/` receive structured args, not free-form prose
- the plugin package itself remains a real TypeScript package

## Current package scripts

Current scripts in `openclaw-git-workflow/package.json`:
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
- `openclaw-git-workflow/scripts/git-create-branch.sh`
- `openclaw-git-workflow/scripts/git-create-commit.sh`
- `openclaw-git-workflow/src/runtime/host-ops.ts`

These helpers are repo-local implementation details and are not part of the packaged plugin file list.

## Explicit non-goals

This execute surface must not include:
- arbitrary shell
- arbitrary git subcommands
- force push
- branch deletion
- reset/rebase/cleanup flows

## Trust boundary

The skill is user-facing.
The tool contract is internal and structured.
The scripts under `openclaw-git-workflow/scripts/` are bounded helpers.
No layer should silently widen into a generic command runner.
