# @openclaw/openclaw-host-git-push

Private/internal plugin package for the bounded host push bridge.

This package bundles:
- the `git_push_bridge_action` runtime tool
- the `openclaw-host-git-push` skill under `skills/openclaw-host-git-push/`

This package is intentionally separate from the main public `@openclaw/openclaw-git-workflow` release surface.
It exists to support the bounded host-side Plan A push path and its capability preflight.

## Local verify

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```
