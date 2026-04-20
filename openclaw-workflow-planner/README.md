# OpenClaw Workflow Planner

`openclaw-workflow-planner` is a planning-first OpenClaw plugin.

It packages the orchestration pattern that exists in this repository as a
product-facing OpenClaw surface:

- create and track explicit planner ideas
- attach typed research before Idea Gate
- turn an idea into an explicit `Idea Gate`
- decide whether the work should start now, be deferred, or be rejected
- create and refresh a structured accepted plan
- persist planner state in a readable markdown file
- track manual tasks without losing them on plan refresh
- hand off a bounded implementation brief
- close an idea with an explicit outcome note

The package intentionally starts as a planning-first surface, but persisted current brief presence now also drives the runtime from `planning` into `execution` for the current slice.

It now uses a file-backed planner state, inspired by the `openclaw-todo`
pattern: the plugin persists a single readable markdown file `WORKFLOW_PLAN.md`
by default and keeps structured state embedded at the top for safe round-trips,
stale-write detection, and guarded concurrent updates.

That file is the only persisted planner artifact. Control-plane request,
entity, and pointer metadata, including derived `ExecutionBrief` records from
persisted `currentBriefBySlice` summaries, is rebuilt from the state inside
`WORKFLOW_PLAN.md`, and the plugin does not materialize separate plan, task,
or execution-brief files alongside it.

It does not claim to ship the repository's local Codex `.codex/subagents/**`
topology as runtime agents. Those files stay repo-local governance and donor
material only.

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
- planner ideas are stored as explicit lifecycle records with typed research, idea-gate, accepted-plan, task, and close-note sections
- control-plane request, entity, and pointer metadata is rebuilt from persisted ideas rather than written as separate files
- `implementation_brief` returns a derived handoff payload, including structured open tasks for the current slice with stable `taskId`, legacy-friendly 1-based `taskIndex`, a command-ready selector hint, and explicit remaining-open-task guidance; it now also records current brief presence in persisted planner state and control-plane entities without materializing a separate brief file
- writes use lock-and-compare protection so stale concurrent mutations do not blindly overwrite newer planner state
- active lock contention returns a clean planner concurrency error instead of leaking a raw filesystem `EEXIST`
- lock contention is expected to be brief, and the plugin intentionally does not auto-retry stale saves; reload current `WORKFLOW_PLAN.md` state before retrying a conflicting action
- `plan_refresh` updates canonical plan blocks while preserving extra manual tasks
- `task_done`, `task_remove`, and `task_reopen` prefer stable `taskId`; legacy 1-based `taskIndex` is still supported for older/manual flows
- `implementation_brief` exposes both selectors plus a command-ready selector hint and remaining-open-task guidance for easier handoff consumption, and marks the current slice as having a persisted current brief in control-plane state
- successful task-action responses, including `task_add`, return the resolved stable id, resolved 1-based index, shared `targetTask*` context, command-ready `*SelectorHint` fields, and remaining-open-task guidance for immediate next-step follow-through
- checklist synchronization during `task_done`, `task_remove`, `task_reopen`, and `plan_refresh` follows stable task ids rather than matching on task text

## Shipped Flow

- `idea_create` -> `research_attach` -> `idea_gate`
- `accepted` -> `plan_create` -> optional `plan_refresh`
- `needs_research` -> more `research_attach`
- `deferred` / `rejected` -> stop or narrow scope
- after acceptance: `task_add` / `task_done` / `task_remove` / `task_reopen` -> `implementation_brief` -> `idea_close` only once a current accepted plan exists, all tracked tasks are done, and the close note records the delivered outcome

If `idea_create` materially changes the core request after downstream work already
exists, the plugin resets research, idea-gate, plan, and tasks back to `draft`
so the planner state stays coherent.

## Current Boundary

This package currently focuses on planning, bounded handoff, and execution-state transition for the current slice.

Follow-up lanes may add stronger template export, richer plan lifecycle
closure rules, and broader executable workflow chaining beyond the current brief-driven execution transition. The current task/brief UX
polish lane is considered closed after targeted runtime, docs, and test sync,
and the next implementation step should be a genuinely new bounded lane rather
than more polishing of this surface. This package already models the core
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
