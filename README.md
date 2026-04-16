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

- [openclaw-git-workflow/README.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/README.md): installable plugin package with bundled skill
- [memory-hygiene/README.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/memory-hygiene/README.md): skill-only package
- [source-of-truth-fix/README.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/source-of-truth-fix/README.md): skill-only package
- [openclaw-host-git-pr/README.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-host-git-pr/README.md): skill-only package
- [host-git-lane/README.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/host-git-lane/README.md): companion docs for host-backed git/GitHub behavior
