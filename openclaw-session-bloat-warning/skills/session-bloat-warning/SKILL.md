---
name: session-bloat-warning
description: Use when OpenClaw sessions repeatedly hit compaction and the user needs calm, actionable warning copy instead of pushing another heavy phase into the same thread.
user-invocable: true
---

# Session Bloat Warning

Use this bundled skill when the risk is session overload around
compaction, not canon drift, planning state, or host execution.

## Supported scope

- compaction lifecycle coverage through `before_compaction`
  and `after_compaction`
- observe-only runtime signal capture on `llm_input` and `llm_output`
- visible early warning on `before_agent_reply` as a synthetic reply
- calm user-facing warning copy in English or Russian
- per-session dedupe and cooldown state keyed by `sessionKey`

## Boundaries

- no early-warning delivery on the prompt-mutation path
- no bounded handoff summary generation
- no autonomous fresh-session transfer
- no automatic per-session language detection; language is selected by package
  config
- no broader repeated tool failure, edit-loop, or timeout-risk heuristics

## Output bar

Warning copy should stay:

- short
- calm
- actionable
- free of token-percent theater
