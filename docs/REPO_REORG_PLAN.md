# Repo Reorg Plan

Date: 2026-04-16
Status: `openclaw-git-workflow` completed in `main`; `memory-hygiene` slice in progress

## 1. Что именно меняем

Нужно превратить текущий репозиторий в набор отдельных publishable-пакетов, где каждая папка названа по реальному имени плагина или скилла, а не по техническому имени вроде `plugin/`.

После уточнения scope на 2026-04-16:
- `plugin-host-git-push` не считаем целевым пакетом для публикации
- отдельный mac-node / host-backed git package обязателен, потому что именно через него OpenClaw ходит в git/GitHub на Mac
- `openclaw-host-git-pr` остаётся в scope, но его нужно отделить от legacy combined bridge package
- `memory-hygiene` и `source-of-truth-fix` пакуем как отдельные skill-пакеты
- `openclaw-git-workflow` остаётся отдельным plugin-plus-skill пакетом

Итоговый target scope на сейчас:
- `openclaw-git-workflow`
- `memory-hygiene`
- `source-of-truth-fix`
- `openclaw-host-git-pr`
- отдельный mac-node / host-backed git package

Рабочая модель target repo до закрытия inventory:
- в репо будут package folders для подтверждённых publishable skill/plugin packages
- дополнительно может появиться один companion folder для mac-node / host-backed lane, если inventory покажет, что это не самостоятельный publishable plugin package
- значит target repo не обязан состоять только из publishable packages; он обязан состоять только из явно классифицированных единиц без серой зоны

## 2. Что уже проверено

### 2.1 Текущий живой reference package в этом репо

Живой package source сейчас находится в [openclaw-git-workflow](/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow):
- `package.json`
- `openclaw.plugin.json`
- `index.ts`
- `api.ts`
- `src/**`
- `scripts/**`
- `skills/openclaw-git-workflow/SKILL.md`
- `README.md`
- `EXECUTE_SURFACE.md`
- `tsconfig*.json`
- `pnpm-lock.yaml`

CI в [ci.yml](/Users/svarnoy85/teodorArg/openclaw-git-workflow/.github/workflows/ci.yml) уже переключён на `openclaw-git-workflow/` и `openclaw-git-workflow/scripts/*.sh` в рамках текущего Slice C branch.

Дополнительно подтверждено по текущему repo state:
- `docs/SOURCE_INVENTORY.md` уже добавлен как source-of-truth baseline
- `docs/MIGRATION_TABLES.md` уже добавлен как path-mapping baseline
- root `README.md` уже переведён в repo-index формат
- CI уже выровнен под новый live package path `openclaw-git-workflow/`

### 2.2 Live container paths

Контейнер `openclaw-gateway` живой. Маппинги подтверждены:
- `/Users/svarnoy85/OpenClaw-config` -> `/home/node/.openclaw`
- `/Users/svarnoy85/OpenClaw-workspace` -> `/home/node/workspace`
- `/Users/svarnoy85/teodorArg/OpenClaw` -> `/home/node/project`

Проверенные live paths в контейнере:
- `memory-hygiene`
  - `/Users/svarnoy85/OpenClaw-workspace/skills/memory-hygiene/SKILL.md`
  - `/Users/svarnoy85/teodorArg/OpenClaw/templates/skills/memory-hygiene/SKILL.md`
  - `/Users/svarnoy85/teodorArg/OpenClaw/workspace/skills/memory-hygiene/SKILL.md`
- `source-of-truth-fix`
  - `/home/node/.openclaw/skills/source-of-truth-fix/SKILL.md`
- loaded installed `openclaw-git-workflow`
  - install path: `/home/node/.openclaw/extensions/openclaw-git-workflow`
  - `openclaw plugins inspect openclaw-git-workflow` показывает recorded install source path `~/repos/openclaw-git-workflow/plugin/.pack/openclaw-openclaw-git-workflow-0.1.0.tgz`
- loaded installed legacy combined bridge package
  - install path: `/home/node/.openclaw/extensions/openclaw-host-git-push`
  - `openclaw plugins inspect openclaw-host-git-push` показывает recorded install source path `~/repos/openclaw-git-workflow/plugin-host-git-push/.pack/openclaw-openclaw-host-git-push-0.1.0.tgz`

Важно:
- оба plugin id (`openclaw-git-workflow`, `openclaw-host-git-push`) реально loaded в `openclaw-gateway`
- recorded install source paths из plugin inspect сейчас нельзя считать live filesystem proof
- каталога `/home/node/repos` в текущем контейнере сейчас нет, поэтому эти archive paths нужно трактовать как install metadata, а не как доступный canonical source

### 2.3 Что известно про legacy `plugin-host-git-push`

В `main` эта папка уже удалена коммитом `601102a` от 2026-04-16.

Но git history и installed extension подтверждают, что раньше она содержала:
- plugin runtime
- `openclaw-host-git-push` skill
- `openclaw-host-git-pr` skill
- bridge docs

Это важно использовать только как source reference для инвентаризации и извлечения нужных артефактов.
Это не target package.

Дополнительная текущая проверка:
- sibling path `/Users/svarnoy85/teodorArg/openclaw-host-git-push/` на Mac сейчас существует, но directory пустой
- поэтому его нельзя считать verified live source repo без дополнительного восстановления/поиска реального source path

### 2.4 Что уже ясно про mac-node / host-backed lane

Отдельный host-backed lane подтверждён в [OpenClaw/GIT_GUIDANCE.md](/Users/svarnoy85/teodorArg/OpenClaw/GIT_GUIDANCE.md) и [OpenClaw/README.md](/Users/svarnoy85/teodorArg/OpenClaw/README.md).

Подтверждённые факты:
- git/GitHub finish path для этого setup должен быть host-backed only
- используется официальный macOS `openclaw node` service
- это operating lane уровня `OpenClaw`, а не уже доверифицированный publishable package source внутри текущего `main`
- legacy `plugin-host-git-push` был отдельным bridge package поверх этого host-backed transport layer, а не доказательством, что сам `openclaw node` уже является отдельным publishable plugin package

Вывод:
- отдельная mac-node / host-backed единица в target architecture нужна
- но её нельзя автоматически считать publishable plugin package, пока не найдены собственные manifest/id/source path
- до inventory её правильнее трактовать как `publishable package or companion adapter/service layer`, который работает поверх product-level `openclaw node` transport

### 2.5 Аналитическая пометка по package boundary

На текущем срезе есть две разные сущности:
- product/service layer: официальный `openclaw node` host execution transport из `OpenClaw`
- repo-specific git adapter layer: логика push/PR, repo resolution, capability preflight, spool/jobs contract, skills, docs

Поэтому рабочее правило такое:
- если у mac-node git adapter найдутся собственные `package.json` и `openclaw.plugin.json`, он считается отдельным publishable package target
- если собственных package manifests нет, он считается companion adapter/service layer и в этом репо оформляется как отдельная папка с docs/source, но не как самостоятельный plugin package по умолчанию

## 3. Главные решения по новой структуре

### 3.1 Именование папок

Правило: папка называется по реальному имени публикуемого skill/plugin package.

Поэтому:
- `plugin/` уже переименован в `openclaw-git-workflow/` в текущем Slice C branch
- skill-only пакеты получают папки `memory-hygiene/`, `source-of-truth-fix/`, `openclaw-host-git-pr/`
- companion layer для mac-node / host-backed lane получает папку `host-git-lane/`

### 3.2 Что будет в корне репы

Новый top-level tree:

```text
openclaw-git-workflow/
README.md
docs/
  REPO_REORG_PLAN.md
  SOURCE_INVENTORY.md
  MIGRATION_TABLES.md
.github/workflows/
openclaw-git-workflow/
memory-hygiene/
source-of-truth-fix/
openclaw-host-git-pr/
host-git-lane/
```

Принцип:
- в корне остаются только индексные документы, CI и общие migration docs
- каждый publishable пакет живёт в своей отдельной папке
- для mac-node lane используем companion folder `host-git-lane/` с явной boundary-marking
- старой технической папки `plugin/` в финальном виде не остаётся

### 3.3 Общий publish baseline

Для publishable TS/plugin packages берём за baseline текущую форму `openclaw-git-workflow/package.json` и npm guidance:
- обязательные metadata: `name`, `version`, `license`
- явный `files`
- `build`
- `typecheck`
- `test`
- `pack:smoke`
- `publishConfig` как recommended field, а не как universal hard requirement

Для skill-only packages делаем такой же аккуратный publishable каркас, но без лишнего runtime-кода.

### 3.4 Skill publication baseline

Для skill packages нужно заранее закладывать ClawHub-compatible publication minimum.

Обязательный license baseline:
- `MIT-0`
- human wording в package docs/checklist должно явно фиксировать `MIT No Attribution`
- publish gate: у нас есть права на публикацию skill и мы готовы публиковать его под `MIT-0`

Обязательный validator baseline для skill release:
- `Slug` is required
- `Display name` is required
- acceptance of `MIT-0` license terms is required
- at least one file is required
- `SKILL.md` is required

Обязательные publish form fields для каждого skill package:
- `Slug`
- `Display name`
- `Owner`
- `Version`
- `Tags`

Практический вывод для target folders:
- каждый skill package должен содержать минимум `SKILL.md` и `LICENSE`
- `LICENSE` должен быть `MIT-0`, а не просто repo-level `MIT`
- root repo `LICENSE` нельзя автоматически переиспользовать для опубликованных skills
- slug/display-name/version/tags нужно фиксировать в migration tables и package README draft до фактической публикации

### 3.5 Plugin publication baseline

Для code plugins release form проще, но тоже требует отдельного checklist.

Обязательный operational rule:
- сначала upload plugin code, чтобы release form смог определить package shape

Обязательные publish form fields для plugin package:
- `Plugin name`
- `Display name`
- `Owner`
- `Version`
- `Changelog`
- `Source repo (owner/repo)`
- `Source commit`
- `Source ref (tag or branch)`

Практический вывод:
- каждый plugin package должен иметь стабильный package shape до release attempt
- changelog/source repo/source commit/source ref нельзя оставлять как post-factum мысли; их нужно включать в per-package release checklist
- plugin release path действительно проще, но всё равно требует source provenance и release metadata

Не переносим как source-of-truth:
- `dist/`
- `node_modules/`
- `.pack/`
- installed extension `package-lock.json`
- временные tarball-артефакты
- исторические заметки и session handoff notes

## 4. Target packages

### 4.1 `openclaw-git-workflow`

Тип:
- plugin + bundled skill

Canonical source сейчас:
- [plugin](/Users/svarnoy85/teodorArg/openclaw-git-workflow/plugin)

Target folder:
- `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/`

Что переносим:
- `plugin/package.json` -> `openclaw-git-workflow/package.json`
- `plugin/openclaw.plugin.json` -> `openclaw-git-workflow/openclaw.plugin.json`
- `plugin/index.ts` -> `openclaw-git-workflow/index.ts`
- `plugin/api.ts` -> `openclaw-git-workflow/api.ts`
- `plugin/src/**` -> `openclaw-git-workflow/src/**`
- `plugin/scripts/**` -> `openclaw-git-workflow/scripts/**`
- `plugin/skills/openclaw-git-workflow/SKILL.md` -> `openclaw-git-workflow/skills/openclaw-git-workflow/SKILL.md`
- `plugin/README.md` -> `openclaw-git-workflow/README.md`
- `plugin/EXECUTE_SURFACE.md` -> `openclaw-git-workflow/EXECUTE_SURFACE.md`
- `plugin/tsconfig*.json` -> `openclaw-git-workflow/`
- `plugin/pnpm-lock.yaml` -> `openclaw-git-workflow/pnpm-lock.yaml`

Что не переносим:
- `plugin/dist/`
- `plugin/node_modules/`
- `plugin/.pack/`

### 4.2 `memory-hygiene`

Тип:
- skill-only package

Canonical source:
- `/Users/svarnoy85/OpenClaw-workspace/skills/memory-hygiene/SKILL.md`

Secondary references:
- `/Users/svarnoy85/teodorArg/OpenClaw/templates/skills/memory-hygiene/SKILL.md`
- `/Users/svarnoy85/teodorArg/OpenClaw/workspace/skills/memory-hygiene/SKILL.md`

Target folder:
- `/Users/svarnoy85/teodorArg/openclaw-git-workflow/memory-hygiene/`

Что переносим:
- live `SKILL.md` как source-of-truth
- новый `README.md` с коротким описанием назначения и boundaries
- package-local `LICENSE` и publication metadata baseline для skill package

Что документируем, но не тащим как source:
- template copy
- workspace seed copy
- любые ссылки на workspace canon только как notes в README

### 4.3 `source-of-truth-fix`

Тип:
- skill-only package

Canonical source:
- `/home/node/.openclaw/skills/source-of-truth-fix/SKILL.md`

Target folder:
- `/Users/svarnoy85/teodorArg/openclaw-git-workflow/source-of-truth-fix/`

Что переносим:
- live `SKILL.md`
- новый `README.md`
- package metadata для publishable skill package

Что дополнительно описываем:
- TODO-first workflow
- порядок lookup: official docs -> source files -> local notes
- что agent-local assumptions не должны утекать в shipped package

### 4.4 `openclaw-host-git-pr`

Тип:
- skill-only package
- runtime integration должен идти через внешний `host-git-lane/`, а не через собственный runtime code inside package или legacy combined package

Canonical source на текущем срезе:
- installed skill: `/home/node/.openclaw/extensions/openclaw-host-git-push/skills/openclaw-host-git-pr/SKILL.md`
- historical repo source: `plugin-host-git-push/skills/openclaw-host-git-pr/SKILL.md` из git history

Target folder:
- `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-host-git-pr/`

Что переносим:
- `SKILL.md` в отдельную skill package папку
- новый `README.md`
- publish metadata
- package-local `LICENSE` для skill publication

Что не переносим как отдельный package:
- старый combined bridge runtime
- старый combined `README.md` целиком

Что нужно переписать руками в стабильный вид:
- PR command surface
- readiness/preflight expectations
- manual approval boundary
- зависимость от внешнего `host-git-lane/`

Что явно не делаем:
- не добавляем собственный plugin runtime в `openclaw-host-git-pr`
- не придумываем отдельный tool owner внутри этого package
- не тащим bridge implementation code из legacy package как будто это текущий live source

Exact contents checklist for `openclaw-host-git-pr`:
- `openclaw-host-git-pr/SKILL.md`
- `openclaw-host-git-pr/README.md`
- `openclaw-host-git-pr/LICENSE`
- `openclaw-host-git-pr/.gitignore` only if packaging flow really needs one

README minimum for this package:
- what the skill does
- what it does not do
- supported intents / command surface
- runtime boundary: external host-backed lane only
- preflight/readiness expectations
- manual approval boundary
- publication metadata placeholders or final values

Publication minimum for this package:
- ClawHub-ready `slug`
- `display name`
- `owner`
- `version`
- `tags`
- validator-ready `SKILL.md`
- package-local `LICENSE` with `MIT-0`

Source inputs allowed for authoring this package:
- installed `SKILL.md`
- historical git `SKILL.md`
- durable bridge contract wording from legacy docs

Files explicitly out of scope:
- `package.json`
- `openclaw.plugin.json`
- `src/**`
- tests for nonexistent local runtime code
- copied `dist/**`

### 4.5 `host-git-lane`

Тип:
- companion adapter/service layer
- не publishable plugin package по текущему inventory
- не skill-only

Что уже подтверждено:
- он нужен
- он не должен называться `plugin-host-git-push`
- он должен быть отделён от `openclaw-git-workflow`
- он отвечает за host-backed git/GitHub communication на Mac

Что уже решено по naming/classification:
- локальная companion folder name = `host-git-lane/`
- canonical source family = product-level `OpenClaw` docs/config
- эта единица не получает ложный `package.json` или `openclaw.plugin.json`, пока не появится новый самостоятельный source root

Предполагаемые source families для проверки:
- `/Users/svarnoy85/teodorArg/OpenClaw`
- live mac-node service wiring
- scripts/config tied to host-backed execution
- официальные node-host docs и реальный package/plugin source, если он уже выделен отдельно

Что должно жить в `host-git-lane/`:
- README с boundary между product transport и repo-specific workflow assumptions
- docs по host path handling
- docs по GitHub/Git auth boundary
- docs по repo/path normalization
- ссылки на внешние canonical refs в `OpenClaw`
- при необходимости shell/schema/examples, но без package scaffold

Exact file set for `host-git-lane/`:
- `host-git-lane/README.md`
- `host-git-lane/HOST_GIT_BOUNDARY.md`
- `host-git-lane/HOST_PATHS_AND_REPO_RESOLUTION.md`
- `host-git-lane/GITHUB_AUTH_AND_PR_FLOW.md`
- `host-git-lane/CANONICAL_REFS.md`

Optional only if directly justified by source:
- `host-git-lane/examples/`
- `host-git-lane/schemas/`
- `host-git-lane/scripts/README.md`

What must not exist in `host-git-lane/`:
- `package.json`
- `openclaw.plugin.json`
- `openclaw.bundle.json`
- fake build/test scaffolding
- copied runtime output from installed extensions

## 5. Что делаем с legacy `plugin-host-git-push`

Не мигрируем как target package.

Используем только как source reference для:
- извлечения `openclaw-host-git-pr/SKILL.md`
- извлечения contract wording, если оно ещё нужно для нового mac-node package
- сверки старых tool names и boundaries

Запрещено:
- восстанавливать `plugin-host-git-push` как отдельный publish target
- переносить installed `dist/**` обратно как source
- копировать combined README без переписывания

## 6. Детальный порядок миграции

### Slice A. Source inventory

Сначала фиксируем `docs/SOURCE_INVENTORY.md`:
- verified live paths
- canonical source path
- secondary copies
- installed extension paths
- historical references
- статус `live`, `derived`, `historical`, `generated`

Отдельно добиваем две вещи:
- фактическую реализацию companion folder `host-git-lane/`
- фактическую реализацию `openclaw-host-git-pr` как skill-only package

### Slice B. Create target folders without moving code

Создаём пустую целевую структуру только для уже классифицированных единиц:
- `openclaw-git-workflow/`
- `memory-hygiene/`
- `source-of-truth-fix/`
- `openclaw-host-git-pr/`
- `host-git-lane/`

Добавляем верхнеуровневый `README.md`, который перечисляет все пакеты и их статус:
- `ready to migrate`
- `inventory pending`
- `publish blocked`

### Slice C. Move the current main package cleanly

Первым переносим `plugin/` -> `openclaw-git-workflow/`, потому что это самый чистый и уже работающий package.
Текущий branch как раз выполняет этот шаг.

Одновременно правим:
- root `README.md`
- `.github/workflows/ci.yml`
- все относительные пути в docs

### Slice D. Skill packages

Потом переносим:
- `memory-hygiene`
- `source-of-truth-fix`
- `openclaw-host-git-pr`

Для каждого:
- кладём `SKILL.md`
- пишем минимальный `README.md`
- добавляем publish metadata
- добавляем smoke-check, что package реально содержит `SKILL.md`

### Slice E. Mac-node package

Только после точной inventory:
- создаём `host-git-lane/` как companion folder
- переносим туда только docs/source artifacts companion-layer уровня
- не создаём фальшивый package scaffold
- убираем любые combined leftovers

### Slice F. Cleanup

После того как новые папки рабочие:
- удаляем старую `plugin/`
- чистим старые ссылки в docs/CI
- удаляем migration-only временные notes

## 7. Что надо переписать в docs

### Root README

Должен описывать:
- что это repo классифицированных OpenClaw publish units
- какие пакеты внутри
- какой пакет за что отвечает
- что `openclaw-git-workflow` не включает host-backed push/PR lane
- что host-backed git communication вынесена в отдельную mac-node единицу
- что эта единица может оказаться либо publishable package, либо companion adapter layer, в зависимости от подтверждённого source boundary

### Package READMEs

У каждого пакета должен быть свой `README.md` со стабильным минимумом:
- что это за пакет
- что он делает
- чего он не делает
- как собрать
- как проверить
- что публикуется

## 8. Что нужно изменить в CI

До Slice C текущий CI был завязан только на `plugin/`.

После реорганизации нужен matrix или отдельные jobs:
- `openclaw-git-workflow`
- `memory-hygiene`
- `source-of-truth-fix`
- `openclaw-host-git-pr`
- `host-git-lane`

Правило для последней единицы:
- если это publishable plugin package, ему нужен package-style build/test/pack job
- если это companion adapter/service layer, ему нужен только релевантный validation job: docs/schema/shell/smoke, без ложного npm package pipeline

Отдельная проверка shell scripts остаётся только там, где эти scripts реально есть.

## 9. Publish readiness checklist

Для каждого пакета перед публикацией:
- корректное имя папки
- корректное имя package/plugin id
- `README.md`
- `LICENSE`
- корректный manifest
- корректный `files`
- smoke pack
- понятный source-of-truth note
- отсутствие `dist/node_modules/.pack` в git source

Для каждого skill package дополнительно:
- `LICENSE` = `MIT-0`
- есть publish-ready `SKILL.md`
- есть `slug`
- есть `display name`
- есть `owner`
- есть `version`
- есть `tags`
- validator rules закрыты: accepted `MIT-0`, add at least one file, `SKILL.md` present

Для каждого plugin package дополнительно:
- release form может определить package shape после code upload
- есть `display name`
- есть `owner`
- есть `version`
- есть `changelog`
- есть `source repo`
- есть `source commit`
- есть `source ref`

## 10. Главные blockers

### Blocker A

`host-git-lane/` больше не blocked на classification или file-set ambiguity.

Что уже закрыто:
- exact local file set зафиксирован в [MIGRATION_TABLES.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/MIGRATION_TABLES.md)
- contract по каждому файлу companion folder зафиксирован там же

Что ещё остаётся:
- фактическое создание `host-git-lane/` в отдельном migration slice
- переписывание локальных companion docs из canonical `OpenClaw` inputs без drift

### Blocker B

`openclaw-host-git-pr` больше не blocked на package-shape ambiguity.

Что уже закрыто:
- exact target file set зафиксирован в [SOURCE_INVENTORY.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/SOURCE_INVENTORY.md) и [MIGRATION_TABLES.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/MIGRATION_TABLES.md)
- README contract and publication metadata baseline documented
- package-local `LICENSE` requirement fixed as `MIT-0`

Что ещё остаётся:
- фактическое создание package folder в отдельном migration slice
- извлечение и rewrite `SKILL.md`/`README.md` из allowed canonical inputs

## 11. Самый прагматичный следующий шаг

Следующий рабочий шаг:
1. открыть отдельную ветку для Slice C
2. завершить текущий перенос `plugin/` -> `openclaw-git-workflow/` проверками и commit
3. в том же change set обновить root README и `.github/workflows/ci.yml`
4. прогнать plugin verification minimum уже из новой папки

Документы, которые теперь считаются обязательным prep baseline перед Slice C:
- [MIGRATION_TABLES.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/MIGRATION_TABLES.md)
- [CI_MIGRATION_PLAN.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/CI_MIGRATION_PLAN.md)

Naming/classification решения уже считаем установленными:
- companion folder = `host-git-lane/`
- `openclaw-host-git-pr` = skill-only package
