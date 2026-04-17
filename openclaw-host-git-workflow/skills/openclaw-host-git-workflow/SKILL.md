---
name: openclaw-host-git-workflow
description: Выполняет bounded host git workflow через единый canonical intent `send_to_git`: нормализует intent, строит repo-aware план, нормализует repo resolution и node selection, делает host preflight, валидирует confirmed plan, делает bounded push текущей ветки, открывает bounded PR в `main` и синхронизирует локальный `main`.
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
3. repo resolution
4. node selection с precedence `pluginConfig -> env -> default placeholder`
5. host preflight
6. confirmed-plan validation
7. push current branch to `origin`
8. create PR from current branch into `main`
9. sync local `main` from `origin/main` with clean-worktree and fast-forward-only behavior

Текущий slice не выполняет:

- host-backed branch/commit execution
- `wait_for_checks`
- `merge_pr`

## Жёсткие правила

- Не принимай произвольный `git <anything>` как supported input.
- Не прокидывай пользовательский текст в shell.
- Отделяй planning output от later execution input.
- Если confirmed plan отсутствует или невалиден, validation должна остановиться с понятной ошибкой.
- Push должен работать только для текущей non-main ветки и только в `origin`.
- PR должен открываться только из текущей non-main ветки в `main` и только через bounded `gh pr create`.
- `sync_main` должен работать только при clean worktree и только для bounded sync локального `main` от `origin/main`.
- Node selection должен оставаться явно `not_bound`, пока runtime не подключён к `node.invoke`.
- Finish-flow шаги сверх shipped slice не должны заявляться как implemented, пока соответствующий runtime не реализован внутри этого package.
