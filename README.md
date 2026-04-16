# openclaw-git-workflow

Install-oriented repo index for the `openclaw-git-workflow` plugin package and its bundled skill.

## Install

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
openclaw plugins install -l ./openclaw-git-workflow
```

Recommended local dev version: Node `24.13.0` via the repo-root `.nvmrc`.

## Supporting Docs

- [docs/CLAWHUB_PUBLISH_PREFLIGHT.md](docs/CLAWHUB_PUBLISH_PREFLIGHT.md): first-upload and publish-host preflight notes
- [docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md](docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md): product-level node install and identity contract

## Verify

```bash
cd openclaw-git-workflow
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

## Package Index

- [openclaw-git-workflow/README.md](openclaw-git-workflow/README.md): installable plugin package with bundled skill
- [memory-hygiene/README.md](memory-hygiene/README.md): skill-only package
- [source-of-truth-fix/README.md](source-of-truth-fix/README.md): skill-only package
- [openclaw-host-git-pr/README.md](openclaw-host-git-pr/README.md): skill-only package
- [host-git-lane/README.md](host-git-lane/README.md): companion docs for host-backed git/GitHub behavior
