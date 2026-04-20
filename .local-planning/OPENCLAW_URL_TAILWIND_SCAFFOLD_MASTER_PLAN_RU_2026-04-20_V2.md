# Master Plan: OPENCLAW_URL_TAILWIND_SCAFFOLD V2

Дата: 2026-04-20
Обновлено: 2026-04-20
Статус: open

## Idea Gate

Status: accepted
Need: привести planning surface по `openclaw-url-tailwind-scaffold` в соответствие с реальным shipped состоянием пакета и зафиксировать следующий рабочий вектор без архитектурного расползания.
Duplication check: старый комплект `.local-planning/OPENCLAW_URL_TAILWIND_SCAFFOLD_*_2026-04-20.md` дублирует один и тот же scope, но смешивает целевую архитектуру, исторический bootstrap пакета и неподтвержденные claim'ы про extraction.
Canon impact: только `.local-planning/`; runtime, README и package docs пока не меняются.
Decision: старый комплект архивировать как исторический bootstrap, активным источником правды оставить один master plan и одну implementation TODO.

## Current Reality

- shipped package now has bounded static fetch-backed acquisition plus shell landmark extraction and still avoids browser render
- текущий outputMode supports both `scaffold_summary` and `page_contract`
- `componentSplit` ограничен `app-shell`, `sidebar`, `header`, `content`, `footer`
- summary and `page_contract` now carry real bounded HTTP/document acquisition metadata, source-backed shell landmark evidence where static DOM extraction succeeds, synthesized Tailwind v4 token candidates plus utility candidates, and a bundled orchestration skill plus artifact contract for the layer above the plugin

## Target Boundary

- plugin остается узким и надежным analyzer/extractor core
- skill или agent workflow сверху отвечает за decomposition, file persistence и optional subagent fan-out
- следующий реальный product jump: не "лучше summary", а evidence-bearing JSON contract
- plugin может быть входом в workflow, после которого пойдет fan-out по subagents, но сама orchestration не живет внутри plugin

## Block 1. Contract Reset

What: зафиксировать честный vNext contract без overclaim и без потери backward compatibility.
Why: текущие planning файлы маскируют разрыв между shipped synthetic summary и желаемым extractor pipeline.
Evidence:
- package code: `openclaw-url-tailwind-scaffold/src/runtime/contract/request.ts`
- package code: `openclaw-url-tailwind-scaffold/src/runtime/analysis/analyze-reference-page.ts`
- package docs: `openclaw-url-tailwind-scaffold/README.md`
Checklist:
- [x] оставить `analyze_reference_page` как canonical action
- [ ] расширить request from `componentSplit` toward `regions + islandHints + acquisition`
- [x] добавить новый `outputMode: page_contract`
- [x] сохранить `scaffold_summary` как backward-compatible mode
Done when:
- request/result contract можно описать без ложных claim'ов про already-live extraction

## Block 2. Evidence Model

What: расширить и формализовать machine-readable contract для islands, key nodes и tokens.
Why: базовый evidence-bearing contract уже shipped, но его еще нужно довести от shell-only extraction до более широкой island taxonomy и richer token model.
Evidence:
- текущая synthetic schema: `openclaw-url-tailwind-scaffold/src/runtime/analysis/normalize-shell.ts`
- Tailwind v4 docs on theme variables and dynamic utilities
Checklist:
- [x] island-level schema for shell regions: `id`, `regionType`, `selectors`, `anchors`, `layout`, `confidence`
- [x] key-node schema for bounded shell extraction: headings, buttons, tables, nav items, forms
- [ ] expand island taxonomy beyond shell regions toward open-ended `islandType` and `detectedRole`
- [x] expand token schema: spacing, colors, radius, typography, shadows
- [x] evidence schema: `source-backed`, `inferred`, `unsupported`, evidence array
- [x] Tailwind mapping schema separated from raw observed styles
Done when:
- output может служить и для skill orchestration, и для later scaffold generation without relying on shell-only placeholders

## Block 3. Acquisition Boundary

What: явно описать acquisition stages и их support policy.
Why: главный риск здесь в том, что planning снова начнет приписывать plugin live extraction, которого еще нет.
Evidence:
- current skill boundary: `openclaw-url-tailwind-scaffold/skills/openclaw-url-tailwind-scaffold/SKILL.md`
- current README wording
Checklist:
- [ ] `reference-url` mode остается текущим shipped behavior
- [x] `fetch-backed` is shipped behavior and should stay described as such, not as future wording shortcut
- [ ] `browser-render` stays future-scoped until verified
- [ ] unsupported/js-heavy/auth-gated states get explicit result markers
Done when:
- acquisition wording в plan не опережает код

## Block 4. Execution Slices

What: нарезать vNext на короткие проверяемые slices.
Why: plugin быстро станет жирным, если тащить acquisition, segmentation, tokens, mapping и orchestration одним коммитом.
Evidence:
- repo orchestration canon: `.codex/governance/orchestration.md`
Checklist:
- [x] Slice 1: contract reset and tests for `page_contract` without live fetch
- [x] Slice 2: basic fetch-backed DOM acquisition for public static pages
- [x] Slice 3: island segmentation and key-node extraction
- [x] Slice 4: token synthesis plus Tailwind v4 mapping
- [x] Slice 5: optional skill/orchestration planning for artifacts and subagents
Done when:
- каждый slice можно реализовать и проверить отдельно

## Archive Note

- старые planning docs moved to `.local-planning/archive/` because they are historical bootstrap material and no longer safe as active source of truth
