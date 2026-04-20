# @openclaw/openclaw-url-tailwind-scaffold

Native OpenClaw plugin-plus-skill package for bounded `reference URL -> normalize -> Tailwind CSS v4 scaffold summary or page contract`.

## Primary Surface

This package ships one primary tool:

- `url_tailwind_scaffold_action`

And one primary bundled skill:

- `openclaw-url-tailwind-scaffold`

The shipped surface is intentionally minimal:

- one tool entrypoint
- one bundled skill
- no plugin config
- no extra hooks
- one narrow working action: `analyze_reference_page`

## Boundary

This package is an analyzer core, not a multi-agent orchestrator.

- the plugin may feed a wider skill or agent workflow
- the plugin does not spawn or coordinate subagents
- file persistence and multi-step orchestration stay outside the plugin boundary

## Tool Contract

`url_tailwind_scaffold_action` accepts a bounded request for
`analyze_reference_page` and returns:

- acquisition metadata
- a normalized shell contract for `app-shell`, `sidebar`, `header`, `content`, and `footer`
- real static acquisition metadata for `fetch-backed` requests, including bounded HTTP and document signals
- either a Tailwind CSS v4 scaffold summary with a generated file tree suggestion or a structured `page_contract`

V1 is intentionally narrow:

- `fetch-backed` now performs bounded static HTML acquisition for publicly reachable pages
- DOM region extraction, selector derivation, and token extraction are still separate later slices
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
