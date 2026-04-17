# @openclaw/openclaw-host-git-workflow

Publishable plugin package for the current standalone host-backed git workflow package in this repo family.

This package already ships:
- the runtime plugin/tool layer for intent normalization, repo-aware planning, confirmed-plan validation, bounded push, and bounded PR creation
- the bundled `openclaw-host-git-workflow` skill under `skills/openclaw-host-git-workflow/`

This package does not yet ship the full host-backed finish flow.
Current bounded runtime coverage is:
- planning only
- branch-aware planning
- confirmed-plan validation
- push of the current non-main branch to `origin`
- PR creation from the current non-main branch into `main` via `gh`

Planned follow-up runtime slices will add:
- host repo resolution
- node selection
- preflight
- checks polling
- merge / sync orchestration

Current hard boundaries:
- push is bounded to the current local non-main branch and remote `origin`
- PR creation is bounded to the current local non-main branch into `main`
- PR title/body are derived from the latest local commit
- arbitrary shell, arbitrary `git`, and arbitrary `gh` passthrough are out of scope

## Install

```bash
openclaw plugins install clawhub:@openclaw/openclaw-host-git-workflow
```

For local development:

```bash
nvm use || nvm install
cd openclaw-host-git-workflow
pnpm install
pnpm build
cd ..
openclaw plugins install -l ./openclaw-host-git-workflow
```

Recommended local dev version: Node `24.13.0` via the repo-root `.nvmrc`.
Compatibility floor remains defined by `package.json` engines: Node `>=20.19.0 || >=22.12.0`.

## Verify

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```
