---
name: openclaw-workflow-implementer
description: Используй этот skill, когда Idea Gate уже пройден, accepted plan живёт в WORKFLOW_PLAN.md и нужен узкий implementation handoff по текущему slice, а не общий план на весь проект.
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
