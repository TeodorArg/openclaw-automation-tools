---
name: openclaw-url-tailwind-scaffold
description: Use when the user needs bounded reference-URL-driven scaffold synthesis and a Tailwind CSS v4 scaffold summary or page contract through `url_tailwind_scaffold_action`.
user-invocable: true
command-dispatch: tool
command-tool: url_tailwind_scaffold_action
command-arg-mode: raw
---

# OpenClaw URL Tailwind Scaffold

Use this bundled skill for bounded `reference URL -> normalize -> scaffold summary or page contract` work.

## Primary Surface

Primary user-facing tool:

- `url_tailwind_scaffold_action`

The skill should stay narrow:

- accept the canonical action `analyze_reference_page`
- work from a reference page URL as input and, for `fetch-backed`, perform bounded static HTML acquisition
- return acquisition metadata, normalized shell regions, bounded source-document signals, synthesized Tailwind v4 token candidates, and either a scaffold summary or a structured page contract
- keep optional surfaces reported as optional or unresolved instead of fabricating them
- keep multi-agent orchestration outside the plugin boundary
- hand off to `openclaw-url-tailwind-scaffold-orchestrator` when the user wants per-island fan-out or persisted artifact collection above `page_contract`

## Supported V1 Scope

- reference-URL-driven scaffold synthesis with bounded static HTML acquisition for `fetch-backed`
- bounded static DOM/island extraction for shell landmarks from usable fetched HTML
- bounded Tailwind v4 token synthesis and utility-candidate mapping from shell structure
- default shell split: `app-shell`, `sidebar`, `header`, `content`, `footer`
- Tailwind CSS v4 summary output or `page_contract` output
- componentized HTML-first target unless `frameworkHint` explicitly narrows it
- unmatched regions remain explicit and inferred when no confident static DOM landmark is found

## Preferred Raw Command Forms

In hosts that expose bundled skills through `/skill`, invoke this skill as:

- `/skill openclaw-url-tailwind-scaffold https://example.com/dashboard`
- `/skill openclaw-url-tailwind-scaffold '{"url":"https://example.com/dashboard","outputMode":"page_contract"}'`

The raw payload passed after the skill slug is then forwarded into this skill's command-dispatch envelope.

Pass either:

- a single URL, for example `https://example.com/dashboard`
- or a compact JSON object with `url` plus optional `goal`, `componentSplit`, `frameworkHint`, and `acquisitionMode`

## Boundaries

- no file editing
- no browser automation
- no arbitrary shell passthrough
- no extra runtime hooks
- no state file
- no pixel-perfect clone claim
- no raw donor CSS dump
- no claim that JS-heavy, browser-assisted, or auth-gated analysis is supported in the current slice
- no plugin-owned subagent spawning or multi-step orchestration

## Output Bar

Keep the returned scaffold:

- short
- normalized
- implementation-oriented
- explicit about which fields are synthetic request-mode signals versus inferred structure
- focused on one reference page URL and one bounded shell summary
