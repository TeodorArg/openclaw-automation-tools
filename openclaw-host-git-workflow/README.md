# @openclaw/openclaw-host-git-workflow

Publishable OpenClaw plugin package for the active bounded host-backed git/GitHub workflow.

## Primary UX

The bundled skill surface is intentionally collapsed to one primary user-facing entrypoint:
- `send_to_git`
- `отправь в гит`

## Current Runtime Coverage

This package currently ships:
- repo-aware planning
- branch-aware planning
- repo resolution
- live host node binding
- host preflight
- bounded branch entry from `main` or another clean local branch into a requested non-main working branch
- confirmed-plan validation
- bounded push of the current non-main branch
- bounded PR creation into `main`
- bounded wait for required checks
- bounded merge of the current branch PR into `main`
- bounded sync of local `main` from `origin/main`

Shell execution now runs on the bound host node through `node.invoke` `system.run.prepare` / `system.run`, not through an unbound selector placeholder and not through repo-local helper scripts outside the package.

## Hard Boundaries

- no arbitrary shell passthrough
- no arbitrary `git` passthrough
- no arbitrary `gh` passthrough
- branch entry is bounded to a validated non-main local branch name
- branch entry may carry uncommitted changes only for `main -> new local branch` creation
- push is bounded to the current local non-main branch and `origin`
- PR creation is bounded to the current local non-main branch into `main`
- checks waiting is bounded to required checks for the current branch PR into `main`
- merge is bounded to the current branch PR into `main` with HEAD SHA matching
- sync-main is bounded to a clean worktree and `origin/main`

## Install

```bash
openclaw plugins install clawhub:@openclaw/openclaw-host-git-workflow
```

Local development:

```bash
nvm use || nvm install
cd openclaw-host-git-workflow
pnpm install
pnpm build
cd ..
openclaw plugins install -l ./openclaw-host-git-workflow
```

## Verify

```bash
cd openclaw-host-git-workflow
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```
