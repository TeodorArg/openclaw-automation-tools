---
name: openclaw-host-git-workflow
description: Выполняет bounded host git workflow через единый intent `send_to_git`: строит repo-aware план, резолвит repo path, делает live host node binding, выполняет host preflight, валидирует confirmed plan, делает bounded push, bounded PR create, ждёт required checks, bounded merge и bounded sync `main`.
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

## Current Package Slice

Этот package slice сейчас покрывает:
1. planning only
2. branch-aware planning
3. repo resolution
4. live host node binding
5. host preflight
6. confirmed-plan validation
7. bounded push current branch to `origin`
8. bounded PR creation into `main`
9. bounded wait for required checks
10. bounded merge of the current branch PR into `main`
11. bounded sync local `main` from `origin/main`

## Жёсткие правила

- Не принимай произвольный `git <anything>` как supported input.
- Не прокидывай пользовательский текст в shell.
- Planning и execution должны оставаться bounded и typed.
- Push работает только для текущей non-main ветки и только в `origin`.
- PR открывается только из текущей non-main ветки в `main`.
- Runtime должен использовать уже связанный host node, а не unbound selector placeholder.
