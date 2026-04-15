# Reference Notes

## Active repo path model

For runtime work in the container-backed assistant session, use the active container-visible repo path.
If host-backed actions are being documented explicitly, keep host paths as examples or operator-side inputs rather than treating them as the main repo canon.

## Current bridge location

The active bounded host push/PR bridge work lives in this repo under `plugin-host-git-push/`.

Active plugin and skill implementation for this track should be treated as in-repo work under `plugin/`, `skills/`, and `plugin-host-git-push/`, not as work in a separate external plugin repo.

## Historical reference

Older external repo material may still be useful as historical reference for prior bounded runtime ideas or experiments, but it is not the implementation base for the current repo.

## Why current implementation stays in-repo

- the main public workflow is skill-first rather than centered on plugin command-path entrypoints
- the current repo is the canonical implementation base for the public branch+commit workflow package
- old code may still contain transitional assumptions from the older runtime/plugin direction
- current canon for bridge packaging, skills, and docs is the in-repo `plugin-host-git-push/` subtree for the optional internal host-backed push/PR seam

## What may be reused conceptually

- bounded action patterns
- repo-state inspection logic
- remote-selection logic if still valid
- Plan A push concepts that do not rely on the blocked command-path bridge
- narrow runtime validation patterns that fit the new confirmed-plan execute gate

## What should not be carried forward blindly

- plugin command-path assumptions
- host-helper/autoload patterns
- any design that requires an always-on macOS helper app/node installed in autoload/bin style
- any assumption that container `gh` auth is already solved for the main public v1 path

## Generated-output fix rule

If a bug is first observed in generated, bundled, packed, copied, or rebuild-overwritten output, do not normalize that artifact as the real fix target.
Record the user-visible problem first, then trace back to the canonical source and fix that durable source path.
Temporary artifact-only patches may still be useful for diagnosis, but they should be labeled as disposable.

## Runtime install notes learned from this track

- For live OpenClaw plugin install, `plugin/openclaw.plugin.json` must include `configSchema`, even when the plugin has no config.
- In the current OpenClaw runtime, plugin dependency installation is still npm-based during `openclaw plugins install`, even if `pnpm` is available in the container.
- Making `pnpm` available by default in Docker is still useful for operator and repo workflows, but it should not be confused with changing OpenClaw's internal plugin installer behavior.

## Workspace context hygiene for this track

- When recording durable assistant context during this implementation track, keep `MEMORY.md` compact and high-signal.
- Put long investigations, verification logs, and chronology into `memory/*.md` rather than growing bootstrap-injected files.
- Prefer `agents.defaults.contextInjection = "continuation-skip"` in the live OpenClaw config to reduce repeated bootstrap injection on safe continuation turns.
