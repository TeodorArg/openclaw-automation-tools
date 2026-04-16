# @openclaw/openclaw-git-workflow

Publishable plugin package for the `openclaw-git-workflow` project.

This package is the intended one-step public install artifact. It bundles:
- the runtime plugin/tool layer
- the `openclaw-git-workflow` skill under `skills/openclaw-git-workflow/`

Why this shape:
- `openclaw skills install <slug>` installs only a skill folder
- the git-workflow skill requires a custom plugin tool/runtime layer
- plugin manifests can bundle `skills` directories that load when the plugin is enabled

So the practical public install model for this project is plugin-first, with the user-facing workflow skill shipped inside the plugin package.

This package and repo runtime surface are intentionally limited to planning plus confirmed branch + commit execution. Push, PR creation, and remote checks are outside this package contract and must stay outside the runtime/container path.

## Install

```bash
openclaw plugins install clawhub:@openclaw/openclaw-git-workflow
```

For local development:

```bash
nvm use || nvm install
pnpm install
pnpm build
openclaw plugins install -l ./plugin
```

Node requirement: use Node `20.19.0+` (or `22.12.0+`). Older Node 20 releases can fail locally in `vitest` and `vite/rolldown` on macOS.

## Release policy

- version with semver
- keep `package.json` and `openclaw.plugin.json` versions aligned
- treat current `0.x` releases as pre-1.0 stabilization releases
- publish only after green local verification plus one clean external install verification pass

Release verification currently stays inline in this README because the repo does not keep a separate `docs/RELEASE_POLICY.md`.

## Verify

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```
