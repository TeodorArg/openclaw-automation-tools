# OpenClaw Workflow Planner

`openclaw-workflow-planner` is a planning-first OpenClaw plugin.

It packages the orchestration pattern that exists in this repository as a
product-facing OpenClaw surface:

- create and track explicit planner ideas
- attach typed research before Idea Gate
- turn an idea into an explicit `Idea Gate`
- decide whether the work should start now, be deferred, or be rejected
- create and refresh a structured accepted plan
- store the plan in a readable markdown planner file
- track manual tasks without losing them on plan refresh
- hand off a bounded implementation brief

The package intentionally starts as a planning surface.

It now uses a file-backed planner state, inspired by the `openclaw-todo`
pattern: the plugin writes a readable markdown file `WORKFLOW_PLAN.md` by
default and keeps structured state embedded at the top for safe round-trips.

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
- `implementation_brief`
- `idea_close`

## Planner File

- Default path: `./WORKFLOW_PLAN.md`
- Override via plugin config `plannerFilePath`
- The markdown file is human-readable and intended to stay inspectable in git
- planner ideas are stored as explicit lifecycle records with typed research, idea-gate, and plan sections
- `plan_refresh` updates canonical plan blocks while preserving extra manual tasks
- `task_done` also synchronizes matching checklist items inside stored plan blocks

## Current Boundary

This package currently focuses on planning and handoff.

Follow-up slices may add stronger template export, richer plan lifecycle
closure rules, and executable workflow chaining, but this package already
models the core user-visible planner flow instead of only draft generation.

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
