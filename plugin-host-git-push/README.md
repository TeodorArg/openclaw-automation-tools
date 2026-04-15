# @openclaw/openclaw-host-git-push

Private/internal plugin package for the bounded host push/PR bridge.

This package bundles:
- the `git_push_bridge_action` runtime tool
- the `git_pr_bridge_action` runtime tool
- the `openclaw-host-git-push` skill under `plugin-host-git-push/skills/openclaw-host-git-push/`
- the `openclaw-host-git-pr` skill under `plugin-host-git-push/skills/openclaw-host-git-pr/`

This package is an internal subtree/package in the same repo and is intentionally separate from the main public `@openclaw/openclaw-git-workflow` release surface.
It exists to support bounded host-side push/PR actions with explicit capability preflight.

Latest live status:
- the official macOS node-backed host path now reaches bounded `gh pr create`
- host-path targeting drift is fixed in the core helper scripts, so operator-side checks can use real `/Users/...` repo paths while typed jobs still keep canonical container-visible repo cwd
- the bounded bridge path is already proven end-to-end for grouping -> branches -> push -> PR into `main`
- the remaining manual GitHub step on that path is PR approval/review confirmation, while the remaining product/docs work is only honest runtime-surface exposure and canon clarity

## Local verify

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```
