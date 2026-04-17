# @openclaw/openclaw-host-git-workflow

Publishable plugin package for the current standalone host-backed git workflow package in this repo family.

This package already ships:
- the runtime plugin/tool layer for intent normalization, repo-aware planning, repo resolution, node selection, confirmed-plan validation, host preflight, bounded push, bounded PR creation, and bounded sync-main
- the bundled `openclaw-host-git-workflow` skill under `skills/openclaw-host-git-workflow/`

This package does not yet ship the full host-backed finish flow.
Current bounded runtime coverage is:
- planning only
- branch-aware planning
- host repo resolution with centralized env precedence and normalized target path output
- host node selection with config/env/placeholder precedence and explicit unbound runtime status
- confirmed-plan validation
- host preflight for repo access, git/gh readiness, origin, branch identity, and GitHub auth
- push of the current non-main branch to `origin`
- PR creation from the current non-main branch into `main` via `gh`
- clean-worktree sync of local `main` from `origin/main` with fast-forward-only behavior

Planned follow-up runtime slices will add:
- wait_for_checks
- merge_pr

Current hard boundaries:
- push is bounded to the current local non-main branch and remote `origin`
- PR creation is bounded to the current local non-main branch into `main`
- sync-main is bounded to a clean worktree and `origin/main`
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
