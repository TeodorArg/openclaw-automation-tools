# File Role Map

This document records what each major area of the repo is responsible for.

## Main package baseline in this repo

The main package baseline in this repo is the plugin-first workflow package:
- `openclaw-git-workflow/`
- bundled `openclaw-git-workflow` skill under `openclaw-git-workflow/skills/`
- bounded branch/commit helpers in `openclaw-git-workflow/scripts/`

This package is the main package surface for the repo, but it is currently kept private in-repo.

Push, PR, auth, and remote checks are not part of the main package baseline and are not implemented as runtime/plugin surfaces in this repo.

## Top-level areas

### `README.md`
Purpose:
- explain what the repo is
- explain the main package shape
- explain the bounded branch+commit-only boundary
- give a short verify path

### `docs/CONFIRMED_PLAN_FORMAT.md`
Purpose:
- define the confirmed JSON payload accepted by execute
- keep the `plan -> confirm -> execute` contract explicit

### `docs/SKILL_SPEC.md`
Purpose:
- define the product/spec-level workflow wording and intent expectations
- keep the split explicit between specification phrases and shipped runtime intent ids
- define how the workflow maps onto the bounded internal package surface

### `docs/IMPLEMENTATION_SHAPE.md`
Purpose:
- define how skill, plugin, and scripts fit together
- record the bounded runtime/tool split
- keep the branch+commit-only boundary explicit

### `docs/FILE_ROLE_MAP.md`
Purpose:
- define file responsibilities
- reduce drift when repo structure changes

### `docs/REFERENCE_NOTES.md`
Purpose:
- keep only narrow reference notes that still matter
- record the narrowed runtime contract and related reminders

### `openclaw-git-workflow/`
Purpose:
- main package source in this repo
- bounded runtime tool for plan/execute workflow
- bundled workflow skill under `openclaw-git-workflow/skills/`
- bounded helper scripts under `openclaw-git-workflow/scripts/`
- repo-local contract doc under `openclaw-git-workflow/EXECUTE_SURFACE.md`

Key files:
- `openclaw-git-workflow/package.json`
- `openclaw-git-workflow/openclaw.plugin.json`
- `openclaw-git-workflow/README.md`
- `openclaw-git-workflow/EXECUTE_SURFACE.md`
- `openclaw-git-workflow/skills/openclaw-git-workflow/SKILL.md`
- `openclaw-git-workflow/src/*`

### `openclaw-git-workflow/scripts/`
Purpose:
- bounded write helpers for the main workflow

Current scripts:
- `openclaw-git-workflow/scripts/git-create-branch.sh`
- `openclaw-git-workflow/scripts/git-create-commit.sh`

## Rules

- Keep the main branch + commit package narrow.
- Keep canonical intent ids language-agnostic, with utterances treated as aliases.
- Keep push, PR, auth, and remote checks outside the runtime/plugin surface for this repo.
- Keep `openclaw-git-workflow/EXECUTE_SURFACE.md` aligned with the real package and runtime surface.
- Do not widen any user-facing surface into arbitrary git or shell passthrough.
- If a bug is first found in generated output, fix the canonical source rather than normalizing the artifact patch.
