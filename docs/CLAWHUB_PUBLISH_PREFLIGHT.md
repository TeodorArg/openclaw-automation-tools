# ClawHub Publish Preflight

Date: 2026-04-17  
Status: current baseline after migration cleanup

## Active Publish Surfaces

Plugin package:
- `openclaw-host-git-workflow/`

Skill-only packages:
- `memory-hygiene/`
- `source-of-truth-fix/`

Non-publishable companion docs:
- `host-git-lane/`

Legacy repo inputs `openclaw-git-workflow/` and `openclaw-host-git-pr/` are no longer publishable surfaces in this repo because they were physically removed after migration closure.

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
- planning
- branch-aware planning
- repo resolution
- live host node binding
- confirmed-plan validation
- host preflight
- bounded push
- bounded PR creation
- bounded wait for required checks
- bounded merge
- bounded sync of local `main`

## Skill Checks

For each active skill package:
- `SKILL.md` exists
- `README.md` exists
- `LICENSE` exists and matches the intended publication target
- no `package.json`
- no `openclaw.plugin.json`
- no runtime code is implied unless it exists

## Commands

Plugin publish:

```bash
clawhub package publish ./openclaw-host-git-workflow \
  --family code-plugin \
  --name @openclaw/openclaw-host-git-workflow \
  --display-name "OpenClaw Host Git Workflow" \
  --version 0.1.0 \
  --changelog "Bounded host-backed git workflow with live node binding" \
  --tags latest,git,workflow,host
```

Skill publish examples:

```bash
clawhub publish ./memory-hygiene --slug memory-hygiene --name "Memory Hygiene" --version 0.1.0 --changelog "Initial standalone package release" --tags memory,workflow,maintenance
clawhub publish ./source-of-truth-fix --slug source-of-truth-fix --name "Source Of Truth Fix" --version 0.1.0 --changelog "Initial standalone package release" --tags docs,verification,source-of-truth
```

## Blockers

- verify installed `clawhub` syntax on the current machine before the first real publish
- `clawhub whoami` must succeed
- first external install verification should be recorded before the first public release
