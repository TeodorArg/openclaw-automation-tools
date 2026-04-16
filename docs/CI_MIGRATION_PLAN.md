# CI Migration Plan

Date: 2026-04-16
Status: final post-reorg CI shape applied in the repo

## Purpose

This document defines how CI should evolve during the repo reorg.
The repo is now past the per-unit migration phase.
This document records the final CI shape that matches the classified units.

## Current state

Current CI is defined in [ci.yml](/Users/svarnoy85/teodorArg/openclaw-git-workflow/.github/workflows/ci.yml).

It validates:
- `openclaw-git-workflow/` as the real plugin package
- skill-only package shape for `memory-hygiene/`, `source-of-truth-fix/`, and `openclaw-host-git-pr/`
- required docs and forbidden manifests for `host-git-lane/`
- shell syntax for the real package-local helper scripts under `openclaw-git-workflow/scripts/`

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

## Final rollout state

Applied jobs:
- `plugin-package`
- `plugin-shell-scripts`
- `skill-packages`
- `host-git-lane`

Applied matrix:
- `memory-hygiene`
- `source-of-truth-fix`
- `openclaw-host-git-pr`

Applied skill checks:
- `SKILL.md`, `README.md`, `LICENSE` exist
- `LICENSE` contains `MIT-0`
- README keeps `slug`, `display name`, `owner`, `version`, and `tags` explicit
- `package.json`, `openclaw.plugin.json`, and `src/` are absent

Applied companion checks:
- required docs exist
- `package.json` and `openclaw.plugin.json` are absent

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

## Acceptance

CI is considered aligned when these statements hold:
- the plugin package keeps its real `pnpm` validation loop
- skill-only packages are checked as skill-only packages, not fake npm packages
- `host-git-lane/` is checked as a companion folder, not a publishable package
- shell checks remain only where real scripts exist
