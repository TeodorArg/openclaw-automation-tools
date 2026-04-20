# OPENCLAW_URL_TAILWIND_SCAFFOLD_IMPLEMENTATION_TODO V2

Дата: 2026-04-20
Обновлено: 2026-04-20
Статус: open

## Scope

Короткая active TODO под текущее состояние `openclaw-url-tailwind-scaffold`: убрать planning drift и подготовить следующий implementation slice без смешения plugin core и orchestration layer.

## Done

- [x] архивировать старый набор planning/checklist docs, который смешивал bootstrap, target architecture и неподтвержденный progress
- [x] оставить один active master plan
- [x] оставить одну active implementation TODO

## Next

- [x] зафиксировать новый request/result contract для `page_contract`
- [x] решить, какие поля остаются backward-compatible для `scaffold_summary`
- [ ] расширить island taxonomy до open-ended schema, а не shell-only enum
- [ ] формализовать evidence/confidence model отдельно от Tailwind mapping
- [x] определить минимальный static-page acquisition slice без browser orchestration
- [x] подготовить tests first для contract parsing и output shape
- [x] завести bounded static DOM/island extraction для shell landmarks поверх fetched HTML
- [x] добавить bounded token synthesis и Tailwind v4 utility-candidate mapping поверх shell structure

## Not In This Slice

- [ ] subagent orchestration inside plugin
- [ ] file persistence as plugin-owned runtime behavior
- [ ] browser-render support для JS-heavy pages
- [ ] automatic scaffold file generation

## Close Condition

- closed when package has one truthful active plan surface and next implementation slice is small enough to land without architectural overreach
