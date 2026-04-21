---
name: openclaw-host-git-workflow
description: Use when the user needs the bounded host git workflow behind `send_to_git`: setup doctor, repo-aware and branch-aware planning, explicit commit prep, repo resolution, live host node binding, preflight, branch entry, confirmed-plan validation, push, PR creation, checks wait, merge, and sync-main.
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
1. setup doctor
2. planning only
3. branch-aware planning
4. explicit commit prep
5. repo resolution
6. live host node binding
7. host preflight
8. bounded branch entry into requested non-main working branch
9. confirmed-plan validation
10. bounded push current branch to `origin`
11. bounded PR creation into `main`
12. bounded wait for required checks
13. bounded merge of the current branch PR into `main`
14. bounded sync local `main` from `origin/main`

## Preferred Choreography

Предпочитай короткий chain:
1. `doctor`
2. `plan_with_branches`
3. `commit_prep`
4. `validate_confirmed_plan`
5. execution actions

Docs sync должен оставаться отдельным follow-up session после завершения bounded execution slice.

## Execution Mode

- Для live-check, full-cycle verification, и формулировок вроде `проверь работает ли плагин openclaw-host-git-workflow` или `нужен полный цикл` сразу переходи к bounded execution chain этого skill.
- Не трать сообщения на narrated preambles вроде `сначала проверю`, `сейчас посмотрю`, `хочу обойтись без предположений`.
- Routine bounded tool calls в этом skill считаются proactive: не проси подтверждение и не печатай промежуточную простыню перед каждым шагом.
- Пользовательский апдейт допустим только когда началась новая крупная фаза или найден реальный blocker; один короткий outcome line плюс один короткий next-step line максимум.
- Если блокера нет, делай работу сразу и сообщай результат по факту.
- Не выводи chain-of-thought, внутренние размышления, speculative plans или покадровое комментирование каждого `doctor` / `plan` / `preflight` / `push` / `create_pr` шага.

## Current Runtime Notes

Этот skill уже опирается на shipped bounded workflow, а не на будущий дизайн.

- shell execution должен идти через bound host node с `node.invoke` + `system.run.prepare` / `system.run`
- package уже поддерживает plugin config `hostRepoPath`, optional `pathMappings`, и optional `nodeSelector`
- `create_pr` сначала делает explicit PR lookup по текущей branch, а затем либо reuse-ит открытый PR, либо создаёт новый
- `execute_confirmed_plan` уже является bounded bridge от validated confirmed plan к execution kernel
- `wait_for_checks` должен опираться на structured required-check state, а не на prose matching из CLI output

## Result Contract

На execution шагах skill должен ожидать один bounded result payload по текущему действию, а не длинное narrating:

- success path: branch, repo resolution, node binding, stage status, and PR/check/merge metadata when relevant
- blocked path: точный `blocker.code`, краткое message, и конкретный remediation list
- existing PR path: existing PR metadata должен считаться успешным bounded outcome, а не ошибкой

## Validation Expectations

- doctor/preflight должны подтверждать реальный host execution surface, GitHub auth readiness, repo access, and branch safety
- execution остаётся bounded around the current repo and current non-main branch
- live/full-cycle verification phrasing should still normalize to `send_to_git` and run the bounded chain without redesign discussion

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
- Запросы на live/full-cycle verification этого package нужно нормализовать к canonical intent `send_to_git`, а не переводить в длинный режим обсуждения.
