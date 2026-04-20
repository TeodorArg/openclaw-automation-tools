---
name: openclaw-url-tailwind-scaffold-orchestrator
description: Use when the user wants a top-layer workflow over `url_tailwind_scaffold_action` that reads `page_contract.islands[]`, fans out bounded island analysis tasks, and aggregates md/json artifacts without moving orchestration into the plugin.
user-invocable: true
---

# OpenClaw URL Tailwind Scaffold Orchestrator

This skill is an orchestration layer above `url_tailwind_scaffold_action`.

It does not turn the plugin into an orchestrator. The plugin still extracts and normalizes. This skill teaches the top-level agent how to use the plugin output, when to fan out work, and how to aggregate artifact files when the host runtime exposes session and file tools.

## When To Use

- the user wants more than a bounded summary or raw `page_contract`
- the user wants per-island follow-up analysis
- the user wants `md/json` artifacts collected from one reference URL
- the host runtime exposes session tools such as `sessions_spawn` and `subagents`

## Guardrails

- treat this skill as instruction, not as the orchestration runtime itself
- let session tools handle subagent spawning and coordination
- do not claim the plugin itself spawns, manages, or persists subagents
- do not claim nested fan-out unless the runtime actually supports the required spawn depth
- keep Tailwind output as synthesized token and utility candidates, not donor CSS clones
- if file tools are unavailable, return the same artifact payloads inline instead of pretending files were written

## Core Flow

1. Call `url_tailwind_scaffold_action` with `outputMode: "page_contract"`.
2. Read `page_contract.source`, `page_contract.page`, `page_contract.islands`, and `page_contract.tokens`.
3. Build one top-level orchestration note that records:
   - source URL and final URL
   - acquisition mode and fetch status
   - which shell islands were source-backed
   - which islands remained inferred
4. Decide whether fan-out is justified.
   - If there are zero or one useful islands, stay single-lane.
   - If there are multiple useful islands and session tools are available, fan out one bounded task per island.
5. For each spawned island lane, assign ownership of exactly one island and ask for:
   - purpose of the island
   - structure and key nodes
   - selectors and anchors
   - token refs already present in `page_contract`
   - refined Tailwind utility candidates for that island only
   - ambiguities and confidence notes
6. Aggregate the returned island analyses back into page-level artifacts.
7. If file writing is available, persist the artifact tree described in `ARTIFACT_CONTRACT.md`.
8. If file writing is unavailable, return the same artifacts inline with stable headings and fenced JSON blocks.

## Fan-Out Policy

- prefer one island per subagent lane
- keep island ownership disjoint
- do not ask two lanes to rewrite the same artifact file
- the parent lane keeps ownership of:
  - `page-summary.md`
  - `page-contract.json`
  - `tailwind/tokens.json`
  - `tailwind/components.json`
  - `tailwind/scaffold-plan.md`
- each worker lane may own exactly one:
  - `islands/<island-id>.md`

## Worker Prompt Shape

Use a bounded prompt per island:

```text
Analyze one island from page_contract.
Owned island: <island-id>
Do not widen into other islands.
Return:
- purpose
- selectors and anchors
- key nodes
- Tailwind token refs already present
- refined utility candidates for this island only
- ambiguities and confidence
```

## Artifact Contract

Use the packaged artifact contract in [ARTIFACT_CONTRACT.md](./ARTIFACT_CONTRACT.md).

Minimum outputs:

- `page-summary.md`
- `page-contract.json`
- `islands/<island-id>.md`
- `tailwind/tokens.json`
- `tailwind/components.json`
- `tailwind/scaffold-plan.md`

## Runtime Limits

- if `sessions_spawn` or `subagents` are unavailable, keep the orchestration single-lane
- if spawn depth is limited, do not imply nested subagent trees
- if the runtime does not expose writable files, keep artifacts inline
- if the plugin returned only inferred islands, do not pretend the downstream island analysis is source-backed
