# @openclaw/openclaw-canon

Single source of truth for long-running OpenClaw work.

`@openclaw/openclaw-canon` helps teams and solo operators keep docs, memory, and workspace truth aligned before drift turns into confusion. It is built for long-running OpenClaw work where stale context, conflicting notes, and quietly diverging standards create hidden drag.

Instead of relying on ad hoc cleanup and good intentions, it gives you a bounded, preview-first way to inspect canon health, diagnose drift, and apply safe fixes where the current runtime actually has authority.

## Why install this

- Keep workspace truth aligned across docs, memory, and ongoing execution.
- Catch drift before it spreads into confusion and rework.
- Replace fragile maintenance habits with a clearer source of truth.
- Make long-running work easier to resume, review, and trust.

## Common use cases

- Check whether docs and memory still reflect current working truth.
- Reduce drift across long-running multi-session work.
- Keep standards, rules, and project guidance aligned for operators and teammates.
- Clean up before a new implementation pass or handoff.

## One-line example request

`Check whether our workspace truth has drifted and show me what needs to be aligned.`

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
