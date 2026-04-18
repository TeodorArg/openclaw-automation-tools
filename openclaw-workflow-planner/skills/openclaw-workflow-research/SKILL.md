---
name: openclaw-workflow-research
description: Use when a planner idea needs typed research before Idea Gate: value, risk, overlap with existing surface, and nearby prior solutions.
---

# OpenClaw Workflow Research

Этот skill поддерживает главный planner flow.

## Focus

- собрать `researchSummary`
- оценить `valueAssessment`
- оценить `riskAssessment`
- оценить `existingCoverage`
- сформулировать `fitAssessment`
- перечислить `sourcesChecked`

## Output Contract

Своди результат к короткому evidence block, который можно передать в:

- `workflow_planner_action` -> `research_attach`
- `workflow_planner_action` -> `idea_gate`
- `workflow_planner_action` -> `idea_get`

Не превращай research в бесконечный обзор. Нужен материал для решения, а не архив ссылок.
