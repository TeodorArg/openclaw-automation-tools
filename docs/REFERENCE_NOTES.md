# Reference Notes

This file should stay narrow.
Keep only notes that still matter to the current repo shape.

## Retained bridge decision

Keep `plugin-host-git-push/` in the repo.

Do not treat it as part of the main branch+commit package baseline.
Simple boundary: `plugin/` owns planning plus branch/commit execution, while `plugin-host-git-push/` owns the separate host-backed push/PR finish path.
Treat it as a separate internal-explicit subtree because it carries the bounded host-backed finish path for:
- push current branch
- PR readiness checks
- create PR to `main`

## Main package reminder

The main package in this repo remains:
- `@openclaw/openclaw-git-workflow`
- bundled workflow skill under `plugin/skills/` and packaged `skills/`
- bounded branch/commit helpers under `plugin/scripts/` and packaged `scripts/`
- bounded branch + commit workflow only

This is the main package surface for the repo, while the package is still kept private in-repo.

## Generated-output rule

If a bug is first observed in generated, bundled, packed, copied, or rebuild-overwritten output, do not treat that artifact as the canonical fix target.
Trace back to the real source and fix that instead.

## Install/runtime reminder

For live OpenClaw plugin install, `plugin/openclaw.plugin.json` must include `configSchema`, even when empty.
The current runtime still uses npm-based dependency installation during `openclaw plugins install`.
