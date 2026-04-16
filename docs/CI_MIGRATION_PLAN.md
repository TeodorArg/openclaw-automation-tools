# CI Migration Plan

Date: 2026-04-16
Status: Stage 2 applied on the current Slice C branch; later stages remain planning-only

## Purpose

This document defines how CI should evolve during the repo reorg.
Stage 2 of this plan is now applied on the current branch.
Later stages remain planning-only.

## Current state

Current CI is defined in [ci.yml](/Users/svarnoy85/teodorArg/openclaw-git-workflow/.github/workflows/ci.yml).

It is now hard-wired to:
- install and validate `openclaw-git-workflow/`
- shell-check `openclaw-git-workflow/scripts/git-create-branch.sh`
- shell-check `openclaw-git-workflow/scripts/git-create-commit.sh`

This is the correct Stage 2 state for the first migrated unit.

## Canon used for this plan

- Local repo execution rules from [AGENTS.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/AGENTS.md)
- Per-unit verification from [MIGRATION_EXECUTION_FLOW.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/MIGRATION_EXECUTION_FLOW.md)
- GitHub Actions matrix and path-filter guidance from official GitHub Actions docs via Context7

Practical guidance confirmed from official GitHub Actions docs:
- use `jobs.<job_id>.strategy.matrix` when the same validation shape repeats across package folders
- use `on.push.paths` and `on.pull_request.paths` filters only when you want to exclude clearly irrelevant changes from a workflow trigger

## Target CI shape after reorg

The final CI should validate classified units rather than the historical `plugin/` folder.

Target validation units:
- `openclaw-git-workflow/`
- `memory-hygiene/`
- `source-of-truth-fix/`
- `openclaw-host-git-pr/`
- `host-git-lane/`

## Validation policy by unit

### `openclaw-git-workflow/`

Keep the current package validation sequence:
- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `pnpm pack:smoke`

Keep shell checks for package-local scripts if they still exist under:
- `openclaw-git-workflow/scripts/`

### `memory-hygiene/`

No fake npm pipeline.

Validation should be docs/package-shape oriented:
- `SKILL.md` exists
- `LICENSE` exists and is `MIT-0`
- README exists
- publication metadata checklist is present in docs or package README

### `source-of-truth-fix/`

Use the same skill-only validation shape as `memory-hygiene/`.

### `openclaw-host-git-pr/`

Use the same skill-only validation shape as the other skill package folders.

Additionally verify:
- no `package.json`
- no `openclaw.plugin.json`
- no `src/`

### `host-git-lane/`

No fake npm pipeline.

Validation should check:
- required docs exist
- no `package.json`
- no `openclaw.plugin.json`
- no claimed runtime/package scaffold

## Recommended rollout

### Stage 1: before any file moves

Leave `.github/workflows/ci.yml` unchanged.

Reason:
- this was the pre-move state
- changing CI now would create a docs/CI mismatch in the opposite direction

### Stage 2: same branch as Slice C

When `plugin/` moves to `openclaw-git-workflow/`, update CI in the same branch.
Status: done on the current branch.

Minimum required CI edit for Slice C:
- rename the package job working directory from `plugin` to `openclaw-git-workflow`
- update `cache-dependency-path`
- move shell script checks from `plugin/scripts/` to `openclaw-git-workflow/scripts/`

This keeps CI aligned with the first migrated unit without prematurely adding fake checks for units that do not exist yet.

### Stage 3: after skill package folders exist

Add one lightweight docs/shape validation job for skill-only packages.

Recommended implementation shape:
- one matrix job over `memory-hygiene`, `source-of-truth-fix`, `openclaw-host-git-pr`
- each matrix entry checks required files and forbidden files

### Stage 4: after `host-git-lane/` exists

Add one companion-folder validation job.

It should verify:
- required docs exist
- forbidden package manifests do not exist

## Recommended final workflow split

Prefer separate jobs rather than one giant script:

- `plugin-package`
- `plugin-shell-scripts`
- `skill-packages`
- `host-git-lane`

This is easier to read in PRs and easier to change per unit.

## Suggested future workflow shape

```yaml
name: ci

on:
  push:
    branches:
      - main
      - '**'
  pull_request:

jobs:
  plugin-package:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: openclaw-git-workflow
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
          cache-dependency-path: openclaw-git-workflow/pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm build
      - run: pnpm test
      - run: pnpm pack:smoke

  plugin-shell-scripts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bash -n openclaw-git-workflow/scripts/git-create-branch.sh
      - run: bash -n openclaw-git-workflow/scripts/git-create-commit.sh

  skill-packages:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package:
          - memory-hygiene
          - source-of-truth-fix
          - openclaw-host-git-pr
    steps:
      - uses: actions/checkout@v4
      - run: test -f "${{ matrix.package }}/SKILL.md"
      - run: test -f "${{ matrix.package }}/README.md"
      - run: test -f "${{ matrix.package }}/LICENSE"

  host-git-lane:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: test -f host-git-lane/README.md
      - run: test -f host-git-lane/HOST_GIT_BOUNDARY.md
      - run: test -f host-git-lane/HOST_PATHS_AND_REPO_RESOLUTION.md
      - run: test -f host-git-lane/GITHUB_AUTH_AND_PR_FLOW.md
      - run: test -f host-git-lane/CANONICAL_REFS.md
      - run: test ! -f host-git-lane/package.json
      - run: test ! -f host-git-lane/openclaw.plugin.json
```

## Path-filter rule

Do not add aggressive `paths:` filters in the first CI migration.

Reason:
- multiple top-level docs changes should still run CI while the repo is in flux
- wrong path filters are more dangerous here than a few extra CI runs

Only introduce path filters later if the multi-unit tree becomes stable and noisy enough to justify them.

## Slice C acceptance for CI planning

CI planning for the first real move is considered ready when these statements hold:
- the repo has a documented Stage 2 edit for `plugin/` to `openclaw-git-workflow/`
- the future validation shapes for skill-only packages and `host-git-lane/` are explicit
- the plan does not invent npm-style checks for non-plugin units
