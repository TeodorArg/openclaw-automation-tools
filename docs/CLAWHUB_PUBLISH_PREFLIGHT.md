# ClawHub Publish Preflight

Date: 2026-04-17  
Status: current baseline after migration cleanup

## Active Publish Surfaces

The source of truth for the live publishable plugin package list is `docs/PLUGIN_PACKAGE_CANON.md`.

Plugin packages listed there and currently expected here in lockstep:
- `openclaw-host-git-workflow/`
- `openclaw-workflow-planner/`

Primary host-backed package entrypoint:
- `send_to_git` / `отправь в гит`

Planner package entrypoints:
- bundled skills `openclaw-workflow-planner`, `openclaw-workflow-research`, and `openclaw-workflow-implementer`
- typed tool `workflow_planner_action`

Skill-only packages:
- `memory-hygiene/`
- `source-of-truth-fix/`

Non-publishable repo docs:
- `README.md`
- `docs/CLAWHUB_PUBLISH_PREFLIGHT.md`
- `docs/PLUGIN_PACKAGE_CANON.md`
- `docs/PLUGIN_STYLE_CANON.md`
- `docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md`

## Plugin Checks

Before publishing, verify that CI covers every live publishable plugin package from `docs/PLUGIN_PACKAGE_CANON.md` and that each one runs the full plugin verification minimum through `pnpm pack:smoke`.

Run for `openclaw-host-git-workflow/`:

```bash
cd openclaw-host-git-workflow
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

Run for `openclaw-workflow-planner/`:

```bash
cd openclaw-workflow-planner
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

Then verify:
- `package.json` and `openclaw.plugin.json` versions match
- manifest id/name/entry match the built package
- package `files` match the intended shipped artifact
- packed tarball contains the built `dist/**` artifacts required by the package entry surface
- no secrets or host-local paths leak into shipped files
- source provenance is ready

These checks extend beyond the CI verification minimum and remain an explicit manual pre-publish gate unless later automated in package scripts or CI.

Current runtime coverage to publish:
- setup doctor
- planning
- branch-aware planning
- explicit commit prep
- repo resolution
- live host node binding
- confirmed-plan validation
- host preflight
- bounded branch entry
- bounded push
- bounded PR creation
- bounded wait for required checks
- bounded merge
- bounded sync of local `main`

Current planning metadata to publish:
- branch suggestions identify the owning package slug or explicit repo surface
- commit titles identify the owning package slug or explicit repo surface
- PR titles remain informative because bounded PR creation reuses the latest commit subject

Current planner package coverage to publish:
- file-backed `WORKFLOW_PLAN.md` planner state
- idea creation and listing
- typed research attachment
- explicit `Idea Gate`
- accepted plan create and refresh
- plan snapshot and idea retrieval
- manual task tracking
- bounded implementation brief handoff
- idea closure

## Skill Checks

For each active skill package:
- `SKILL.md` exists
- `README.md` exists
- `LICENSE` exists and is `MIT-0`
- publish metadata baseline matches the package README: slug, display name, owner placeholder, version, and tags
- no `package.json`
- no `openclaw.plugin.json`
- no `src/` tree or runtime code is introduced

## Commands

Plugin publish preflight:

```bash
clawhub package publish ./openclaw-host-git-workflow --dry-run
clawhub package publish ./openclaw-workflow-planner --dry-run
```

Plugin publish:

```bash
clawhub package publish ./openclaw-host-git-workflow
clawhub package publish ./openclaw-workflow-planner
```

Notes:
- official ClawHub plugin publish accepts a `<source>` such as a local folder, `owner/repo`, `owner/repo@ref`, or a GitHub URL
- plugin identity and compatibility metadata must already be present in `package.json` / `openclaw.plugin.json`; do not rely on ad hoc publish flags for canonical package metadata
- prefer `--dry-run` on the current machine before the first real publish

Skill publish examples:

```bash
clawhub skill publish ./memory-hygiene --slug memory-hygiene --name "Memory Hygiene" --owner <clawhub-owner> --version 0.1.0 --changelog "Initial standalone package release" --tags memory,workflow,maintenance
clawhub skill publish ./source-of-truth-fix --slug source-of-truth-fix --name "Source Of Truth Fix" --owner <clawhub-owner> --version 0.1.0 --changelog "Initial standalone package release" --tags docs,verification,source-of-truth
```

Skill publish baseline:
- `memory-hygiene/`: slug `memory-hygiene`, display name `Memory Hygiene`, owner `<clawhub-owner>`, version `0.1.0`, tags `memory`, `workflow`, `maintenance`
- `source-of-truth-fix/`: slug `source-of-truth-fix`, display name `Source Of Truth Fix`, owner `<clawhub-owner>`, version `0.1.0`, tags `docs`, `verification`, `source-of-truth`

## Blockers

- verify installed `clawhub` syntax on the current machine before the first real publish
- `clawhub whoami` must succeed
- first external install verification should be recorded before the first public release
