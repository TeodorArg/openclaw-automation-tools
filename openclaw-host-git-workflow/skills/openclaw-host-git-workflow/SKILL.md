---
name: openclaw-host-git-workflow
description: Выполняет bounded host git workflow через единый canonical intent `send_to_git`: нормализует intent, строит repo-aware план, предлагает ветки, валидирует confirmed plan, делает bounded push текущей ветки и открывает bounded PR в `main`.
user-invocable: true
command-dispatch: tool
command-tool: host_git_workflow_action
command-arg-mode: raw
---

# OpenClaw Host Git Workflow

Используй этот skill для bounded host git workflow, а не для произвольных git-команд.

## Canonical intent и alias layer

Shipped runtime canon для этого skill такой:
- canonical intent id: `send_to_git`

Поддержка естественных пользовательских формулировок остаётся alias layer вокруг этого одного intent id.

## Что делает текущий package slice

Этот package slice сейчас покрывает:

1. planning only
2. branch-aware planning
3. confirmed-plan validation
4. push current branch to `origin`
5. create PR from current branch into `main`

Текущий slice не выполняет:

- host-backed branch/commit execution
- checks polling
- merge
- sync main

## Жёсткие правила

- Не принимай произвольный `git <anything>` как supported input.
- Не прокидывай пользовательский текст в shell.
- Отделяй planning output от later execution input.
- Если confirmed plan отсутствует или невалиден, validation должна остановиться с понятной ошибкой.
- Push должен работать только для текущей non-main ветки и только в `origin`.
- PR должен открываться только из текущей non-main ветки в `main` и только через bounded `gh pr create`.
- Finish-flow шаги сверх shipped slice не должны заявляться как implemented, пока соответствующий runtime не реализован внутри этого package.
