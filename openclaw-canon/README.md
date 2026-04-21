# @openclaw/openclaw-canon

## Workspace Truth Guard for OpenClaw

Catch drift across docs, memory, and repo truth before it turns into confusion.

`@openclaw/openclaw-canon` helps teams and solo operators keep workspace truth aligned in long-running OpenClaw work. It checks whether docs, memory snapshots, package canon, and repo-level source-of-truth files still agree, then gives you a bounded, preview-first path to inspect problems and apply safe fixes where the runtime actually has authority.

If you want long-running work to stay easier to resume, review, and trust, this plugin is the guardrail against silent canon drift.

## What you get

- workspace truth checks across docs, memory, and repo-level canon
- diagnosis-first reports before any fix is applied
- preview-first bounded fixes for supported memory and sync drift
- safer cleanup of malformed or duplicate memory records
- help keeping package lists and publish docs aligned with repo truth

## Who this is for

Use this if your OpenClaw workspace lives long enough for docs, memory, and repo facts to drift apart.

Good fit:
- long-running multi-session work
- repos with multiple plugins or shared workspace rules
- operators who want a cleaner source of truth before handoff or the next implementation pass

Not this plugin:
- a generic repo linter
- an unrestricted auto-fix bot
- a replacement for human judgment about what should be canonical

## 2-minute quickstart

1. Install the plugin:

```bash
openclaw plugins install clawhub:@openclaw/openclaw-canon
```

2. Enable it:

```json
{
  "plugins": {
    "entries": {
      "openclaw-canon": {
        "enabled": true
      }
    }
  }
}
```

3. Ask OpenClaw to check for drift and show what needs to be aligned.

## Example outcomes

- “Show me whether docs, memory, and repo canon have drifted.”
- “Preview what would be fixed before changing any canon files.”
- “Clean malformed or duplicate memory records without touching unrelated data.”

## Why install this

- keep workspace truth aligned across docs, memory, and ongoing execution
- catch drift before it spreads into confusion and rework
- replace fragile maintenance habits with a clearer source of truth
- make long-running work easier to resume, review, and trust

## Why this beats ad-hoc cleanup

- It checks canon health systematically instead of relying on memory or guesswork.
- It separates diagnosis from fixes, so you can inspect drift before applying changes.
- It keeps fixes bounded to supported memory and sync surfaces.
- It makes long-running workspace truth easier to review, trust, and maintain.
- It scales better than occasional manual cleanup after drift has already spread.

## Bundled Skills

- `canon-memory-hygiene`
- `canon-source-of-truth-fix`

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
