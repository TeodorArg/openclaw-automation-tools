# @openclaw/openclaw-workflow-planner

The execution layer between prompt and delivery.

`@openclaw/openclaw-workflow-planner` turns vague work into an executable OpenClaw workflow with explicit decisions, lane-1 design, structured plans, tracked tasks, and a clean implementation handoff. It is built for work that matters enough to need continuity, clarity, and a real path from idea to finished outcome.

This is not just another planner or task list. It is the control layer that keeps long-running AI-assisted work from dissolving into chat history, scratch notes, and half-remembered decisions. Create an idea, attach research, run an Idea Gate, prepare lane-1 design, generate a structured plan, preserve manual task edits safely, hand off an implementation brief, and close the slice with an explicit outcome.

The package exists for work that is too important, too multi-step, or too easy to lose in conversation. It persists one readable planner file and rebuilds structured state from that source of truth, so planning stays inspectable for humans, durable across sessions, and usable by runtime tools without turning execution state into opaque hidden metadata.

Once an idea is accepted, the planner keeps plan state, task state, and current implementation brief state coherent enough that a session, helper skill, or follow-on operator can continue without guessing what is approved, what is open, or what done should mean. That makes it a practical execution backbone for serious OpenClaw delivery, not just a drafting surface.

## Why install this

- Turn ambiguous requests into structured execution with gates, design, plans, tasks, and handoff.
- Keep research, decisions, task tracking, and implementation context coherent across sessions.
- Reduce drift in long-running AI-assisted work where approved scope is easy to lose.
- Make multi-phase delivery easier to resume, review, delegate, and close cleanly.
- Give OpenClaw a durable execution backbone instead of relying on chat memory alone.

## Common use cases

- Turn a rough initiative into a gated workflow with a real accepted plan.
- Convert research into lane-1 design and an implementation path the next execution slice can actually use.
- Track execution tasks while preserving stable task identity across plan updates.
- Generate an implementation brief for a helper skill, subagent lane, or follow-on session.
- Keep long-running delivery aligned across sessions and contributors without losing context.
- Close a shipped slice with an explicit outcome instead of leaving execution state ambiguous.

## One-line example request

`Take this vague request and turn it into an executable workflow with a real handoff to implementation.`

## Bundled Skills

- `openclaw-workflow-planner`: main orchestration skill
- `openclaw-workflow-research`: research-oriented supporting skill
- `openclaw-workflow-implementer`: implementation-handoff supporting skill

These skills are bundled instruction layers. The executable runtime surface is
the typed tool `workflow_planner_action`.

## Tool Actions

- `idea_create`
- `research_attach`
- `idea_gate`
- `design_prepare`
- `design_get`
- `plan_create`
- `plan_refresh`
- `idea_list`
- `idea_get`
- `plan_snapshot`
- `task_add`
- `task_done`
- `task_remove`
- `task_reopen`
- `implementation_brief`
- `idea_close`

## Skill Action Matrix

- `openclaw-workflow-planner`: all actions
- `openclaw-workflow-research`: `idea_list`, `idea_get`, `research_attach`, `idea_gate`, `plan_snapshot`
- `openclaw-workflow-implementer`: `idea_list`, `idea_get`, `plan_snapshot`, `task_add`, `task_done`, `task_remove`, `task_reopen`, `implementation_brief`, `idea_close`

## Planner File

- Default path: `./WORKFLOW_PLAN.md`
- Override via plugin config `plannerFilePath`
- The markdown file is human-readable and intended to stay inspectable in git
- `WORKFLOW_PLAN.md` is the only persisted workflow-planner state file
- planner ideas are stored as explicit lifecycle records with typed research, idea-gate, lane-1 design, accepted-plan, task, and close-note sections
- control-plane request, entity, and pointer metadata is rebuilt from persisted ideas rather than written as separate files
- artifact refs, `governingArtifactRefs`, and pointer `targetArtifactRef` paths are logical provenance/materialization targets inside the single planner bundle, not separate persisted planner files in the shipped surface
- legacy planner files now surface operator-visible migration state in derived control-plane runtime: safe read-only normalization reports `legacy_hydrated`, while ambiguous legacy brief summaries report `migration_required` with active blockers until a canonical save/operator review resolves them
- ambiguous legacy brief summaries no longer synthesize a resolved current execution-brief pointer for the current slice; they now surface an explicit unresolved pointer and block execution-state task progress until the brief state is made canonical
- `implementation_brief` returns a derived handoff payload, including structured open tasks for the current slice with stable `taskId`, legacy-friendly 1-based `taskIndex`, a command-ready selector hint, and explicit remaining-open-task guidance; it now persists a fresh current-slice `ExecutionBrief` record in planner state, updates the current execution-brief pointer, and updates `currentBriefBySlice` as a summary view without materializing a separate brief file
- rerunning `implementation_brief` for the same slice keeps prior `executionBriefs` as superseded persisted history while retargeting the current execution-brief pointer and summary view to the newest fresh brief
- `currentSliceId` is the durable slice identity; `currentSlice` is a mutable display label, so `plan_refresh` may rename the displayed slice while brief identity and current-pointer continuity stay bound to the same `currentSliceId`
- writes use lock-and-compare protection so stale concurrent mutations do not blindly overwrite newer planner state
- active lock contention returns a clean planner concurrency error instead of leaking a raw filesystem `EEXIST`
- lock contention is expected to be brief, and the plugin intentionally does not auto-retry stale saves; reload current `WORKFLOW_PLAN.md` state before retrying a conflicting action
- the same fail-fast rule applies to overlapping action writes such as `implementation_brief` racing task or plan mutations; one write wins, and the stale writer must reload before retrying
- `plan_refresh` updates canonical plan blocks while preserving extra manual tasks and dropping stale unmatched generated tasks
- `idea_create` preserves existing links when `links` is omitted on update
- `task_done`, `task_remove`, and `task_reopen` prefer stable `taskId`; legacy 1-based `taskIndex` is still supported for older/manual flows
- `implementation_brief` exposes both selectors plus a command-ready selector hint and remaining-open-task guidance for easier handoff consumption, persists a fresh current-slice `ExecutionBrief`, updates the current execution-brief pointer, and updates `currentBriefBySlice` as a summary view
- successful task-action responses, including `task_add`, return the resolved stable id, resolved 1-based index, shared `targetTask*` context, command-ready `*SelectorHint` fields, and remaining-open-task guidance for immediate next-step follow-through
- checklist synchronization during `task_done`, `task_remove`, `task_reopen`, and `plan_refresh` follows stable task ids rather than matching on task text

## Shipped Flow

- `idea_create` -> `research_attach` -> `idea_gate` -> `design_prepare` -> `plan_create`
- `accepted` -> `design_get` to inspect the current lane-1 design -> optional `plan_refresh`
- `needs_research` -> more `research_attach`
- `deferred` / `rejected` -> stop or narrow scope
- after plan creation: `task_add` / `task_remove` can refine tracked work, then `implementation_brief` is required before `task_done` or `task_reopen` continue execution-state progress for the current slice. Any `plan_refresh`, `task_add`, `task_done`, `task_remove`, or `task_reopen` marks the current fresh brief stale, so rerun `implementation_brief` before the next `task_done` or `task_reopen`. Only a fresh current-slice brief moves control-plane phase to `execution`; stale brief summaries leave the request in `planning`. `idea_close` is valid only once a current accepted plan exists, all tracked tasks are done, and the close note records the delivered outcome

## End-to-End Example

1. Run `idea_create`, `research_attach`, `idea_gate`, and `design_prepare` to establish the accepted request, typed research, and lane-1 design.
2. Run `plan_create`, then inspect the accepted plan with `plan_snapshot` or `idea_get`.
3. Run `implementation_brief` before execution-state task progress begins for the current slice.
4. Use `task_done` to complete tracked work and `task_add` or `task_remove` only when the accepted slice genuinely changes.
5. If `task_add`, `task_done`, `task_remove`, `task_reopen`, or `plan_refresh` runs, regenerate the handoff with `implementation_brief` before the next execution-state task step.
6. When all tracked tasks are done, run `idea_close` with the delivered outcome recorded in the close note.

Example path:

```text
idea_create
-> research_attach
-> idea_gate (accepted)
-> design_prepare
-> plan_create
-> implementation_brief
-> task_done
-> implementation_brief
-> task_done
-> idea_close
```

If `idea_create` materially changes the core request after downstream work already
exists, the plugin resets research, idea-gate, plan, and tasks back to `draft`
so the planner state stays coherent.

## Current Boundary

This package currently focuses on planning, bounded handoff, and execution-state transition for the current slice.

Follow-up lanes may add stronger template export, richer plan lifecycle
closure rules, and broader executable workflow chaining beyond the current brief-driven execution transition. Current work in this surface is limited to bounded persisted-shape polish such as migration truth, pointer truth, and logical artifact/provenance coherence, not to new runtime features. This package already models the core
user-visible planner flow instead of only draft generation.

When the planner is used to drive longer research, implementation, or
subagent-backed lanes, operators should preserve visible progress behavior:
stay quiet for short work, then send brief progress updates once the wait is
noticeable, on blockers, when the active lane changes, and periodically during
ongoing active work so the chat does not go ambiguous.

If the user asks for status during active work, treat that as observational by
default: answer briefly, then continue the already-obvious next action unless
the user explicitly changes priority or asks to pause.

When a bounded slice lands and the next obvious step is follow-through or the
next narrow slice, operators should not idle between slices: explicitly mark
that work resumed, then continue through canon sync and the next bounded step
unless a real blocker requires a pause.

## Install

```bash
openclaw plugins install clawhub:@openclaw/openclaw-workflow-planner
```

Local development:

```bash
nvm use || nvm install
cd openclaw-workflow-planner
pnpm install
pnpm build
cd ..
openclaw plugins install -l ./openclaw-workflow-planner
```

## Verify

```bash
cd openclaw-workflow-planner
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

If `pnpm test` fails at startup with `Cannot find native binding` from
`rolldown`, treat it as an install/environment mismatch rather than a
planner-logic failure. The first remediation path is:

```bash
rm -rf node_modules
pnpm install
pnpm test
```

In this environment, reinstall on the target platform remediated the binding
issue and exposed real repo-level verification results instead of an
environment-only startup failure.
