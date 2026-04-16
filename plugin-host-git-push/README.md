# @openclaw/openclaw-host-git-push

Separate in-repo plugin package for the bounded host-backed push/PR bridge.

This package bundles:
- the `git_push_bridge_action` runtime tool
- the `git_pr_bridge_action` runtime tool
- the skill source under `plugin-host-git-push/skills/openclaw-host-git-push/`
- the skill source under `plugin-host-git-push/skills/openclaw-host-git-pr/`
- packaged skill outputs at `skills/openclaw-host-git-push/SKILL.md` and `skills/openclaw-host-git-pr/SKILL.md`

This package stays separate from `@openclaw/openclaw-git-workflow`.
It remains an internal-explicit bridge package for bounded host-side push/PR actions with explicit capability preflight.

Stable contract:
- inspect push/PR capabilities
- push current branch
- assert PR readiness
- create a PR from the current branch to `main`

Status:
- validated as a separate optional bounded bridge
- not part of the main public branch + commit baseline
- do not describe this package as if runtime-surface exposure is already universal or default
- do not authenticate git or GitHub in the runtime/container for this package, all push/PR work stays host-backed only

Note:
- `BRIDGE_SURFACE.md` is a repo-local contract doc for this package source tree
- it is not currently shipped as part of the packaged file list

## Local verify

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```
