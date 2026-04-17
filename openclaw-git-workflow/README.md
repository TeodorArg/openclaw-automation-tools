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

This package and repo runtime surface now covers the bounded workflow from planning through push, PR creation, checks polling, merge, and `main` sync.

Hard boundaries still apply:
- branch + commit execution remains driven only by an explicit confirmed plan
- push stays bounded to the current non-`main` branch and remote `origin`
- PR operations stay bounded to the current branch into `main`
- checks polling reads required PR checks only
- merge stays bounded to the current branch PR into `main`
- `sync_main` switches to local `main` and runs `git pull --ff-only origin main`
- arbitrary shell, arbitrary `git`, and arbitrary `gh` passthrough remain out of scope

## Install

```bash
openclaw plugins install clawhub:@openclaw/openclaw-git-workflow
```

For local development:

```bash
nvm use || nvm install
pnpm install
pnpm build
openclaw plugins install -l ./openclaw-git-workflow
```

Recommended local dev version: Node `24.13.0` via the repo-root `.nvmrc`.
Compatibility floor remains defined by `package.json` engines: Node `>=20.19.0 || >=22.12.0`.

## Release policy

- version with semver
- keep `package.json` and `openclaw.plugin.json` versions aligned
- treat current `0.x` releases as pre-1.0 stabilization releases
- publish only after green local verification plus one clean external install verification pass

For first upload and publish-host checks, see:
- [docs/CLAWHUB_PUBLISH_PREFLIGHT.md](../docs/CLAWHUB_PUBLISH_PREFLIGHT.md)

## Verify

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```
