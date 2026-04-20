---
name: openclaw-workflow-implementer
description: Use when Idea Gate is already passed, the accepted plan lives in WORKFLOW_PLAN.md, and the current slice needs a narrow implementation handoff rather than a new whole-project plan.
---

# OpenClaw Workflow Implementer

This skill operates after the planning phase once an accepted plan exists in
`WORKFLOW_PLAN.md`.

## Focus

- use the accepted plan persisted in `WORKFLOW_PLAN.md`
- inspect current state through `idea_get` or `plan_snapshot`
- choose the current slice
- update task tracking through `task_add` / `task_done` / `task_remove` / `task_reopen` when needed
- request `implementation_brief` as a derived handoff payload with structured open-task details for the current slice, including stable `taskId`, legacy-friendly `taskIndex`, a command-ready selector hint, and remaining-open-task guidance; successful `task_done`, `task_remove`, and `task_reopen` responses now also echo the remaining-open-task guidance for immediate next-step use
- finish the slice, then close the idea with `idea_close` only when the accepted plan is complete, all tracked tasks are done, and you can record the delivered outcome clearly
- execute one reviewable intent at a time

## Rules

- do not widen the slice without cause
- do not mix planning, docs cleanup, and runtime implementation unless the slice requires it
- do not describe local governance surfaces as shipped runtime behavior
- treat `WORKFLOW_PLAN.md` as the only persisted state file; `implementation_brief` does not create a separate persisted brief file
- planner-file writes are guarded against stale concurrent overwrite; keep lock/contention handling fail-fast, and if the file changed underneath you, reload current state before retrying instead of forcing a stale write
- prefer `task_done`, `task_remove`, and `task_reopen` by stable `taskId`; `taskIndex` is legacy compatibility only
- if execution, verification, or subagent help runs long enough to be noticeable, keep visible progress updates short and alive instead of going silent; report blockers immediately and say what is already confirmed plus the next active step
- during ongoing active work, send short periodic chat updates before silence becomes ambiguous even if there is no blocker or lane change yet
- when the user asks for status during active work, answer briefly but do not let the status reply replace the already-obvious next action unless the user explicitly changes direction
- when a slice lands and the next narrow step is obvious, do not pause idly between slices; explicitly say that work continued, then do the canon sync and launch the next bounded slice automatically unless blocked
