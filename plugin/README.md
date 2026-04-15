# @openclaw/openclaw-git-workflow

Bounded OpenClaw plugin package for the main git-workflow surface in this repo.

Current status:
- main package surface for this repo
- currently kept private in-repo via `plugin/package.json`

This package bundles:
- the `git_workflow_action` runtime tool
- repo-source helper scripts under `plugin/scripts/`, packaged as `scripts/`
- the workflow skill source under `plugin/skills/openclaw-git-workflow/`, packaged as `skills/openclaw-git-workflow/SKILL.md`

Main workflow:
- plan git groups
- plan git groups with branch suggestions
- execute only bounded branch + commit steps from a confirmed plan

Out of scope:
- push
- PR creation
- arbitrary shell passthrough
- destructive recovery flows

Note:
- `EXECUTE_SURFACE.md` is a repo-local contract doc for this package source tree
- repo paths in this file use the source-tree frame, while packaged plugin paths use package-root paths like `scripts/` and `skills/`
- it is not currently shipped as part of the packaged file list

The separate `plugin-host-git-push/` subtree remains a retained bounded host-backed bridge for push and PR actions. It is intentionally separate from this package.

## Local verify

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```
