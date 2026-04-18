---
name: session-bloat-warning
description: Use when OpenClaw sessions repeatedly hit compaction and the user needs calm, actionable warning copy instead of pushing another heavy phase into the same thread.
user-invocable: true
---

# Session Bloat Warning

Use this bundled skill when the current risk is session overload around
compaction, not canon drift, planning state, or host execution.

## Current shipped scope

- official compaction lifecycle coverage through `before_compaction`
  and `after_compaction`
- calm user-facing warning copy in English or Russian
- per-session dedupe in plugin-owned state keyed by `sessionKey`

## Current boundary

- no early pre-compaction overload detector before the official compaction path
- no bounded handoff summary generation
- no autonomous fresh-session transfer
- no automatic per-session language detection; language is selected by package
  config

## Output bar

Warning copy should stay:

- short
- calm
- actionable
- free of token-percent theater
