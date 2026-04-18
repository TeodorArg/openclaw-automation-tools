# OpenClaw Canon

`openclaw-canon` is an operational canon plugin for OpenClaw.

It productizes the repo's canon/drift workflow into a small typed runtime
surface instead of keeping it as prose-only main-session ritual.

Initial shipped contract:
- `canon_status`
- `canon_doctor`
- `canon_fix`

Initial scope:
- latest-known canon summary with lightweight freshness checks
- bounded diagnosis for `source`, `memory`, and `sync`
- preview-first `canon_fix` for `memory` and bounded `sync`

Retained backlog, not shipped in the initial contract:
- `canon_fix` for `source`
- umbrella `scope=all`
- standalone follow-up or cron tools

## Bundled Skills

- `memory-hygiene`
- `source-of-truth-fix`

These skills remain instruction layers. The executable runtime surface is the
typed tool family above.

## Tool Contract

`canon_status` input:
- required: `mode = "summary"`
- optional: `refresh = "none" | "light"`

`canon_status` output:
- required: `status`, `generatedAt`, `summary`
- optional: `findings`, `stale`, `ageSeconds`, `followups`

`canon_doctor` input:
- required: `scope = "source" | "memory" | "sync"`
- optional: `execution = "inline" | "auto"`

`canon_doctor` output:
- required: `status`, `scope`, `generatedAt`, `findings`
- optional: `followups`, `proposals`, `taskRef`

`canon_fix` input:
- required: `scope = "memory" | "sync"`, `mode = "preview" | "apply"`
- optional: `targetIds[]`, `confirmToken`

`canon_fix` output:
- required: `status`, `scope`, `mode`, `generatedAt`
- optional: `changes`, `findings`, `followups`, `proposals`, `taskRef`

## Current Runtime Boundary

The initial runtime focuses on repo-local operational canon for this workspace:
- package-shape and manifest drift against `docs/PLUGIN_PACKAGE_CANON.md`
- live package-list sync across canon docs, publish preflight, repo README, and CI
- memory snapshot integrity for `memory.jsonl`

`canon_doctor source` is diagnosis-first. It emits findings and proposal data
for source-of-truth issues but does not auto-apply source fixes.

`canon_fix` is intentionally narrower:
- `scope = "memory"` deletes malformed JSON, malformed-shape, and byte-identical duplicate memory records
- `scope = "sync"` rewrites only the bounded package-list sections in `.github/workflows/ci.yml`, `docs/CLAWHUB_PUBLISH_PREFLIGHT.md`, and the repo `README.md` fact line
- every `apply` requires a preview-issued `confirmToken`
- `canon_fix source` remains proposal-only

## Plugin-Owned State

The plugin keeps only minimal domain state in a local JSON file:
- latest summary snapshot
- latest doctor reports
- preview proposals and short-lived confirm tokens

Detached task execution is retained as a later integration point. The current
implementation stays inline and bounded.

## Install

```bash
openclaw plugins install clawhub:@openclaw/openclaw-canon
```

Local development:

```bash
nvm use || nvm install
cd openclaw-canon
pnpm install
pnpm build
cd ..
openclaw plugins install -l ./openclaw-canon
```

## Verify

```bash
cd openclaw-canon
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```
