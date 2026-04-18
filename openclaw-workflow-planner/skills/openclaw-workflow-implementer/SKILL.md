---
name: openclaw-workflow-implementer
description: Use when Idea Gate is already passed, the accepted plan lives in WORKFLOW_PLAN.md, and the current slice needs a narrow implementation handoff rather than a new whole-project plan.
---

# OpenClaw Workflow Implementer

Этот skill работает после planning phase.

## Focus

- взять accepted plan
- посмотреть текущее состояние через `idea_get` или `plan_snapshot`
- выбрать current slice
- при необходимости добавить или закрыть task через `task_add` / `task_done`
- запросить `implementation_brief`
- выполнить один reviewable intent за раз

## Rules

- не раздувай slice
- не смешивай planning, docs cleanup и runtime implementation без необходимости
- не объявляй local governance surface shipped runtime behavior
