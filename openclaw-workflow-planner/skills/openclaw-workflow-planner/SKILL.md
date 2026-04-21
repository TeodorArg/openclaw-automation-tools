---
name: openclaw-workflow-planner
description: Use when the user needs to create an idea, attach typed research, pass Idea Gate, prepare lane-1 design, create or refresh an accepted plan in WORKFLOW_PLAN.md, track tasks, and prepare a bounded implementation handoff.
user-invocable: true
command-dispatch: tool
command-tool: workflow_planner_action
command-arg-mode: raw
---

# OpenClaw Workflow Planner

This skill provides a planning-first orchestration layer over `workflow_planner_action`, and a fresh current-slice `ExecutionBrief` selected by the current execution-brief pointer can move the active request runtime from `planning` to `execution` for the current slice while `WORKFLOW_PLAN.md` remains the single persisted state surface.

Control-plane request, entity, and pointer metadata is rebuilt from persisted idea state; persisted `executionBriefs` are canonical, and `currentBriefBySlice` is a derived summary plus legacy-hydration compatibility field. Do not imply separate persisted plan, task, or brief files outside `WORKFLOW_PLAN.md`.
Logical `artifactRefs`, `governingArtifactRefs`, and pointer `targetArtifactRef` paths describe package-local provenance/materialization targets inside the single planner bundle; they do not imply extra persisted planner files in the shipped surface.
Legacy planner files may surface `migrationState` in derived control-plane runtime: `legacy_hydrated` means read-old/write-new normalization is active, while `migration_required` means ambiguous legacy brief state still needs operator review or a canonical save path.
When legacy brief state is ambiguous, the current execution-brief pointer stays explicitly unresolved instead of being synthesized as resolved, and execution-state task progress must not continue until canonical brief truth exists.

## Когда использовать

- есть новая идея для plugin / tool / skill / workflow surface
- нужно понять `делать / не делать / отложить / доресерчить`
- нужен структурированный plan/TODO вместо свободного обсуждения
- нужен bounded handoff для следующего implementation slice

## Core Flow

1. Create or update the idea with `idea_create`.
2. Attach typed research with `research_attach`.
3. Run `idea_gate`.
4. If the decision is `accepted`, run `design_prepare` before planning.
5. Use `design_get` when you need to inspect or reuse the current lane-1 design.
6. Run `plan_create` after lane-1 design is prepared.
7. If the decision is `needs_research`, attach more research before gating again.
8. If an accepted plan already exists and changes materially, use `plan_refresh`.
9. Inspect the current state with `idea_get`, `idea_list`, or `plan_snapshot`.
10. For manual plan tracking, use `task_add`, prefer `task_done` and `task_remove` by stable `taskId`, and use `task_reopen` to intentionally reopen work without relying on task text matching.
11. When a bounded slice starts, run `implementation_brief` to get a derived handoff payload with structured open tasks for that slice, including stable `taskId`, legacy-friendly `taskIndex`, a command-ready selector hint, and remaining-open-task guidance. The action persists a fresh current-slice `ExecutionBrief`, updates the current execution-brief pointer, and updates `currentBriefBySlice` as a summary view without creating a separate brief file. Rerunning `implementation_brief` for the same slice keeps earlier `executionBriefs` as superseded persisted history while retargeting the current pointer and summary view to the newest fresh brief. Any later `plan_refresh`, `task_add`, `task_done`, `task_remove`, or `task_reopen` stales that fresh brief, so rerun `implementation_brief` before the next `task_done` or `task_reopen`. Successful task actions, including `task_add`, `task_done`, `task_remove`, and `task_reopen`, now echo the same remaining-open-task guidance for immediate follow-through.
12. Run `idea_close` only after the idea is accepted, has a canonical plan, all tracked tasks are done, and you can record the delivered outcome in the close note.

`currentSliceId` is the stable slice identity. `currentSlice` is a mutable label, so `plan_refresh` may rename the visible slice title while brief lineage and current-pointer continuity stay attached to the same `currentSliceId`.

## Skill Routing

- `openclaw-workflow-planner`: all actions
- `openclaw-workflow-research`: `idea_list`, `idea_get`, `research_attach`, `idea_gate`, `plan_snapshot`
- `openclaw-workflow-implementer`: `idea_list`, `idea_get`, `plan_snapshot`, `task_add`, `task_done`, `task_remove`, `task_reopen`, `implementation_brief`, `idea_close`

## Boundary

- This package does not ship local Codex `.codex/subagents/**` as runtime agents.
- Bundled skills here are instruction layers, not proof that a separate runtime agent system already exists.
- If executable automation is not implemented, do not imply that it exists.
- `WORKFLOW_PLAN.md` is the persisted state boundary; do not describe derived briefs or synthetic artifact records as separate persisted files.
- planner-file writes are guarded against stale concurrent overwrite; keep the behavior fail-fast rather than adding automatic retry/backoff, because conflicting saves usually need a fresh reload of current state before retrying intentionally
- if `idea_create` materially retargets an already-researched or already-planned idea, expect the downstream lifecycle state to reset back to `draft`
- if `idea_create` updates an existing idea without a `links` field, preserve the existing links
- `plan_refresh` preserves extra manual tasks while dropping stale unmatched generated tasks
- keep planner use visibly alive during long research, planning, or subagent-backed execution: stay quiet only for short work, then send short progress updates when work runs past about 60 to 90 seconds, on blockers, when the active lane changes, and also periodically during ongoing active work so chat silence does not become ambiguous
- when the user asks for status during active work, treat it as observational by default: answer briefly, then continue the already-obvious next step unless the user explicitly changes direction
- when one bounded slice lands and the next obvious step is canon sync or another narrow slice, do not stop idly; explicitly announce that work has resumed, then continue automatically
