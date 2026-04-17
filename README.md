# openclaw-automation-tools

Multi-package OpenClaw repository for one active host-backed plugin package, skill-only packages, and companion documentation.

## Current Repo Map

| Path | Current shape | Purpose |
| --- | --- | --- |
| [openclaw-host-git-workflow/README.md](openclaw-host-git-workflow/README.md) | publishable plugin-plus-skill package | Active bounded host-backed git/GitHub workflow package |
| [memory-hygiene/README.md](memory-hygiene/README.md) | skill-only package | Memory maintenance skill package |
| [source-of-truth-fix/README.md](source-of-truth-fix/README.md) | skill-only package | Source-of-truth repair skill package |
| [host-git-lane/README.md](host-git-lane/README.md) | companion docs only | Canonical docs for the external host lane and product boundary |

Legacy repo inputs `openclaw-git-workflow/` and `openclaw-host-git-pr/` were removed after their useful runtime/skill semantics were folded into `openclaw-host-git-workflow/`.

## Active Package Direction

`openclaw-host-git-workflow/` is the only active plugin package in this repo.

Its current shipped slice covers:
- repo-aware planning
- branch-aware planning
- repo resolution
- live host node binding
- host preflight
- confirmed-plan validation
- bounded push of the current non-main branch to `origin`
- bounded PR creation into `main`
- bounded wait for required checks
- bounded merge of the current branch PR into `main`
- bounded sync of local `main` from `origin/main`

The runtime now binds to a concrete host node and executes shell steps through `node.invoke` `system.run.prepare` / `system.run`, instead of treating node selection as an unbound placeholder.

## Install

Local development install:

```bash
nvm use || nvm install
cd openclaw-host-git-workflow
pnpm install
pnpm build
cd ..
openclaw plugins install -l ./openclaw-host-git-workflow
```

Registry install:

```bash
openclaw plugins install clawhub:@openclaw/openclaw-host-git-workflow
```

## Verification

For `openclaw-host-git-workflow/`:

```bash
cd openclaw-host-git-workflow
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

For each skill-only package, verify:
- `SKILL.md` exists
- `README.md` exists
- `LICENSE` exists
- no `package.json`
- no `openclaw.plugin.json`
- no runtime code is implied unless it exists

## Repo Facts

- The repo root does not ship a `package.json`, `pnpm-workspace.yaml`, or `openclaw.plugin.json`.
- Local development is pinned to Node `24.13.0` via `.nvmrc`.
- Repo-local planning scratch files belong only under ignored `.local-planning/`.
- `host-git-lane/` remains documentation-only and must not be reshaped into a fake package.
- Product-level `openclaw node` install/runtime ownership belongs to OpenClaw product docs, not to an invented repo-local package surface.
