# Repo Cleanup TODO

Цель этого файла: сначала фиксировать решения по чистке, а потом удалять только подтвержденные артефакты без угадывания.

## Критерии

- `active`: файл участвует в текущем каноне, на него есть ссылки или он описывает текущую реализацию
- `review`: файл выглядит подозрительно, но перед удалением нужен отдельный разбор
- `remove`: файл уже подтвержден как дубль, transitional-doc или исторический артефакт

## Уже подтверждено

### `remove`

- `docs/PUSH_BRIDGE_IMPLEMENTATION_PLAN.md`
  Причина: transition-план без активных входящих ссылок; текущий канон по host push/PR уже живет в `plugin-host-git-push/BRIDGE_SURFACE.md` и `plugin-host-git-push/README.md`.
- `skills/openclaw-host-git-push/SKILL.md`
  Причина: точный дубль packaged skill-файла из `plugin-host-git-push/skills/openclaw-host-git-push/SKILL.md`; корневая копия не входит в manifest/package files.
- `skills/openclaw-host-git-pr/SKILL.md`
  Причина: точный дубль packaged skill-файла из `plugin-host-git-push/skills/openclaw-host-git-pr/SKILL.md`; корневая копия не входит в manifest/package files.

### `active`

- `README.md`
- `docs/SKILL_SPEC.md`
- `docs/CONFIRMED_PLAN_FORMAT.md`
- `docs/IMPLEMENTATION_SHAPE.md`
- `docs/FILE_ROLE_MAP.md`
- `docs/REFERENCE_NOTES.md`
- `plugin/EXECUTE_SURFACE.md`
- `plugin-host-git-push/BRIDGE_SURFACE.md`
- `plugin-host-git-push/README.md`

## Следующий проход

- Проверить, не дублируют ли `docs/SKILL_SPEC.md`, `docs/IMPLEMENTATION_SHAPE.md` и `docs/FILE_ROLE_MAP.md` друг друга сильнее, чем нужно.
- Проверить, не осталось ли ещё единичных historical/merge-updates в repo-facing docs; если да, вынести их в workspace memory, а repo canon держать в present-tense состоянии.
- Проверить, нужен ли отдельный `docs/REFERENCE_NOTES.md`, или его можно ужать в README после стабилизации repo shape.
