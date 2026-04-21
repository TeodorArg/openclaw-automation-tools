---
name: openclaw-workflow-implementer
description: Use when lane-1 design and an accepted plan already live in WORKFLOW_PLAN.md, and the current slice needs a narrow implementation handoff rather than a new whole-project plan.
user-invocable: true
command-dispatch: tool
command-tool: workflow_planner_action
command-arg-mode: raw
---

# OpenClaw Workflow Implementer

This skill operates once lane-1 design and an accepted plan exist in `WORKFLOW_PLAN.md`, and the active request may already be in `execution` when a fresh current-slice `ExecutionBrief` marks the current slice as underway; stale brief summaries do not.

## Focus

- use the accepted plan persisted in `WORKFLOW_PLAN.md`
- inspect current state through `idea_get` or `plan_snapshot`
- choose the current slice
- update task tracking through `task_add` / `task_done` / `task_remove` / `task_reopen` when needed
- request `implementation_brief` as a derived handoff payload with structured open-task details for the current slice, including stable `taskId`, legacy-friendly `taskIndex`, a command-ready selector hint, and remaining-open-task guidance; `implementation_brief` persists a fresh current-slice `ExecutionBrief`, updates the current execution-brief pointer, and updates `currentBriefBySlice` as a summary view without creating a separate brief file; rerunning it for the same slice keeps older `executionBriefs` as superseded persisted history while retargeting the current pointer and summary view to the newest fresh brief; any later `plan_refresh`, `task_add`, `task_done`, `task_remove`, or `task_reopen` stales that brief, so rerun `implementation_brief` before the next `task_done` or `task_reopen`; successful task actions, including `task_add`, `task_done`, `task_remove`, and `task_reopen`, now also echo the remaining-open-task guidance for immediate next-step use
- finish the slice, then close the idea with `idea_close` only when the accepted plan is complete, all tracked tasks are done, and you can record the delivered outcome clearly
- execute one reviewable intent at a time

## Rules

- do not widen the slice without cause
- do not mix planning, docs cleanup, and runtime implementation unless the slice requires it
- do not describe local governance surfaces as shipped runtime behavior
- treat `WORKFLOW_PLAN.md` as the only persisted state file; `implementation_brief` persists the canonical current-slice brief in `executionBriefs`, updates the current execution-brief pointer, and also updates `currentBriefBySlice` as a summary view, but does not create a separate brief file
- treat `WORKFLOW_PLAN.md` as the only persisted state file; logical `artifactRefs`, `governingArtifactRefs`, and pointer `targetArtifactRef` paths are provenance/materialization targets inside that single planner bundle, not extra persisted planner files
- planner-file writes are guarded against stale concurrent overwrite; keep lock/contention handling fail-fast, and if the file changed underneath you, reload current state before retrying instead of forcing a stale write
- prefer `task_done`, `task_remove`, and `task_reopen` by stable `taskId`; `taskIndex` is legacy compatibility only
- if execution, verification, or subagent help runs long enough to be noticeable, keep visible progress updates short and alive instead of going silent; report blockers immediately and say what is already confirmed plus the next active step
- during ongoing active work, send short periodic chat updates before silence becomes ambiguous even if there is no blocker or lane change yet
- when the user asks for status during active work, answer briefly but do not let the status reply replace the already-obvious next action unless the user explicitly changes direction
- when a slice lands and the next narrow step is obvious, do not pause idly between slices; explicitly say that work continued, then do the canon sync and launch the next bounded slice automatically unless blocked
