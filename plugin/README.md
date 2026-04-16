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

Separate from that public package, this repo also contains the private/internal `plugin-host-git-push/` and `skills/openclaw-host-git-push/` subtree for bounded host-push work. That bridge track is intentionally not part of the main public `openclaw-git-workflow` release surface.

## Install

```bash
openclaw plugins install clawhub:@openclaw/openclaw-git-workflow
```

For local development:

```bash
pnpm install
pnpm build
openclaw plugins install -l ./plugin
```

## Release policy

- version with semver
- keep `package.json` and `openclaw.plugin.json` versions aligned
- treat current `0.x` releases as pre-1.0 stabilization releases
- publish only after green local verification plus one clean external install verification pass

Detailed release guidance lives in `../docs/RELEASE_POLICY.md`.

## Verify

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```
