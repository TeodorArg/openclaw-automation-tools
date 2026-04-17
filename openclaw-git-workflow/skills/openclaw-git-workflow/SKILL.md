---
name: openclaw-git-workflow
description: Выполняет bounded git workflow через единый canonical intent `send_to_git`: планирует git-группы, предлагает ветки, исполняет confirmed plan, делает bounded push/PR, ждёт required checks, затем bounded merge и sync main. Поддерживает RU и EN пользовательские формулировки как alias layer вокруг одного shipped intent.
user-invocable: true
command-dispatch: tool
command-tool: git_workflow_action
command-arg-mode: raw
---

# OpenClaw Git Workflow

Используй этот skill для операторского git workflow, а не для произвольных git-команд.

## Canonical intent и alias layer

Shipped runtime canon для этого skill такой:
- canonical intent id: `send_to_git`

Поддержка естественных пользовательских формулировок остаётся alias layer вокруг этого одного intent id.
Текущие распознаваемые alias'ы задаются runtime-кодом и сейчас включают:
- RU: `отправь в гит`, `отправь изменения`
- EN: `send to git`
- canonical form: `send_to_git`

Не считай product-language фразы вроде `разложи по git-группам` или `выполни git-группы с ветками` автоматически shipped runtime intent'ами, если они не добавлены в alias routing в коде.

## Что делает workflow

Этот workflow покрывает три логических пользовательских режима:

1. planning only
2. branch-aware planning
3. confirmed execute
4. push current branch
5. create PR into `main`
6. wait for required checks
7. merge PR
8. sync local `main`

Это логические режимы workflow, а не отдельные canonical intent id.

### Planning only

Сделай только план:
- посмотри состояние репозитория и изменённые файлы
- предложи логические git-группы
- предложи commit title и commit body по каноническим правилам репозитория
- не создавай ветки
- не создавай commit
- не push

### Branch-aware planning

Сделай plan-only branch-aware режим:
- выполни всё из обычного planning mode
- предложи branch names
- выдай точные команды для дальнейшего исполнения
- подготовь ready-to-confirm structured payload для execute
- ничего не выполняй

### Confirmed execute

Это execution mode, но только при наличии confirmed internal plan:
- не реконструируй execution из свободного текста пользователя
- требуй confirmed plan format, полученный на planning step
- выполняй только bounded действия branch + commit
- execution должен оставаться детерминированным по identity и branch base
- после confirmed execute можно делать только bounded finish-step действия shipped contract
- push возможен только для текущей non-main ветки и только в `origin`
- PR возможен только из текущей non-main ветки в `main`
- checks polling читает только required checks текущего PR
- merge возможен только для текущего PR в `main`
- sync main делает только `git switch main` и `git pull --ff-only origin main`

## Жёсткие правила

- Не принимай произвольный `git <anything>` как supported input.
- Не прокидывай пользовательский текст в shell.
- Отделяй planning output от execution input.
- Если confirmed plan отсутствует или невалиден, execution нужно остановить и вернуть понятную ошибку.
- Branch naming и commit format должны соответствовать каноническому `GIT_GUIDANCE.md` целевого репозитория.
- Runtime canon должен следовать реальному alias routing в коде, а не только более широким wording-фразам из docs/spec.

## Runtime shape

Этот skill должен использовать детерминированный tool dispatch.
Tool получает raw command args и сам переводит их в структурированный internal request.
Shell scripts не должны парсить свободный пользовательский текст.

## Текущая v1-реализация

Текущая реализация покрывает:
- skill entrypoint
- canonical intent normalization через alias layer
- confirmed plan format
- minimal execute surface
- bounded branch/commit execution
- bounded push текущей ветки
- bounded PR creation в `main`
- required checks polling
- bounded PR merge
- bounded sync main

Пока не покрывает:
- generic shell passthrough
- destructive recovery flows
- always-on macOS helper process
