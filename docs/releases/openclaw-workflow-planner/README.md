# openclaw-workflow-planner releases

No tracked public release records are stored here yet.

Current shipped surface to reflect in release records:

- file-backed planner state persisted only in `WORKFLOW_PLAN.md`
- control-plane request, entity, and pointer metadata rebuilt from that state, without separate persisted plan, task, or brief files
- action flow includes `idea_create`, `research_attach`, `idea_gate`, `plan_create`, `plan_refresh`, `idea_list`, `idea_get`, `plan_snapshot`, `task_add`, `task_done`, `implementation_brief`, and `idea_close`
- skill/action routing is enforced: `openclaw-workflow-planner` supports all actions, `openclaw-workflow-research` is limited to `idea_list`/`idea_get`/`research_attach`/`idea_gate`/`plan_snapshot`, and `openclaw-workflow-implementer` is limited to `idea_list`/`idea_get`/`plan_snapshot`/`task_add`/`task_done`/`implementation_brief`/`idea_close`
- shipped flow is gated, not linear: `idea_gate` can lead to `accepted`, `needs_research`, `deferred`, or `rejected`; `plan_refresh` is only valid after an accepted idea already has a plan
- `task_done` prefers stable `taskId` with legacy `taskIndex` fallback, and checklist sync follows task ids rather than matching task text

Release prep rules:

- add `vX.Y.Z.md` in this directory
- add `vX.Y.Z.clawhub.md` when the release needs manual ClawHub publication
- keep `vX.Y.Z.md` as the tracked release record and canonical GitHub Release note source
- keep `vX.Y.Z.clawhub.md` as the fill-in operator worksheet for manual ClawHub publication when that path is requested
- record version, date, summary, verification evidence, and publish outcome
