# Reference Notes

This file should stay narrow.
Keep only notes that still matter to the current repo shape.

## Runtime boundary decision

Do not keep any runtime/plugin bridge for push or PR in this repo.

The repo contract is now narrower:
- `plugin/` owns planning plus branch/commit execution behind `send_to_git`
- push, PR, auth, and remote checks stay outside the runtime/container surface entirely

Specification wording may still reference broader workflow phrasing, but shipped runtime canon must stay anchored to the actual normalized intent and alias set implemented in code. The current runtime alias set already includes the RU planning and execute phrases.

## Main package reminder

The main package in this repo remains:
- `@openclaw/openclaw-git-workflow`
- bundled workflow skill under `plugin/skills/` and packaged `skills/`
- bounded branch/commit helpers under `plugin/scripts/`
- bounded branch + commit workflow only behind the operator-facing `send_to_git` intent

This is the main package surface for the repo, while the package is still kept private in-repo.
The current published package file list does not include the repo-local shell helper scripts.

## Generated-output rule

If a bug is first observed in generated, bundled, packed, copied, or rebuild-overwritten output, do not treat that artifact as the canonical fix target.
Trace back to the real source and fix that instead.

## Install/runtime reminder

For live OpenClaw plugin install, `plugin/openclaw.plugin.json` must include `configSchema`, even when empty.
The current runtime still uses npm-based dependency installation during `openclaw plugins install`.
