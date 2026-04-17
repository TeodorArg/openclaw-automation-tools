---
name: openclaw-host-git-workflow
description: Выполняет bounded host git workflow через единый intent `send_to_git`: строит repo-aware план, резолвит repo path, делает live host node binding, выполняет host preflight, умеет bounded branch entry в non-main рабочую ветку, валидирует confirmed plan, делает bounded push, bounded PR create, ждёт required checks, bounded merge и bounded sync `main`.
user-invocable: true
command-dispatch: tool
command-tool: host_git_workflow_action
command-arg-mode: raw
---

# OpenClaw Host Git Workflow

Используй этот skill для bounded host git workflow, а не для произвольных git-команд.

## Primary UX

Primary user-facing entrypoint:
- `отправь в гит`
- `send_to_git`

Все supported aliases должны нормализоваться к одному canonical intent `send_to_git`.

## Current Package Slice

Этот package slice сейчас покрывает:
1. planning only
2. branch-aware planning
3. repo resolution
4. live host node binding
5. host preflight
6. bounded branch entry into requested non-main working branch
7. confirmed-plan validation
8. bounded push current branch to `origin`
9. bounded PR creation into `main`
10. bounded wait for required checks
11. bounded merge of the current branch PR into `main`
12. bounded sync local `main` from `origin/main`

## Жёсткие правила

- Не принимай произвольный `git <anything>` как supported input.
- Не прокидывай пользовательский текст в shell.
- Planning и execution должны оставаться bounded и typed.
- Не аутентифицируй `git` или GitHub внутри runtime/container surface.
- Branch entry должен работать с валидным non-main branch name.
- Незакоммиченные изменения можно bounded-переносить только в сценарии `main -> новая local branch`.
- Push работает только для текущей non-main ветки и только в `origin`.
- PR открывается только из текущей non-main ветки в `main`.
- Runtime должен использовать уже связанный host node, а не unbound selector placeholder.
- Repo path должен резолвиться из canonical host/project path, а не из installed output или неявного cwd.
