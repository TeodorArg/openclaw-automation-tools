# OpenClaw Session Bloat Warning

OpenClaw plugin for calm session-bloat warnings on the official compaction
lifecycle surface.

## Shipped Slice

This first implementation slice is intentionally bounded to the upstream
compaction events confirmed in official OpenClaw docs:

- `before_compaction`
- `after_compaction`

The package currently ships:

- a pre-compaction warning that tells the user the session is already heavy for
  another large phase
- a post-compaction continuation note that nudges the next heavy phase into a
  fresh session
- plugin-owned JSON state with per-session counters for warning dedupe
- a bundled `session-bloat-warning` skill

This package does not yet ship:

- early Stage 1 / Stage 2 warnings before compaction
- bounded handoff summaries
- autonomous session transfer

## Current Refactor Direction

The current agreed next step is a safe architecture-preserving refactor before any early-hook expansion.

Planned sequence:
- state normalization with versioned lazy-normalized fail-open state
- service extraction so compaction hooks become thin adapters
- delivery split so warning decisions are separated from mutable `messages` delivery
- regression-lock test matrix before adding `llm_input` / `llm_output`

This means the next coding session should start by strengthening internal seams under the existing `before_compaction` and `after_compaction` behavior, not by attaching new hook families first.

## Install

Local development install:

```bash
nvm use || nvm install
cd openclaw-session-bloat-warning
pnpm install
pnpm build
cd ..
openclaw plugins install -l ./openclaw-session-bloat-warning
```

Registry install:

```bash
openclaw plugins install clawhub:@openclaw/openclaw-session-bloat-warning
```

## Config

```json
{
  "plugins": {
    "entries": {
      "openclaw-session-bloat-warning": {
        "enabled": true,
        "config": {
          "defaultLanguage": "en",
          "enablePreCompactionWarning": true,
          "enablePostCompactionNote": true
        }
      }
    }
  }
}
```

Supported config keys:

- `stateFilePath`: optional JSON state path for per-session dedupe, resolved
  relative to the current working directory
- `defaultLanguage`: `en` or `ru`; the current implementation uses config-based
  language selection and defaults to English
- `enablePreCompactionWarning`: defaults to `true`
- `enablePostCompactionNote`: defaults to `true`
- `maxWarningsPerSession`: defaults to `2`

## Current Behavior Notes

- warning state is keyed by `sessionKey`; when the event has no usable
  `sessionKey`, the package falls back to a shared internal default bucket
- pre-compaction and post-compaction messages use separate counters in the
  state file
- when pre-compaction warnings stay enabled, post-compaction notes are gated so
  they do not outnumber prior pre-compaction warnings for the same session
- if the hook event does not expose a mutable `messages` array, the package
  safely does nothing instead of forcing output
- session identity is taken from the hook context rather than from a custom
  event-local `sessionKey` field

## Current Limits

- localization is config-selected, not auto-detected from the live session
- state is simple JSON persistence for dedupe only; there is no bounded handoff
  summary or transcript compaction artifact owned by this package
- the first shipped slice stays on official compaction events and does not
  claim a separate early-overload detector before compaction

## Verification

```bash
cd openclaw-session-bloat-warning
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```
