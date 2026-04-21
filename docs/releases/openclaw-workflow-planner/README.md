# openclaw-workflow-planner releases

Tracked public release records:

- [v0.1.0](./v0.1.0.md)
- [release note template](./TEMPLATE.md)
- [ClawHub worksheet template](./TEMPLATE_CLAWHUB.md)

Current shipped surface to reflect in release records:

- file-backed planner state persisted only in `WORKFLOW_PLAN.md`
- control-plane request, entity, and pointer metadata rebuilt from that state; persisted `executionBriefs` are canonical, `currentBriefBySlice` remains a summary/legacy-hydration field, and no separate persisted plan, task, or brief files exist outside `WORKFLOW_PLAN.md`
- logical `artifactRefs`, `governingArtifactRefs`, and pointer `targetArtifactRef` paths describe package-local provenance/materialization targets inside the same planner bundle; they do not imply extra persisted planner files
- action flow includes `idea_create`, `research_attach`, `idea_gate`, `design_prepare`, `design_get`, `plan_create`, `plan_refresh`, `idea_list`, `idea_get`, `plan_snapshot`, `task_add`, `task_done`, `task_remove`, `task_reopen`, `implementation_brief`, and `idea_close`
- skill/action routing is enforced: `openclaw-workflow-planner` supports all actions, `openclaw-workflow-research` is limited to `idea_list`/`idea_get`/`research_attach`/`idea_gate`/`plan_snapshot`, and `openclaw-workflow-implementer` is limited to `idea_list`/`idea_get`/`plan_snapshot`/`task_add`/`task_done`/`task_remove`/`task_reopen`/`implementation_brief`/`idea_close`
- shipped flow is gated, not linear: `idea_gate` can lead to `accepted`, `needs_research`, `deferred`, or `rejected`; accepted work now runs `design_prepare` before `plan_create`, and `plan_refresh` is only valid after an accepted idea already has a plan
- `implementation_brief` persists a fresh current-slice `ExecutionBrief`; rerunning it for the same slice keeps prior `executionBriefs` as superseded persisted history while retargeting the current pointer to the newest fresh brief; `plan_refresh`, `task_add`, `task_done`, `task_remove`, and `task_reopen` stale that brief, so the next `task_done` or `task_reopen` requires a regenerated brief
- `task_done` prefers stable `taskId` with legacy `taskIndex` fallback, and checklist sync follows task ids rather than matching task text
- package docs now include an end-to-end example for `accepted plan -> implementation_brief -> task execution -> idea_close`, and the current verification tail for this surface is `cd openclaw-workflow-planner && pnpm check`

Release prep rules:

- add `vX.Y.Z.md` in this directory
- add `vX.Y.Z.clawhub.md` when the release needs manual ClawHub publication
- keep `vX.Y.Z.md` as the tracked release record and canonical GitHub Release note source
- keep `vX.Y.Z.clawhub.md` as the fill-in operator worksheet for manual ClawHub publication when that path is requested
- use the package-local templates in this directory when drafting a new planner release by hand
- record version, date, summary, verification evidence, and publish outcome
