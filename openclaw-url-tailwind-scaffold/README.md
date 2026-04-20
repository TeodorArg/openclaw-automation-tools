# @openclaw/openclaw-url-tailwind-scaffold

Native OpenClaw plugin-plus-skill package for bounded `reference URL -> normalize -> Tailwind CSS v4 scaffold summary`.

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

## Tool Contract

`url_tailwind_scaffold_action` accepts a bounded request for
`analyze_reference_page` and returns:

- acquisition metadata
- a normalized shell contract for `app-shell`, `sidebar`, `header`, `content`, and `footer`
- synthetic `sourceBacked` vs `inferred` status fields derived from request mode
- a Tailwind CSS v4 scaffold summary with a generated file tree suggestion

V1 is intentionally narrow:

- it accepts a reference URL but does not fetch or inspect the page yet
- acquisition and evidence markers reflect request semantics rather than verified page extraction
- no pixel-perfect clone claim
- no shipped fetch-backed, browser-assisted, or auth-gated analysis claim
- no donor CSS-class reuse claim
- no file editing or browser automation

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
  "componentSplit": ["app-shell", "sidebar", "header", "content", "footer"],
  "acquisitionMode": "fetch-backed"
}
```

Structured calls still use the command-dispatch envelope and must include `command`, `commandName`, and `skillName`, with optional `action`, `url`, `goal`, `outputMode`, `componentSplit`, `frameworkHint`, and `acquisitionMode`.
