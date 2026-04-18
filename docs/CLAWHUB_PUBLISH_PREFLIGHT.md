# ClawHub Publish Preflight

Date: 2026-04-17  
Status: current baseline after migration cleanup

## Active Publish Surfaces

Plugin package:
- `openclaw-host-git-workflow/`

Primary package entrypoint:
- `send_to_git` / `отправь в гит`

Skill-only packages:
- `memory-hygiene/`
- `source-of-truth-fix/`

Non-publishable repo docs:
- `README.md`
- `docs/CLAWHUB_PUBLISH_PREFLIGHT.md`
- `docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md`

## Plugin Checks

Run:

```bash
cd openclaw-host-git-workflow
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
- no secrets or host-local paths leak into shipped files
- source provenance is ready

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

## Skill Checks

For each active skill package:
- `SKILL.md` exists
- `README.md` exists
- `LICENSE` exists and matches the intended publication target
- no `package.json`
- no `openclaw.plugin.json`
- no runtime code is implied unless it exists

## Commands

Plugin publish preflight:

```bash
clawhub package publish ./openclaw-host-git-workflow --dry-run
```

Plugin publish:

```bash
clawhub package publish ./openclaw-host-git-workflow
```

Notes:
- official ClawHub plugin publish accepts a `<source>` such as a local folder, `owner/repo`, `owner/repo@ref`, or a GitHub URL
- plugin identity and compatibility metadata must already be present in `package.json` / `openclaw.plugin.json`; do not rely on ad hoc publish flags for canonical package metadata
- prefer `--dry-run` on the current machine before the first real publish

Skill publish examples:

```bash
clawhub skill publish ./memory-hygiene --slug memory-hygiene --name "Memory Hygiene" --version 0.1.0 --changelog "Initial standalone package release" --tags memory,workflow,maintenance
clawhub skill publish ./source-of-truth-fix --slug source-of-truth-fix --name "Source Of Truth Fix" --version 0.1.0 --changelog "Initial standalone package release" --tags docs,verification,source-of-truth
```

## Blockers

- verify installed `clawhub` syntax on the current machine before the first real publish
- `clawhub whoami` must succeed
- first external install verification should be recorded before the first public release
