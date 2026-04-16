# Skill Specification

## Purpose

The main workflow skill should implement a bounded git workflow, not generic git command passthrough.

## Supported user intents

The operator-facing workflow supports exactly these canonical intents:

1. `send_to_git`
2. `open_pr`

Human wording is not the canon.
The same intent may arrive through RU, EN, or future localized utterances.
Examples:
- `отправь в гит`
- `запушь`
- `отправь изменения`
- `send to git`
- `push it`
- `ship to git`
- `сделай PR`
- `make a PR`
- `open a PR`

## Required behavior

### `send_to_git`
Operator-facing send flow:
- inspect repo state
- group changed files
- propose canonical branches and commits
- preserve the internal `plan -> confirm -> execute` contract
- execute bounded branch + commit steps only from a confirmed structured payload
- keep push as a separate optional host-backed bridge step, not part of the main public branch + commit baseline

### `open_pr`
Operator-facing PR flow:
- run PR readiness checks through the separate bounded bridge
- open the current branch into `main`
- keep base/head behavior bounded and explicit
- do not widen into arbitrary `gh` passthrough

## What the workflow must preserve

The workflow must preserve:
- canonical intent ids, independent of user language
- branch naming rules
- canonical commit title/body rules
- the separation between plan and execute inside runtime execution
- the boundary between the main branch + commit package and the retained push/PR bridge

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
- force-push or destructive recovery flows
- arbitrary PR base/head overrides
- designs that depend on always-on helper processes

## Security constraints

The implementation must:
- validate branch names
- validate confirmed-plan structure
- keep bounded actions explicit
- avoid generic shell passthrough

## Retained separate bridge

The separate `plugin-host-git-push/` subtree provides the bounded host-backed finish path for push and PR. It stays separate at the package/runtime level even when the operator sees only the higher-level `send_to_git` and `open_pr` intents.
Current status is explicit:
- validated public baseline: branch + commit flow
- validated optional bridge: host-backed push/PR lane
- non-baseline on the current runtime surface: direct container/slash finish path
