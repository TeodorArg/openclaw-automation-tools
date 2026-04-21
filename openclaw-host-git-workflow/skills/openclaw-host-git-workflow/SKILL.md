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

## Audit Flow For Missing GitHub SSH Connectivity

Если во время live audit / doctor / preflight нет соединения раннера с GitHub по SSH, не выдавай случайный набор команд. Используй этот зафиксированный порядок диагностики и remediation.

### Canonical diagnosis order

1. Подтверди локальную готовность package:
   - plugin/skill установлен
   - тесты package проходят
2. Подтверди runtime HOME и SSH surface раннера:
   - `HOME=/home/node`
   - существует ли `/home/node/.ssh`
   - есть ли `/home/node/.ssh/known_hosts`
3. Проверь host key стадию:
   - `ssh -T git@github.com`
   - `git ls-remote --heads origin`
4. Если ошибка `Host key verification failed`, remediation должна сначала чинить `known_hosts`, а не предлагать сразу генерировать новый ключ.
5. После исправления `known_hosts` повтори preflight.
6. Если новая ошибка `Permission denied (publickey)`, remediation должна переходить к проверке наличия приватного ключа и SSH config внутри runtime/container.
7. Если ключ скопирован в контейнер через `docker cp`, обязательно проверь ownership/permissions, потому что типичный реальный сбой здесь это root-owned key, который не читается пользователем `node`.
8. После исправления ownership/permissions повтори:
   - `HOME=/home/node ssh -T git@github.com`
   - `HOME=/home/node git -C /home/node/tools ls-remote --heads origin`
9. Если обе команды успешны, фиксируй outcome как `SSH readiness restored` и считай remote readiness для doctor/preflight подтверждённой.

### Canonical remediation sequence when OpenClaw runs in Docker

Когда пользователь говорит, что OpenClaw работает в Docker, предпочитай именно этот flow:

1. С локальной машины определить контейнер:
   - `docker ps --format 'table {{.ID}}\t{{.Names}}\t{{.Image}}'`
2. Подготовить SSH директорию в контейнере:
   - `docker exec <container> mkdir -p /home/node/.ssh`
3. Скопировать рабочий GitHub key из локального `~/.ssh` в контейнер через `docker cp`, а не через длинные случайные shell-вставки.
4. В контейнере создать `/home/node/.ssh/config` для `github.com` с `IdentityFile /home/node/.ssh/id_ed25519` и `IdentitiesOnly yes`.
5. Добавить `known_hosts` через `ssh-keyscan github.com >> /home/node/.ssh/known_hosts`.
6. Если после этого возникает `Load key ... Permission denied`, canonical remediation это не новый ключ, а root fix:
   - `docker exec -u 0 <container> sh -lc 'chown -R node:node /home/node/.ssh && chmod 700 /home/node/.ssh && chmod 600 /home/node/.ssh/id_ed25519 /home/node/.ssh/config /home/node/.ssh/known_hosts && chmod 644 /home/node/.ssh/id_ed25519.pub'`
7. Затем повторить проверку уже от пользователя `node`:
   - `docker exec -u node <container> sh -lc 'HOME=/home/node ssh -T git@github.com'`
   - `docker exec -u node <container> sh -lc 'HOME=/home/node git -C /home/node/tools ls-remote --heads origin | sed -n "1,10p"'`

### Required messaging behavior

- В audit-ответе явно различай стадии:
  - package ok
  - host key missing
  - private key missing
  - key unreadable because of ownership/permissions
  - SSH readiness restored
- Не перескакивай сразу к генерации нового ключа, если локальная машина пользователя уже успешно проходит `ssh -T git@github.com`.
- Если пользователь уже показал рабочий `~/.ssh/config` на локальной машине, используй именно указанный там `IdentityFile`, а не выдумывай другое имя ключа.
- Для Docker remediation prefer `docker cp` + targeted permission fix вместо ручного копипаста приватного ключа в heredoc, если пользователь может запускать Docker команды локально.
- После успешной remediation сообщай краткий итог в духе: локально GitHub auth уже работал, проблема была в container runtime SSH surface, known_hosts и правах на key; теперь SSH и `git ls-remote origin` проходят.

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
