# @openclaw/openclaw-url-tailwind-scaffold

Turn a reference URL into a reusable Tailwind scaffold.

`@openclaw/openclaw-url-tailwind-scaffold` helps you move from inspiration to implementation faster. Give it a real reference page and it produces a reusable starting scaffold for Tailwind-based UI work, so you can stop staring at a blank page and start from a strong structural base.

This package is built for "build something like this" workflows where the real need is a strong starting contract, not a pixel-perfect clone. It keeps the boundary intentionally tight: fetch-backed acquisition, static shell analysis, Tailwind-oriented synthesis, and orchestration-friendly output that can feed follow-up implementation work.

## Why install this

- Turn design references into implementation momentum.
- Create strong Tailwind-based scaffolds without starting from scratch.
- Speed up landing pages, dashboards, and product UI work.
- Give teams a faster path to first usable UI.

## Common use cases

- Start a landing page or dashboard from a real reference URL.
- Extract a reusable page structure before implementation begins.
- Align visual direction before deeper design and frontend work.
- Shorten the gap between inspiration and a working UI shell.

## One-line example request

`Turn this reference page into a reusable Tailwind scaffold I can build from.`

## Primary Surface

This package ships one primary tool:

- `url_tailwind_scaffold_action`

And two bundled skills:

- `openclaw-url-tailwind-scaffold`
- `openclaw-url-tailwind-scaffold-orchestrator`

The shipped surface is intentionally minimal:

- one tool entrypoint
- one analyzer skill plus one orchestration skill
- no plugin config
- no extra hooks
- one narrow working action: `analyze_reference_page`

## Boundary

This package is an analyzer core, not a multi-agent orchestrator.

- the plugin may feed a wider skill or agent workflow
- the plugin does not spawn or coordinate subagents
- file persistence and multi-step orchestration stay outside the plugin boundary
- the bundled orchestration skill teaches the outer workflow shape, but session tools still do the actual fan-out

## Tool Contract

`url_tailwind_scaffold_action` accepts a bounded request for
`analyze_reference_page` and returns:

- acquisition metadata
- a normalized shell contract for `app-shell`, `sidebar`, `header`, `content`, and `footer`
- real static acquisition metadata for `fetch-backed` requests, including bounded HTTP and document signals
- bounded Tailwind v4 token candidates and utility candidates synthesized from shell structure
- either a Tailwind CSS v4 scaffold summary with a generated file tree suggestion or a structured `page_contract`
- a companion orchestration skill that explains how to turn `page_contract.islands[]` into bounded island lanes and aggregated artifacts

V1 is intentionally narrow:

- `fetch-backed` now performs bounded static HTML acquisition for publicly reachable pages
- the current slice also performs bounded static DOM/island extraction for shell landmarks when fetched HTML is usable
- the current slice also synthesizes bounded Tailwind v4 token candidates and utility candidates from shell structure without cloning donor CSS
- browser rendering, JS-heavy page analysis, and token extraction from live computed styles are still separate later slices
- no pixel-perfect clone claim
- no shipped browser-assisted or auth-gated analysis claim
- no donor CSS-class reuse claim
- no file editing or browser automation
- no plugin-owned subagent orchestration

## Local Verify

```bash
cd openclaw-url-tailwind-scaffold
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

## Request Shape

The working slice accepts the bundled skill's command-dispatch envelope.

In our custom skill host, the user-facing invocation should go through `/skill`.

Preferred user-facing form in this repo's runtime:

```bash
/skill openclaw-url-tailwind-scaffold https://example.com/dashboard
```

Or with a compact JSON payload:

```bash
/skill openclaw-url-tailwind-scaffold '{"url":"https://example.com/dashboard","goal":"Keep the shell reusable.","outputMode":"page_contract","componentSplit":["app-shell","sidebar","header","content","footer"],"acquisitionMode":"fetch-backed"}'
```

The examples below show the raw payload that the bundled skill forwards into command dispatch. Treat the raw slash form without `/skill` as internal dispatch context, not the preferred end-user command in this repo.

Raw command with only a URL:

```bash
/openclaw-url-tailwind-scaffold https://example.com/dashboard
```

Raw command with a compact JSON payload:

```json
{
  "url": "https://example.com/dashboard",
  "goal": "Keep the shell reusable.",
  "outputMode": "page_contract",
  "componentSplit": ["app-shell", "sidebar", "header", "content", "footer"],
  "acquisitionMode": "fetch-backed"
}
```

Structured calls still use the command-dispatch envelope and must include `command`, `commandName`, and `skillName`, with optional `action`, `url`, `goal`, `outputMode`, `componentSplit`, `frameworkHint`, and `acquisitionMode`.

`outputMode` supports:

- `scaffold_summary` for the existing bounded text summary
- `page_contract` for structured analyzer output intended to feed higher-level skills or agent workflows

In the current slice, `page_contract` can include source-backed selectors, DOM paths, text markers, and key nodes for matched shell islands from static HTML landmarks. Tailwind tokens and utility mappings are still bounded synthesized candidates, and unmatched regions stay explicit and inferred.

## Higher-Level Workflow

Use `openclaw-url-tailwind-scaffold` when the user wants the analyzer output itself.

Use `openclaw-url-tailwind-scaffold-orchestrator` when the user wants a layer above the plugin that:

- calls `url_tailwind_scaffold_action`
- reads `page_contract.islands[]`
- splits islands into bounded follow-up tasks
- uses session tools for subagent fan-out when the host runtime exposes them
- aggregates `md/json` artifacts

The packaged artifact contract for that outer layer lives at [ARTIFACT_CONTRACT.md](./skills/openclaw-url-tailwind-scaffold-orchestrator/ARTIFACT_CONTRACT.md).
