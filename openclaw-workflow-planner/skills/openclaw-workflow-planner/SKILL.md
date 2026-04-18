---
name: openclaw-workflow-planner
description: Используй этот skill, когда нужно завести идею, прикрепить typed research, пройти через Idea Gate, создать или обновить accepted plan в WORKFLOW_PLAN.md, вести tasks и потом подготовить bounded implementation handoff.
---

# OpenClaw Workflow Planner

Этот skill даёт planning-first слой поверх `workflow_planner_action` и
использует markdown planner file `WORKFLOW_PLAN.md` как явный state surface.

## Когда использовать

- есть новая идея для plugin / tool / skill / workflow surface
- нужно понять `делать / не делать / отложить / доресерчить`
- нужен структурированный plan/TODO вместо свободного обсуждения
- нужен bounded handoff для следующего implementation slice

## Core Flow

1. Заведи идею через `idea_create`.
2. Прикрепи typed research через `research_attach`.
3. Запусти `idea_gate`.
4. Если решение `accepted`, запусти `plan_create`.
5. Когда accepted plan уже существует и меняется materially, используй `plan_refresh`.
6. Смотри текущее состояние через `idea_get` или `plan_snapshot`.
7. Для ручной доработки плана используй `task_add` и `task_done`.
8. Когда начинается bounded slice, запусти `implementation_brief`.

## Boundary

- Этот package не shipит local Codex `.codex/subagents/**` как runtime agents.
- Bundled skills here are instruction layers, not proof that a separate runtime agent system already exists.
- If executable automation is not implemented, do not imply that it exists.
