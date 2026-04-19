# OpenClaw Session Bloat Warning

OpenClaw plugin for calm session-bloat warnings across the shipped compaction,
observation, and visible early-warning delivery surfaces.

## Shipped Slice

The current shipped slice is intentionally bounded, but it is no longer
compaction-only.

Implemented surfaces:

- `before_compaction`, writable warning delivery via `event.messages`
- `after_compaction`, writable continuation note via `event.messages`
- `llm_input`, observe-only signal capture
- `llm_output`, observe-only token capture
- `before_agent_reply`, visible early-warning delivery as a synthetic reply

The package currently ships:

- a pre-compaction warning that tells the user the session is already heavy for
  another large phase
- a post-compaction continuation note that nudges the next heavy phase into a
  fresh session
- early warning based on stored runtime signals, delivered as a visible
  synthetic reply before the agent reply path
- plugin-owned JSON state with per-session counters and signal persistence for
  dedupe and cooldown handling
- a bundled `session-bloat-warning` skill

The current architecture split is:

- signal hooks: `llm_input` and `llm_output`
- decision core: `src/runtime/core/early-warning-core.ts`
- delivery adapter: `src/runtime/hooks/early-warning-delivery-hooks.ts`

This package does not yet ship:

- prompt-mutation based early-warning delivery
- bounded handoff summaries
- autonomous session transfer
- broader repeated-failure, edit-loop, or timeout-risk heuristic families

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
- `enableEarlyWarning`: defaults to `true`
- `maxWarningsPerSession`: defaults to `2`
- `cooldownTurns`: defaults to `3`
- `warningCharThreshold`: default char threshold for early warning
- `warningMessageCountThreshold`: default message-count threshold for early warning
- `warningInputTokensThreshold`: warning token threshold
- `elevatedInputTokensThreshold`: elevated token threshold
- `criticalInputTokensThreshold`: critical token threshold

## Current Behavior Notes

- warning state is keyed by `sessionKey`; when the event has no usable
  `sessionKey`, the package falls back to a shared internal default bucket
- pre-compaction, post-compaction, and early-warning delivery use separate
  persisted counters/state
- early-warning observation is gathered on observe-only hooks and delivered only
  through `before_agent_reply`
- early-warning cooldown recovery is based on real observed turn progression,
  not on accumulated warning counters
- when pre-compaction warnings stay enabled, post-compaction notes are gated so
  they do not outnumber prior pre-compaction warnings for the same session
- if the hook event does not expose a mutable `messages` array, the package
  safely does nothing instead of forcing output
- session identity is taken from the hook context rather than from a custom
  event-local `sessionKey` field

## Current Limits

- localization is config-selected, not auto-detected from the live session
- state is simple JSON persistence; there is no bounded handoff summary or
  transcript compaction artifact owned by this package
- visible early warning is a synthetic reply surface, not prompt mutation

## Verification

```bash
cd openclaw-session-bloat-warning
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
clawhub package publish ./openclaw-session-bloat-warning --dry-run
```
