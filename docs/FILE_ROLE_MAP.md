# File Role Map

This document records what each major area of the repo is responsible for.

## Main package baseline in this repo

The main package baseline in this repo is the plugin-first workflow package:
- `plugin/`
- bundled `openclaw-git-workflow` skill under `plugin/skills/`
- bounded branch/commit helpers in `scripts/`

This package is the intended main release surface for the repo, but it is currently kept private in-repo.

The separate `plugin-host-git-push/` subtree is retained in the repo, but it is not part of that main package baseline.

## Top-level areas

### `README.md`
Purpose:
- explain what the repo is
- explain the main package shape
- explain the retained bridge boundary
- give a short verify path

### `docs/CONFIRMED_PLAN_FORMAT.md`
Purpose:
- define the confirmed JSON payload accepted by execute
- keep the `plan -> confirm -> execute` contract explicit

### `docs/SKILL_SPEC.md`
Purpose:
- define the supported user-facing workflow intents
- define what the main workflow does and does not do

### `docs/IMPLEMENTATION_SHAPE.md`
Purpose:
- define how skill, plugin, and scripts fit together
- record the bounded runtime/tool split
- keep the bridge boundary explicit

### `docs/FILE_ROLE_MAP.md`
Purpose:
- define file responsibilities
- reduce drift when repo structure changes

### `docs/REFERENCE_NOTES.md`
Purpose:
- keep only narrow reference notes that still matter
- record why `plugin-host-git-push/` stays retained but separate

### `plugin/`
Purpose:
- main package source in this repo
- bounded runtime tool for plan/execute workflow
- bundled workflow skill under `plugin/skills/`
- repo-local contract doc under `plugin/EXECUTE_SURFACE.md`

Key files:
- `plugin/package.json`
- `plugin/openclaw.plugin.json`
- `plugin/README.md`
- `plugin/EXECUTE_SURFACE.md`
- `plugin/skills/openclaw-git-workflow/SKILL.md`
- `plugin/src/*`

### `scripts/`
Purpose:
- bounded write helpers for the main workflow

Current scripts:
- `scripts/git-create-branch.sh`
- `scripts/git-create-commit.sh`

### `plugin-host-git-push/`
Purpose:
- separate bounded host-backed push/PR bridge
- retained in-repo finish path for push and PR
- not part of the main package contract above

Key files:
- `plugin-host-git-push/package.json`
- `plugin-host-git-push/openclaw.plugin.json`
- `plugin-host-git-push/README.md`
- `plugin-host-git-push/BRIDGE_SURFACE.md`
- `plugin-host-git-push/skills/*`
- `plugin-host-git-push/src/*`

## Rules

- Keep the main package narrow.
- Keep push and PR outside the main branch+commit contract.
- Keep `plugin-host-git-push/` separate when it remains in the repo.
- Keep `plugin/EXECUTE_SURFACE.md` and `plugin-host-git-push/BRIDGE_SURFACE.md` aligned with the real package and runtime surface.
- Do not widen any user-facing surface into arbitrary git or shell passthrough.
- If a bug is first found in generated output, fix the canonical source rather than normalizing the artifact patch.
