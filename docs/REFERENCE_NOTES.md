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

- the user chose to stop building on the blocked plugin-command path
- the new repo is intended to be skill-first
- old code may still contain transitional assumptions from the older runtime/plugin direction
- current canon for bridge packaging, skills, and docs is the in-repo `plugin-host-git-push/` subtree

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

## Runtime install notes learned from this track

- For live OpenClaw plugin install, `plugin/openclaw.plugin.json` must include `configSchema`, even when the plugin has no config.
- In the current OpenClaw runtime, plugin dependency installation is still npm-based during `openclaw plugins install`, even if `pnpm` is available in the container.
- Making `pnpm` available by default in Docker is still useful for operator and repo workflows, but it should not be confused with changing OpenClaw's internal plugin installer behavior.

## Workspace context hygiene for this track

- When recording durable assistant context during this implementation track, keep `MEMORY.md` compact and high-signal.
- Put long investigations, verification logs, and chronology into `memory/*.md` rather than growing bootstrap-injected files.
- Prefer `agents.defaults.contextInjection = "continuation-skip"` in the live OpenClaw config to reduce repeated bootstrap injection on safe continuation turns.
