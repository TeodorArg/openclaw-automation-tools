# @openclaw/openclaw-session-bloat-warning

## Session Health Warning: Stay Sharp in Long AI Work

Catch session degradation before long AI work slows down.

`@openclaw/openclaw-session-bloat-warning` warns early when a session is becoming too large, too noisy, or too fragile, so you can simplify context before quality drops and long-running coding, debugging, research, or orchestration work starts to wobble.

If you want OpenClaw to flag session heaviness before compaction pressure, slowdown, or loss of signal gets in the way, this plugin gives you a lightweight guardrail without changing your workflow.

## What you get

- early warnings before a session gets too heavy to stay productive
- visible signals for compaction pressure, timeout risk, lane pressure, and no-reply streaks
- pre-compaction warnings and post-compaction continuation notes
- compact operator diagnostics on `before_prompt_build` plus an optional `session_bloat_status` tool for JSON status snapshots
- configurable thresholds for message count, chars, token pressure, estimate-vs-observed drift surfacing, and compact context-sync status surfacing
- protection for long-running work without automatic rewrites or forced session moves

## Who this is for

Use this if you run long OpenClaw sessions and want a warning before quality starts to drop.

Good fit:
- long coding or debugging sessions
- research and orchestration work that accumulates a lot of context
- operators who want earlier warning before compaction or slowdown

Not this plugin:
- a session summarizer
- an automatic session splitter
- a tool that rewrites your conversation for you

## 2-minute quickstart

1. Install the plugin from a local checkout:

```bash
nvm use || nvm install
cd openclaw-session-bloat-warning
pnpm install
pnpm build
cd ..
openclaw plugins install --force -l ./openclaw-session-bloat-warning
```

If the target runtime already has the same package version linked or copied, do
not assume a relink alone will refresh `dist/**`. Rebuild first, then prefer a
forced reinstall or a fresh tarball install so the runtime cannot keep serving a
stale built artifact under the same version string.

2. Enable it:

```json
{
  "plugins": {
    "entries": {
      "openclaw-session-bloat-warning": {
        "enabled": true
      }
    }
  }
}
```

3. Keep working normally. The plugin warns when session health starts trending in the wrong direction.

## Example outcomes

- “This session is getting heavy enough that the next large phase should move to a fresh session.”
- “You are approaching compaction pressure and should checkpoint before another big step.”
- “Runtime signals suggest timeout risk or lane pressure is accumulating.”

## Why install this

- protect long-running work from bloated, noisy sessions
- catch degradation before compaction, slowdown, or lost signal
- keep execution sharper during coding, debugging, research, and orchestration
- add a lightweight session health guardrail without changing your workflow

## Why this beats ad-hoc intuition

- It watches session heaviness continuously instead of relying on gut feel.
- It surfaces risk before quality drops badly enough to derail the next phase.
- It gives visible warnings without forcing a workflow change.
- It makes long-session health easier to notice, explain, and act on.
- It scales better than trying to manually judge session quality late in the work.

## Features

This plugin ships a bounded, stable warning surface for session heaviness.

Implemented surfaces:

- `before_prompt_build`, operator-facing context-sync diagnostics appended as system context
- `before_compaction`, writable warning delivery via `event.messages`
- `after_compaction`, writable continuation note via `event.messages`
- `llm_input`, observe-only signal capture
- `llm_output`, observe-only token and runtime-risk signal capture for `timeout_risk`, `lane_pressure`, and `no_reply_streak`
- drift-aware separation between local estimate, observed provider input, cached input contribution, observed output, and total observed usage when runtime truth exists
- `before_agent_reply`, visible early-warning delivery as a synthetic reply with compact context-sync/status-style surfacing
- optional tool `session_bloat_status`, compact JSON snapshot of stored runtime truth for one session key

The plugin provides:

- a pre-compaction warning that tells the user the session is already heavy for
  another large phase
- a post-compaction continuation note that nudges the next heavy phase into a
  fresh session
- early warning based on stored runtime signals, delivered as a visible
  synthetic reply before the agent reply path
- operator-facing context-sync diagnostics that reuse the same stored runtime
  truth on `before_prompt_build`
- an optional `session_bloat_status` tool that returns the same compact
  status surface as structured JSON
- plugin-owned JSON state with per-session counters and signal persistence for
  dedupe and cooldown handling
- a bundled `session-bloat-warning` skill

The architecture split is:

- reporting surface: `src/status-tool.ts` and `src/runtime/report/json-content.ts`
- signal and decision core: `src/runtime/core/early-warning-core.ts`
- signal hooks: `llm_input` and `llm_output`
- delivery adapters: `src/runtime/hooks/early-warning-delivery-hooks.ts` and
  `src/runtime/hooks/operator-diagnostics-hooks.ts`

Not in scope:

- prompt-mutation based early-warning delivery
- bounded handoff summaries
- autonomous session transfer
- deep runtime-owned recovery for gateway or lane failures beyond plugin-side warning heuristics

## Install

Local development install:

```bash
nvm use || nvm install
cd openclaw-session-bloat-warning
pnpm install
pnpm build
cd ..
openclaw plugins install --force -l ./openclaw-session-bloat-warning
```

Published-registry install when this version was explicitly published to ClawHub:

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
          "enablePostCompactionNote": true,
    "contextWindowTokens": 258000,
          "warningInputTokensRatio": 0.6,
          "elevatedInputTokensRatio": 0.725,
          "criticalInputTokensRatio": 0.85
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
- `warningCharThreshold`: exact char threshold for elevated heaviness classification
- `warningMessageCountThreshold`: exact message-count threshold for elevated heaviness classification
- `earlyWarningCharThreshold`: earlier char threshold for visible warning before compaction pressure
- `earlyWarningMessageCountThreshold`: earlier message-count threshold for visible warning before compaction pressure
- `warningInputTokensThreshold`: absolute warning token ceiling used together with ratio-based thresholds
- `elevatedInputTokensThreshold`: absolute elevated token ceiling used together with ratio-based thresholds
- `criticalInputTokensThreshold`: absolute critical token ceiling used together with ratio-based thresholds
- `contextWindowTokens`: fallback model context window used for ratio-based token warning thresholds when runtime truth is missing
- `warningInputTokensRatio`: warning token ratio relative to `contextWindowTokens`
- `elevatedInputTokensRatio`: elevated token ratio relative to `contextWindowTokens`
- `criticalInputTokensRatio`: critical token ratio relative to `contextWindowTokens`
- `charHeuristicMinTokenRatio`: minimum fraction of the warning token threshold that observed provider input must reach before char-based history heuristics can emit visible warnings
- `messageHeuristicMinTokenRatio`: minimum fraction of the warning token threshold that observed provider input must reach before message-count heuristics can emit visible warnings
- `timeoutRiskStreakThreshold`: repeated timeout streak threshold
- `lanePressureStreakThreshold`: lane-pressure streak threshold
- `noReplyStreakThreshold`: repeated no-reply streak threshold
- `timeoutRiskMsThreshold`: minimum observed timeout duration to classify timeout risk
- `lanePressureMsThreshold`: minimum observed lane-wait duration to classify lane pressure

## Behavior

- warning state is keyed by `sessionKey`; when the event has no usable
  `sessionKey`, the package falls back to a shared internal default bucket
- pre-compaction, post-compaction, and early-warning delivery use separate
  persisted counters/state
- early-warning observation is gathered on observe-only hooks and delivered only
  through `before_agent_reply`
- `timeout_risk`, `lane_pressure`, and `no_reply_streak` heuristics can be derived from observed output/error text and reused on the next visible warning delivery
- elevated heaviness classification uses the configured `warningCharThreshold` and `warningMessageCountThreshold` directly, while the earlier `earlyWarning*` thresholds gate warning-level delivery
- when observed provider input is available and still clearly below token-pressure territory, char-count and message-count heuristics are gated so they do not emit visible warnings too early on their own
- token-pressure classification now uses the lower of the absolute token thresholds and the ratio-derived thresholds from `contextWindowTokens`, so warning behavior can scale to smaller or larger model windows
- when runtime-observed usage exists, the plugin persists both local estimate and observed provider usage, then computes drift fields so warning copy can stay honest about what is observed, missing, heuristic, or suspicious
- warning delivery now includes a compact `context-sync` block that can surface local estimate, observed provider input, cached input, observed output, total observed usage, drift, and reset or chain status with explicit labels
- `before_prompt_build` can append the same context-sync truth as an
  operator-facing diagnostics block, and the optional `session_bloat_status`
  tool can return it as compact JSON
- early-warning cooldown recovery is based on real observed turn progression,
  not on accumulated warning counters
- when pre-compaction warnings stay enabled, post-compaction notes are gated so
  they do not outnumber prior pre-compaction warnings for the same session
- if the hook event does not expose a mutable `messages` array, the package
  safely does nothing instead of forcing output
- session identity is taken from the hook context rather than from a custom
  event-local `sessionKey` field

## Constraints

- localization is config-selected, not auto-detected from the live session
- state is simple JSON persistence; there is no bounded handoff summary or
  transcript compaction artifact owned by this package
- visible early warning is a synthetic reply surface, not prompt mutation
- percent-style token pressure is still approximate because it depends on observed `llm_output.usage.input` and a runtime/catalog or fallback `contextWindowTokens`, not a guaranteed live provider-reported max window per request
- `timeout_risk`, `lane_pressure`, and `no_reply_streak` detection remains heuristic and depends on observable output/error text reaching plugin hooks

## Verification

```bash
cd openclaw-session-bloat-warning
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
# optional manual ClawHub preflight depends on the installed clawhub CLI surface
```
