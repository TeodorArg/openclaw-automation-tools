# Skill Specification

## Purpose

The main workflow skill should implement a bounded git workflow, not generic git command passthrough.

## Supported user intents

The workflow supports exactly these intents:

1. `разложи по git-группам`
2. `разложи по git-группам с ветками`
3. `выполни git-группы с ветками`

## Required behavior

### `разложи по git-группам`
Plan only:
- inspect repo state
- group changed files
- propose canonical commits
- do not create branches
- do not create commits
- do not push

### `разложи по git-группам с ветками`
Plan only, branch-aware:
- do all planning work
- propose branch names
- emit exact later commands or actions
- emit a ready-to-confirm structured plan
- do not execute writes

### `выполни git-группы с ветками`
Execute only from a confirmed plan:
- require a confirmed structured payload
- create the planned branches
- stage the planned file groups
- create the planned commits
- do not push
- do not open PRs

## What the workflow must preserve

The workflow must preserve:
- branch naming rules
- canonical commit title/body rules
- the separation between plan and execute
- the rule that push and PR stay outside the main contract

## Architecture intent

Preferred architecture:
- user-invocable skill
- deterministic tool dispatch
- bounded runtime actions
- no arbitrary shell proxy

## Non-goals

The main workflow should not include:
- arbitrary `git <anything>` execution
- arbitrary shell execution
- push inside execute
- PR creation
- force-push or destructive recovery flows
- designs that depend on always-on helper processes

## Security constraints

The implementation must:
- validate branch names
- validate confirmed-plan structure
- keep bounded actions explicit
- avoid generic shell passthrough

## Retained separate bridge

The separate `plugin-host-git-push/` subtree may provide the host-backed finish path for push and PR, but it stays outside the main workflow contract.
