# openclaw-git-workflow

Skill-first git workflow repo for OpenClaw.

## Status

Specification repo, not implementation-complete yet.

## Goal

Create a new repo that defines and then implements a skill-first workflow for this operator's git process, instead of continuing through the currently blocked plugin-command path.

## Fixed decisions

- Repo path: `/Users/svarnoy85/teodorArg/openclaw-git-workflow`
- Old repo `/Users/svarnoy85/teodorArg/openclaw-host-git-push` is reference-only for proven ideas and prior runtime experiments
- The target design should prefer skill slash commands and skill-to-tool dispatch
- The target design must not depend on an always-on macOS helper app/node in autoload/bin style
- PR creation is a separate later track and is not part of the first implementation slice

## Initial scope

The first implementation slice should cover the operator workflow around:
- `разложи по git-группам`
- `разложи по git-группам с ветками`
- `выполни git-группы с ветками`

These are workflow-level commands, not raw git shell passthrough.

## Reference docs

See `docs/SKILL_SPEC.md`, `docs/FILE_ROLE_MAP.md`, and `docs/REFERENCE_NOTES.md`.

## Fixed v1 execution rules

- `выполни git-группы с ветками` does not include push
- execution backend for v1 is only `openclaw-git`
- execution model for v1 is `plan -> confirm -> execute`
- one-shot execute is not part of v1
- push is a later step
- PR is a later separate track
