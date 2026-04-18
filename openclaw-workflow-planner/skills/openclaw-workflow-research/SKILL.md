---
name: openclaw-workflow-research
description: Используй этот skill, когда перед Idea Gate нужно собрать и прикрепить typed research для planner idea: насколько идея полезна, опасна, дублирует existing surface или уже имеет близкие аналоги.
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
