# TODO — remove runtime/container involvement from git/GitHub finish path

## Status

Closed on 2026-04-16.

This cleanup is complete.
The repo runtime contract is now branch + commit only.

## What landed

- removed the separate runtime bridge package that previously handled finish-path orchestration
- removed runtime intent routing for PR-oriented flows
- removed bridge-specific CI, packaging, tests, docs, and skill references
- narrowed repo docs so runtime/container behavior covers only planning plus confirmed branch + commit execution
- kept push, PR, auth, and remote checks explicitly outside the repo runtime/plugin surface

## Final verification checklist

- [x] no runtime plugin/package remains that exposes push or PR actions
- [x] no runtime code reads git remotes for push/PR handoff
- [x] no runtime code performs host capability preflight for push/PR
- [x] no runtime code writes host-side spool files for git/GitHub finish steps
- [x] no runtime code waits for host-side push/PR results
- [x] no plugin, script, skill, test, manifest, README, or docs page points at the removed bridge package
- [x] repo docs consistently say branch + commit only in runtime
- [x] no user-facing repo contract suggests runtime/container push or PR execution

## Verification commands

```bash
cd plugin
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```
