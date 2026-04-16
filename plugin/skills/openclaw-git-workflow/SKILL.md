---
name: openclaw-git-workflow
description: Планирует git-группы для изменений и, после подтверждённого плана, выполняет только branch + commit через bounded workflow.
user-invocable: true
command-dispatch: tool
command-tool: git_workflow_action
command-arg-mode: raw
---

# OpenClaw Git Workflow

Используй этот skill для операторского git workflow, а не для произвольных git-команд.

## Поддерживаемые пользовательские интенты

Этот skill должен обрабатывать только три канонических интента:

1. `разложи по git-группам`
2. `разложи по git-группам с ветками`
3. `выполни git-группы с ветками`

## Поведение по интентам

### `разложи по git-группам`

Сделай только план:
- посмотри состояние репозитория и изменённые файлы
- предложи логические git-группы
- предложи commit title и commit body по каноническим правилам репозитория
- не создавай ветки
- не создавай commit
- не push

### `разложи по git-группам с ветками`

Сделай plan-only branch-aware режим:
- выполни всё из обычного planning mode
- предложи branch names
- выдай точные команды для дальнейшего исполнения
- ничего не выполняй

### `выполни git-группы с ветками`

Это execution mode, но только при наличии confirmed internal plan:
- не реконструируй execution из свободного текста пользователя
- требуй confirmed plan format, полученный на planning step
- выполняй только bounded действия branch + commit
- execution должен оставаться детерминированным по identity и branch base
- не push в v1
- не открывай PR

## Жёсткие правила

- Не принимай произвольный `git <anything>` как supported input.
- Не прокидывай пользовательский текст в shell.
- Отделяй planning output от execution input.
- Если confirmed plan отсутствует или невалиден, execution нужно остановить и вернуть понятную ошибку.
- Branch naming и commit format должны соответствовать каноническому `GIT_GUIDANCE.md` целевого репозитория.

## Runtime shape

Этот skill должен использовать детерминированный tool dispatch.
Tool получает raw command args и сам переводит их в структурированный internal request.
Shell scripts не должны парсить свободный пользовательский текст.

## Текущая v1-реализация

Текущая v1-реализация покрывает:
- skill entrypoint
- confirmed plan format
- minimal execute surface
- bounded branch/commit execution

Пока не покрывает:
- push
- PR creation
- generic shell passthrough
- destructive recovery flows
- always-on macOS helper process
