# Reference Notes

## Canonical repo path in this session

For work inside the current container-backed assistant session, use:
- `/home/node/repos/openclaw-git-workflow`

Do not treat the host path `/Users/svarnoy85/teodorArg/openclaw-git-workflow` as the operational path from inside this session unless the distinction is being documented explicitly.

## Reference-only repo

Use `/Users/svarnoy85/teodorArg/openclaw-host-git-push` as a reference source only.

It is useful for:
- prior bounded runtime ideas
- existing adapter flow patterns
- repo state checks
- historical experiments around tool path vs command path

It should not be treated as the implementation base for the new repo.

## Why it is reference-only

- the user chose to stop building on the blocked plugin-command path
- the new repo is intended to be skill-first
- old code may still contain transitional assumptions from the older runtime/plugin direction

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
- any assumption that container `gh` auth is already solved

## Runtime install notes learned from this track

- For live OpenClaw plugin install, `plugin/openclaw.plugin.json` must include `configSchema`, even when the plugin has no config.
- In the current OpenClaw runtime, plugin dependency installation is still npm-based during `openclaw plugins install`, even if `pnpm` is available in the container.
- Making `pnpm` available by default in Docker is still useful for operator and repo workflows, but it should not be confused with changing OpenClaw's internal plugin installer behavior.

## Workspace context hygiene for this track

- When recording durable assistant context during this implementation track, keep `MEMORY.md` compact and high-signal.
- Put long investigations, verification logs, and chronology into `memory/*.md` rather than growing bootstrap-injected files.
- Prefer `agents.defaults.contextInjection = "continuation-skip"` in the live OpenClaw config to reduce repeated bootstrap injection on safe continuation turns.
