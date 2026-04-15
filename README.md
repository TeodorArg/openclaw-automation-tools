# openclaw-git-workflow

Skill-first git workflow repo for OpenClaw.

## Status

The branch+commit baseline is already implemented and verified on `main`: repo-aware planning, confirmed-plan execution, and bounded local branch/commit helpers are in place.
The separate optional internal host-backed push/PR bridge is also proven on a real grouped example: it can split work into git groups and branches, push those branches, and open PRs into `main`.
The remaining manual step is PR approval/review confirmation on GitHub itself. Release-candidate or publish decisions for the main package are separate from this sync and not the current engineering step.

## Goal

Define and maintain the skill-first git workflow package for the operator's real branch+commit process.
The public baseline stays the plugin-first `@openclaw/openclaw-git-workflow` workflow on `main`, while bounded host-backed push/PR remains a separate optional internal bridge in this same repo rather than the default public install shape.

## Fixed decisions

- In runtime and tooling, operate against the active container-visible repo path; host path examples are reference-only unless a host-backed action is being documented explicitly
- For the bounded host-backed push/PR seam under `plugin-host-git-push/`, operator-side host scripts should accept host-side env/path inputs first, including values like `OPENCLAW_GIT_WORKFLOW_REPO_DIR=/Users/...` and `OPENCLAW_PROJECT_DIR=/Users/...`, while typed jobs still normalize back to the canonical container-visible repo cwd
- Active plugin and skill implementation for this track lives in this repo, not in any separate external plugin repo
- The target design should prefer skill slash commands and skill-to-tool dispatch
- The target design must not depend on an always-on macOS helper app/node in autoload/bin style
- If a bug is first noticed in generated, bundled, packed, or rebuild-overwritten output, do not treat that artifact as the durable fix target. Record the problem, find the canonical source, and fix the source of truth instead.
- PR creation is not part of the main public v1 workflow surface, and the bounded host-backed PR seam now lives only in the internal `plugin-host-git-push/` bridge subtree
- That bounded bridge track already has validated host-backed push/PR capability wiring on the real macOS node-backed path, but it remains optional/internal and separate from the main public v1 workflow surface
- Workspace bootstrap hygiene matters for this implementation track: keep `MEMORY.md` compact and move long logs, audits, and chronology into `memory/*.md`

## Initial scope

The first implementation slice should cover the operator workflow around:
- `разложи по git-группам`
- `разложи по git-группам с ветками`
- `выполни git-группы с ветками`

These are workflow-level commands, not raw git shell passthrough.

## Reference docs

See `docs/SKILL_SPEC.md`, `docs/CONFIRMED_PLAN_FORMAT.md`, `docs/IMPLEMENTATION_SHAPE.md`, `docs/FILE_ROLE_MAP.md`, and `docs/REFERENCE_NOTES.md`.

For generated-output fixes discovered first in built or packaged artifacts, use the workspace `source-of-truth-fix` canon: record the user-visible problem, find the real source path, and avoid normalizing disposable artifact patches as repo truth.

## Fixed v1 execution rules

- `выполни git-группы с ветками` does not include push
- execution model for v1 is `plan -> confirm -> execute`
- the public v1 baseline executes bounded local branch + commit helpers inside the target repo
- one-shot execute is not part of v1
- push and PR are not part of the main public v1 workflow surface
- the internal `plugin-host-git-push/` bridge subtree already carries a validated bounded host-backed push/PR seam through the official node-backed host path
- through that host-backed seam we can already do grouping -> branches -> push -> PR into `main`
- the only remaining manual piece on that path is PR approval/review confirmation on GitHub itself
- any remaining work there is only honest runtime/docs exposure wording, not basic bridge capability or a change to the public v1 baseline

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

Merged `main` has now been validated end-to-end through the actual skill/tool flow.
That validation closed the key runtime details around checkout of existing branches, deterministic commit identity fallback, non-stacked branch creation from a fixed base commit, and deterministic runtime-only sub-grouping for clear `planning`, `execute`, and `install` diffs.

Current execute validation also checks bounded branch creation semantics and deterministic commit identity fallback.
