# Implementation Shape

## Doc-backed basis

This implementation shape is based on:
- OpenClaw local docs for skills and slash commands
- Context7 OpenClaw docs confirming `command-dispatch: tool`, `command-tool`, `command-arg-mode: raw`, and deterministic skill-to-tool routing
- current Docker split-layer and SSH-agent constraints already validated in the main repo
- current evidence that the baseline container path is still not the place to treat PR flows as part of the public v1 workflow, even though operator-side macOS GitHub auth is now working for the optional internal host-backed push/PR bridge

## Core design

The repo should be built around three layers:

1. `skills/` — user-facing workflow commands
2. `plugin/` — custom tool surface and bounded runtime wiring
3. `scripts/` — bounded helper actions only

The skill is the UX layer.
The plugin is the tool/runtime layer.
The scripts are narrow execution helpers.

## Why this split

- Skills are the cleanest official way to expose user-invocable workflow commands.
- Skill `command-dispatch: tool` can bypass the model and route directly into the tool pipeline.
- The current blocked surface is the plugin command path, so the new design should avoid depending on plugin `registerCommand()` as the primary entrypoint.
- A small supporting plugin may still be needed because the skill needs a deterministic custom tool with a bounded contract.

## Proposed repo structure

### `skills/openclaw-git-workflow/SKILL.md`
Responsibility:
- define the workflow-level slash command behavior
- document the three operator intents
- declare deterministic tool dispatch if the final chosen command shape uses direct dispatch
- teach the agent the difference between planning and execution modes

Possible future companion files under the skill:
- `skills/openclaw-git-workflow/references/workflow-rules.md`
- `skills/openclaw-git-workflow/references/git-guidance-summary.md`

### `plugin/`
Responsibility:
- hold the minimal supporting plugin package for execute-mode tool logic
- define one bounded tool contract for the git workflow
- translate tool actions into bounded runtime helpers
- keep planning groups deterministic, with area-based grouping by default and a narrow runtime-only sub-grouping layer when file paths make that split obvious

Required first-slice package shape:
- `plugin/package.json`
- `plugin/openclaw.plugin.json`
- `plugin/index.ts`
- `plugin/api.ts`
- `plugin/tsconfig.json`
- `plugin/tsconfig.build.json`
- `plugin/.gitignore`
- `plugin/src/index.ts`
- `plugin/src/git-workflow-tool.ts`
- `plugin/src/runtime/validate-confirmed-plan.ts`
- `plugin/src/types/openclaw-plugin-sdk.d.ts`

Required package scripts in `plugin/package.json`:
- `build`: `tsc -p tsconfig.build.json`
- `format`: `biome format --write .`
- `format:check`: `biome format --check .`
- `lint`: `biome check .`
- `lint:fix`: `biome check --write .`
- `check`: `pnpm lint && pnpm test && pnpm build`
- `typecheck`: `tsc --noEmit -p tsconfig.json`
- `test`: `vitest run --config ./vitest.config.ts`

Required devDependencies for the first plugin scaffold:
- `@biomejs/biome`
- `@types/node`
- `typescript`
- `vitest`

Do not treat plugin scaffolding as complete until the package is shaped like a real TS package rather than a source-only sketch.

### `scripts/`
Responsibility:
- implement explicit bounded actions only
- never expose generic shell passthrough
- keep branch and commit operations narrow and validated in the first slice

Likely future files:
- `scripts/git-create-branch.sh`
- `scripts/git-create-commit.sh`
- later: `scripts/git-push-current-branch.sh`
- avoid a large catch-all dispatcher; prefer several narrow scripts

## Recommended minimal tool contract

Prefer one tool with explicit actions over multiple loosely-shaped tools.

Tool name:
- `git_workflow_action`

Contract shape:

```json
{
  "action": "plan-groups" | "plan-groups-with-branches" | "execute-groups-with-branches",
  "command": "<raw skill args>",
  "commandName": "<slash command>",
  "skillName": "openclaw-git-workflow"
}
```

## Why this contract

- It matches OpenClaw skill docs for `command-dispatch: tool` with raw argument forwarding.
- It keeps the skill-facing side simple.
- It allows the plugin tool to parse workflow intent deterministically.
- It avoids pretending that user input is safe shell input.

## Expected tool behavior

### `action = plan-groups`
- inspect repo state
- classify changed files into candidate git groups
- produce branch-name suggestions only if useful for explanation
- produce canonical commit title/body suggestions
- execute nothing

### `action = plan-groups-with-branches`
- do all plan work
- require branch-name proposals
- output exact commands or exact planned actions
- execute nothing

### `action = execute-groups-with-branches`
- validate explicit execution intent
- run only after the planning step has already established the intended groups
- require a confirmed internal plan format
- validate inputs derived from the planning step
- create branches
- stage grouped files
- create commits in canonical format
- not push in v1
- never create PRs implicitly

## Input parsing rule

The skill raw command string should be parsed into a structured internal request by plugin code, not by shell scripts.

That parser should:
- detect which operator intent is being used
- validate optional arguments
- reject ambiguous or unsafe execution requests

## Script boundary rule

Scripts should receive already-validated structured inputs from the plugin runtime layer.
Scripts should not be responsible for understanding free-form user text.

## Security and platform notes

### Skills
OpenClaw docs confirm:
- skills can be user-invocable slash commands
- skills can dispatch directly to tools with `command-dispatch: tool`
- raw args can be forwarded to the tool using `command-arg-mode: raw`

### Docker and SSH-agent
The validated container-side push path in the current environment depends on:
- optional git layer only, not baseline gateway
- Docker Desktop socket `/run/host-services/ssh-auth.sock`
- explicit host-side ssh-agent readiness
- bounded container-side execution, not arbitrary shell

### GitHub CLI
Do not make PR creation part of the main public v1 workflow surface.
Host-side macOS GitHub auth is now validated for the optional internal push/PR bridge, but that does not change the main public v1 contract or make container-side PR creation part of the baseline workflow.

### macOS helper constraint
Do not design around any always-on helper app, LaunchAgent, autoloaded node wrapper, or similar background Mac resident process.

## Main public v1 slice

The main public v1 slice should deliver:
- the skill directory and `SKILL.md`
- the canonical confirmed plan format document
- the minimal execute-surface document for bounded runtime wiring
- the minimal supporting plugin package for execute
- the bounded branch and commit scripts
- enough docs to explain trust boundaries and execution rules
- immediate verification of the plugin package through install plus build/test gates

For the plugin package, the expected first verification flow is:
1. `pnpm install`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm build`
5. `pnpm test`

This verification flow has already been exercised successfully for the current standalone plugin package.
Do not leave a new plugin package unverified when these commands are part of the package contract.

It should not yet try to solve:
- push in the execute workflow
- PR creation
- generic git command execution
- always-on host services

## Fixed v1 execution decisions

- `выполни git-группы с ветками` must not push
- execution model for v1 is `plan -> confirm -> execute`
- the public v1 baseline executes through bounded local branch + commit helpers in the target repo
- do not implement one-shot execute in the main public v1 slice
- push stays outside the main public v1 workflow surface
- PR stays outside the main public v1 workflow surface
- any working push/PR seam belongs to the separate optional internal host-backed bridge track, which already exists as a bounded package/skill/tool path and is validated on the host-backed path

## Fixed product decisions after specification review

### Plugin need
- plan-only workflow may work without a plugin
- execute flow requires a minimal plugin/tool layer
- the current engineering next step for the separate internal bridge is to decide whether any honest current-surface exposure/install step remains, or whether the remaining gap should be frozen as an upstream/runtime limitation, not to change the public v1 branch+commit contract
- the plugin should exist only as a tool/runtime carrier, not as a command-entry surface
- for this standalone repo shape, the plugin package should remain standalone-compatible rather than assuming OpenClaw monorepo `workspace:*` dependency resolution

### Confirmed plan requirement
- execute must require a confirmed internal plan format
- do not run execute directly from free-form user text
- the planning step must produce enough structured data for later bounded execution

### Script shape
- prefer several narrow scripts over one large dispatcher script
- keep each script aligned with one bounded operation or one tightly-scoped phase
- do not recreate a broad command router inside shell scripts
