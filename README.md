# openclaw-git-workflow

Skill-first git workflow repo for OpenClaw.

## Status

Early implementation repo with a working standalone plugin package, bounded branch/commit execution, and repo-aware planning on `main`, but not implementation-complete yet.

## Goal

Create a new repo that defines and then implements a skill-first workflow for this operator's git process, instead of continuing through the currently blocked plugin-command path.

## Fixed decisions

- In the current container session, the canonical implementation path for this repo is `/home/node/repos/openclaw-git-workflow`
- Do not confuse that container path with the host path `/Users/svarnoy85/teodorArg/openclaw-git-workflow` when operating inside the container-backed assistant session
- Old repo `/Users/svarnoy85/teodorArg/openclaw-host-git-push` is reference-only for proven ideas and prior runtime experiments
- The target design should prefer skill slash commands and skill-to-tool dispatch
- The target design must not depend on an always-on macOS helper app/node in autoload/bin style
- PR creation is a separate later track and is not part of the first implementation slice
- Workspace bootstrap hygiene matters for this implementation track: keep `MEMORY.md` compact and move long logs, audits, and chronology into `memory/*.md`

## Initial scope

The first implementation slice should cover the operator workflow around:
- `разложи по git-группам`
- `разложи по git-группам с ветками`
- `выполни git-группы с ветками`

These are workflow-level commands, not raw git shell passthrough.

## Reference docs

See `docs/SKILL_SPEC.md`, `docs/CONFIRMED_PLAN_FORMAT.md`, `docs/IMPLEMENTATION_SHAPE.md`, `docs/FILE_ROLE_MAP.md`, and `docs/REFERENCE_NOTES.md`.

## Fixed v1 execution rules

- `выполни git-группы с ветками` does not include push
- execution model for v1 is `plan -> confirm -> execute`
- the current first slice executes bounded local branch + commit helpers inside the target repo
- integration with the validated operator-side `openclaw-git` path is a later step, not current first-slice reality
- one-shot execute is not part of v1
- push is a later step
- PR is a later separate track

## Current implementation state

The repo now has the first working implementation layer for:
- `skills/openclaw-git-workflow/SKILL.md`
- `docs/CONFIRMED_PLAN_FORMAT.md`
- `plugin/EXECUTE_SURFACE.md`
- standalone plugin package under `plugin/`
- bounded branch/commit helpers under `scripts/`

The plugin package has been brought to a real standalone TypeScript package shape and verified through:
- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`

The next implementation step is to validate merged `main` end-to-end through the actual skill/tool flow, then decide whether the current area-based grouping is enough or should become more granular.
