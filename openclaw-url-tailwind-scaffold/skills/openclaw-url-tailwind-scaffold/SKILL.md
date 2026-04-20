---
name: openclaw-url-tailwind-scaffold
description: Use when the user needs bounded reference-URL-driven scaffold synthesis and a Tailwind CSS v4 scaffold summary through `url_tailwind_scaffold_action`.
user-invocable: true
command-dispatch: tool
command-tool: url_tailwind_scaffold_action
command-arg-mode: raw
---

# OpenClaw URL Tailwind Scaffold

Use this bundled skill for bounded `reference URL -> normalize -> scaffold summary` work.

## Primary Surface

Primary user-facing tool:

- `url_tailwind_scaffold_action`

The skill should stay narrow:

- accept the canonical action `analyze_reference_page`
- work from a reference page URL as input, not as a fetched inspected document
- return acquisition metadata, normalized shell regions, synthetic `sourceBacked` vs `inferred` notes derived from request mode, and a Tailwind CSS v4 scaffold summary
- keep optional surfaces reported as optional or unresolved instead of fabricating them

## Supported V1 Scope

- reference-URL-driven scaffold synthesis without live page fetch or inspection
- default shell split: `app-shell`, `sidebar`, `header`, `content`, `footer`
- Tailwind CSS v4 summary output
- componentized HTML-first target unless `frameworkHint` explicitly narrows it

## Preferred Raw Command Forms

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
- no claim that live fetch-backed, JS-heavy, browser-assisted, or auth-gated analysis is supported in v1

## Output Bar

Keep the returned scaffold:

- short
- normalized
- implementation-oriented
- explicit about which fields are synthetic request-mode signals versus inferred structure
- focused on one reference page URL and one bounded shell summary
