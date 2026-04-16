# Skill Specification

## Purpose

The workflow must implement a real operator-facing git workflow rather than exposing low-level generic git commands.

## Canon split

Keep two layers explicit and do not blur them:

1. Product-language workflow phrases
2. Shipped runtime intent ids and aliases

Current shipped runtime canon:
- canonical intent id: `send_to_git`
- current recognized aliases in code: `send_to_git`, `отправь в гит`, `отправь изменения`, `разложи по git-группам`, `разложи по git-группам с ветками`, `выполни git-группы с ветками`, `send to git`

Product-language workflow phrases still describe the intended user journey, but for the current implementation those RU phrases are also part of the shipped alias layer rather than being spec-only wording.

## Required behavior

### Planning-only behavior

The workflow should be able to:
- inspect the repo state and changed files
- group changes into logical git groups
- propose commit boundaries
- propose commit titles and bodies using canonical repo guidance
- avoid creating branches or commits in pure planning mode
- avoid push

### Branch-aware planning behavior

The workflow should also support a branch-aware planning mode that:
- does everything from planning mode
- proposes canonical branch names
- provides exact command sequences for later execution
- emits a ready-to-confirm structured payload for execute
- still does not execute branch creation, commit, push, or PR creation

### Execution behavior

Execution mode should:
- run only after an explicit confirmation step
- execute against a confirmed internal plan format
- create the planned branches
- stage the intended file groups
- create commits using the canonical commit format
- not push in v1
- never treat PR creation into `main` as implicit

## What the workflow must know

The workflow must encode and/or read:
- the canonical branch naming format
- the canonical commit title and body format
- the rule that PR creation into `main` is a separate explicit step
- the distinction between plan-only and execute modes
- the distinction between planning-only and execute-capable runtime paths

## Architectural intent

The preferred architecture is:
- user-facing workflow language or aliases
- deterministic intent normalization into a stable runtime intent id
- tool execution for deterministic behavior
- bounded git runtime actions only
- no arbitrary shell proxy exposed to user input

This follows OpenClaw docs that allow skills to be user-invocable slash commands and optionally declare `command-dispatch: tool`, which routes the slash command directly into the tool pipeline.

## Non-goals for v1

The first version should not include:
- arbitrary `git <anything>` execution
- arbitrary shell execution
- push inside bounded execute
- force push
- rebase flows
- reset or destructive recovery flows
- branch deletion
- PR creation via `gh`
- any design that depends on an always-on macOS helper app/node in autoload/bin style

## Security constraints

The implementation must:
- validate branch names and commit inputs
- keep bounded actions explicit
- avoid generic shell passthrough
- keep SSH-agent and Docker trust boundaries explicit
- avoid hidden background helper processes on the Mac

## External references to respect

The implementation should stay aligned with:
- OpenClaw skills docs
- OpenClaw slash-commands docs
- the active target repo path at runtime
- OpenClaw plugin install behavior for local path installs

## Fixed v1 execution decisions

- bounded execute does not include push
- execution model for v1 is `plan -> confirm -> execute`
- the current first slice uses bounded local branch + commit helpers inside the target repo
- runtime should target `OPENCLAW_GIT_WORKFLOW_REPO`, then `OPENCLAW_PROJECT_DIR`, then `/home/node/project`
- one-shot execute from free-form prose is out of scope for v1
- push is a separate later step
- PR creation is an even later separate step

## Fixed product decisions after specification review

- plan-only workflow may work without a plugin
- execute is expected to use a minimal plugin/tool layer
- execute must depend on a confirmed internal plan format
- execute must not be reconstructed from free-form user text alone
- prefer several narrow scripts over one large dispatcher script

## Current implementation layer now in repo

The current implementation layer includes:
- `openclaw-git-workflow/skills/openclaw-git-workflow/SKILL.md`
- `docs/CONFIRMED_PLAN_FORMAT.md`
- `openclaw-git-workflow/EXECUTE_SURFACE.md`
- the standalone plugin package under `openclaw-git-workflow/`
- bounded branch/commit helper scripts under `openclaw-git-workflow/scripts/`

These files define the bounded UX and runtime contract for planning plus confirmed branch/commit execution.
The current published plugin artifact ships the bundled skill, but not the repo-local shell helpers.
