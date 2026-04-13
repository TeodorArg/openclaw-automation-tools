# Skill Specification

## Purpose

The new skill must implement the operator's real git workflow rather than exposing low-level generic git commands.

## User-facing workflow

The skill should support these workflow intents:

1. `разложи по git-группам`
2. `разложи по git-группам с ветками`
3. `выполни git-группы с ветками`

## Required behavior

### 1. `разложи по git-группам`

Plan only.

The skill should:
- inspect the repo state and changed files
- group changes into logical git groups
- propose commit boundaries
- propose commit titles and bodies using the canonical repo guidance
- not create branches
- not create commits
- not push

### 2. `разложи по git-группам с ветками`

Plan only, but branch-aware.

The skill should:
- do everything from the plan-only mode
- additionally propose branch names using canonical branch naming rules
- provide exact command sequences for later execution
- still not execute branch creation, commit, push, or PR creation

### 3. `выполни git-группы с ветками`

Execution mode.

The skill should:
- use the already-prepared git grouping logic
- run only after an explicit confirmation step
- execute against a confirmed internal plan format
- create the planned branches
- stage the intended file groups
- create commits using the canonical commit format
- not push in v1
- never treat PR creation into `main` as implicit

## What the skill must know

The skill must encode and/or read:
- the canonical branch naming format
- the canonical commit title and body format
- the rule that PR creation into `main` is a separate explicit step
- the distinction between plan-only and execute modes
- the distinction between validated, transitional, and blocked runtime paths in this setup

## Architectural intent

The preferred architecture is:
- user-invocable skill command(s)
- skill command dispatches into tool execution when deterministic behavior is needed
- tool execution routes into bounded git runtime actions
- no arbitrary shell proxy exposed to user input

This follows OpenClaw docs that allow skills to be user-invocable slash commands and optionally declare `command-dispatch: tool`, which routes the slash command directly into the tool pipeline.

## Non-goals for v1

The first version should not include:
- arbitrary `git <anything>` execution
- arbitrary shell execution
- push inside `выполни git-группы с ветками`
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
- this repo's Docker split-layer reality
- SSH-agent forwarding constraints
- the existing validated operator-side push path

## Fixed v1 execution decisions

- `выполни git-группы с ветками` does not include push
- canonical execution backend for v1 is `openclaw-git` only
- execution model for v1 is `plan -> confirm -> execute`
- one-shot execute is out of scope for v1
- push is a separate later step
- PR creation is an even later separate step

## Fixed product decisions after specification review

- plan-only workflow may work without a plugin
- execute is expected to use a minimal plugin/tool layer
- execute must depend on a confirmed internal plan format
- execute must not be reconstructed from free-form user text alone
- prefer several narrow scripts over one large dispatcher script
