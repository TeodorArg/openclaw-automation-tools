# openclaw-automation-tools

Install-facing repo for the `openclaw-git-workflow` OpenClaw plugin package plus related skill packages and host companion docs.

## What Is Here

- [openclaw-git-workflow/README.md](openclaw-git-workflow/README.md): the publishable plugin package with its bundled skill and runtime surface
- [memory-hygiene/README.md](memory-hygiene/README.md): skill-only package
- [source-of-truth-fix/README.md](source-of-truth-fix/README.md): skill-only package
- [openclaw-host-git-pr/README.md](openclaw-host-git-pr/README.md): skill-only package for host-backed PR workflows
- [host-git-lane/README.md](host-git-lane/README.md): companion docs for host-backed git and GitHub behavior; not a publishable plugin package

## Install The Plugin

From ClawHub:

```bash
openclaw plugins install clawhub:@openclaw/openclaw-git-workflow
```

From a local checkout:

```bash
nvm use || nvm install
cd openclaw-git-workflow
pnpm install
pnpm build
cd ..
openclaw plugins install -l ./openclaw-git-workflow
```

Local development is pinned to Node `24.13.0` via the repo-root `.nvmrc`.

## Verify The Plugin Package

Run from `openclaw-git-workflow/`:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

## Docs That Still Matter

- [docs/CLAWHUB_PUBLISH_PREFLIGHT.md](docs/CLAWHUB_PUBLISH_PREFLIGHT.md): first-upload checks, current ClawHub publish notes, and preflight expectations
- [docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md](docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md): product-level `openclaw node` install flow, host boundary, and required identity metadata

## Repo Boundaries

- `openclaw-git-workflow/` is the only plugin package in this repo.
- `memory-hygiene/`, `source-of-truth-fix/`, and `openclaw-host-git-pr/` are skill-only packages.
- `host-git-lane/` is companion documentation for host-backed execution and should not be turned into a fake plugin package.
- `AGENTS.md` is kept locally for workflow instructions and is not tracked by git.
