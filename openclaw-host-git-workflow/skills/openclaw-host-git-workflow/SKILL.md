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

## Implementation Notes For Chat-Driven Push And PR

Ниже сохранена рабочая продуктовая логика для следующей итерации плагина, чтобы было понятно, что именно нужно докрутить, почему это важно, и какой UX считается целевым.

### Вывод

Чтобы плагин реально умел из этого чата делать `push` и `PR в main` по фразам вроде **«сделай пуш и пр»** или когда flow дошёл до этого шага, нужно докрутить не столько сами команды `git/gh`, сколько **связку “чат → bounded flow → host-backed node → repo on host → consolidated result”**.

### Что уже подтверждено

- host-backed node у пользователя поднят и виден
- на ноде доступны:
  - `gh`
  - `ssh`
  - `git`
- credential layer должен жить на host, не в docker runtime, и это соответствует правильной архитектуре
- skill уже декларирует bounded flow:
  - doctor
  - plan
  - commit prep
  - validate
  - push branch
  - create PR into `main`
  - checks / merge / sync main
- в runtime пакета уже есть реализация:
  - bind к host node
  - bounded `git push --set-upstream origin <branch>`
  - bounded `gh pr create --base main --head <branch>`
  - preflight для `git/gh/origin/auth/ssh`

### Что было ошибочным или устаревшим в обсуждении

- `nodes invoke system.run` не является правильным путём для shell execution
- проблема не в том, что OpenClaw не умеет push, а в том, что shell должен идти через `exec host=node`, а не через `nodes invoke system.run`
- нельзя считать, что chat-flow `push + PR` уже полностью готов только потому, что host-node видит `gh/git/ssh`
- push и PR нужно считать двумя разными стадиями: push близок к рабочему пути, PR требует более жёсткой readiness-проверки

### Что теперь нужно докрутить в `openclaw-host-git-workflow`

#### 1. Нужен единый orchestration action

Сейчас есть отдельные action’ы вроде:
- `doctor`
- `push_branch`
- `create_pr`

Но для чата нужен верхнеуровневый action, например:
- `send_to_git`
- `run_flow`
- `execute_confirmed_plan`

Чтобы по фразе:
- **«сделай пуш и пр»**
- или когда flow дошёл до execution stage

плагин сам делал цепочку:
- resolve repo
- bind host node
- preflight
- validate current branch
- push current branch
- create PR into `main`
- вернуть единый итог

#### 2. Нужен нормальный `hostRepoPath` contract

Если runtime живёт в контейнере, а repo физически на macOS в `/Users/...`, нельзя полагаться на container path вроде `/home/node/project`.

Нужно добавить в конфиг плагина что-то вроде:
- `hostRepoPath`
- или `repoPath`

И использовать именно канонический host path, например:
- `/Users/svarnoy85/teodorArg/openclaw-automation-tools`

Иначе bounded exec на node может запускаться не в том cwd.

#### 3. Нужен path mapping container → host

Если где-то в flow всплывает container path, плагин должен уметь перевести его в host path, либо вообще всегда жить только в host path contract.

Иначе получится:
- node выбран правильно
- `git`/`gh` есть
- а cwd неверный
- и flow падает на ровном месте

#### 4. Нужна жёсткая проверка, что node реально connected и usable

Недостаточно просто найти ноду с нужными capability.

Перед push/PR нужно явно валидировать:
- node connected
- node reachable
- shell execution реально идёт через неё
- `git`, `gh`, `ssh` доступны именно в этом execution surface

Если нет, нужно возвращать понятный blocker.

#### 5. Нужен усиленный preflight именно для PR

Перед `gh pr create` мало проверить только `gh auth status`.

Нужно ещё bounded read-only проверить:
- remote реально GitHub repo
- текущая ветка подходит для PR
- base = `main`
- у `gh` есть доступ именно к этому repo
- при возможности, нет ли уже существующего PR для этой ветки

То есть нужен preflight уровня `repo/PR readiness`, а не только `auth readiness`.

#### 6. Нужно перестать полагаться на string match типа `already exists`

Если `create_pr` ловит текст ошибки вроде `already exists`, это хрупко.

Надо делать так:
- сначала lookup PR по текущей branch
- если PR уже есть, вернуть его как success/result
- если нет, только тогда создавать новый

#### 7. Нужен явный bridge от confirmed plan к execution

Если у skill есть дисциплина:
- plan
- validate_confirmed_plan
- execution

то execution-action должен быть связан с подтверждённым планом, а не вызываться как полностью независимый кусок.

#### 8. Нужен consolidated result contract для чата

Когда пользователь пишет:
- **«сделай пуш и пр»**

он должен получить один нормальный результат, например:
- branch: `chore/...`
- push: success
- remote: `origin`
- PR: `#123`
- PR URL: `...`
- next step: wait checks / ready to merge

Или:
- push: success
- PR: blocked
- blocker: `gh repo access failed`
- remediation: краткая и конкретная

#### 9. Нужен живой e2e test на реальном host-backed node

Нужен хотя бы один live validation scenario:
- bind host node
- resolve host repo path
- preflight
- push non-main branch
- create PR into main

Именно он покажет, что путь “из чата” реально рабочий.

### Короткое саммари

Обязательный минимум:
1. Добавить верхнеуровневый orchestration action для `send_to_git`
2. Добавить plugin config для canonical host repo path
3. Добавить host path contract / mapping
4. Проверять, что выбранная node connected и реально исполняет shell
5. Усилить PR preflight
6. Возвращать единый user-facing result
7. Заменить fallback `already exists` на явный PR lookup

Очень желательно:
8. Связать execution с `validate_confirmed_plan`
9. Добавить live integration / e2e validation через реальный host-backed node

### Целевой UX после докрутки

Пользователь пишет в чат:
- **«сделай пуш и пр»**

И дальше плагин сам:
- понимает, что нужен bounded git workflow
- берёт правильный host-backed node
- работает в правильном repo на host
- делает push текущей non-main ветки в `origin`
- создаёт PR в `main`
- возвращает итог с ссылкой на PR

Если PR пока невозможен, плагин должен честно сказать:
- push выполнен
- PR заблокирован
- вот точный blocker

а не выдавать это за полный успех.

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
