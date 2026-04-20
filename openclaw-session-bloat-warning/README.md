# @openclaw/openclaw-session-bloat-warning

Session health protection for long AI work.

`@openclaw/openclaw-session-bloat-warning` helps you catch session degradation before it starts slowing the work down. It warns early when a session is becoming too large, too noisy, or too fragile, so you can simplify context before quality drops and long-running work starts to wobble.

This package stays intentionally narrow. It does not summarize the session, move work automatically, or rewrite the conversation. Its job is to surface growing session heaviness early enough that operators can split work, checkpoint, or move the next heavy phase into a fresh session with less risk.

## Why install this

- Protect long-running work from bloated, noisy sessions.
- Catch degradation before compaction, slowdown, or lost signal.
- Keep execution sharper during coding, debugging, research, and orchestration.
- Add a lightweight session health guardrail without changing your workflow.

## Common use cases

- Warn before a long session becomes too heavy to stay productive.
- Keep signal from getting buried under accumulated context.
- Reduce the chance that execution quality drops late in a big session.
- Maintain better focus in multi-phase OpenClaw work.

## One-line example request

`Warn me before this session gets too bloated to stay productive.`

## Features

This plugin ships a bounded, stable warning surface for session heaviness.

Implemented surfaces:

- `before_compaction`, writable warning delivery via `event.messages`
- `after_compaction`, writable continuation note via `event.messages`
- `llm_input`, observe-only signal capture
- `llm_output`, observe-only token and runtime-risk signal capture
- `before_agent_reply`, visible early-warning delivery as a synthetic reply

The plugin provides:

- a pre-compaction warning that tells the user the session is already heavy for
  another large phase
- a post-compaction continuation note that nudges the next heavy phase into a
  fresh session
- early warning based on stored runtime signals, delivered as a visible
  synthetic reply before the agent reply path
- plugin-owned JSON state with per-session counters and signal persistence for
  dedupe and cooldown handling
- a bundled `session-bloat-warning` skill

The architecture split is:

- signal hooks: `llm_input` and `llm_output`
- decision core: `src/runtime/core/early-warning-core.ts`
- delivery adapter: `src/runtime/hooks/early-warning-delivery-hooks.ts`

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
          "enablePostCompactionNote": true,
          "contextWindowTokens": 200000,
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
- `contextWindowTokens`: approximate model context window used for ratio-based token warning thresholds
- `warningInputTokensRatio`: warning token ratio relative to `contextWindowTokens`
- `elevatedInputTokensRatio`: elevated token ratio relative to `contextWindowTokens`
- `criticalInputTokensRatio`: critical token ratio relative to `contextWindowTokens`
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
- timeout-risk and lane-pressure heuristics can be derived from observed output/error text and reused on the next visible warning delivery
- elevated heaviness classification uses the configured `warningCharThreshold` and `warningMessageCountThreshold` directly, while the earlier `earlyWarning*` thresholds gate warning-level delivery
- token-pressure classification now uses the lower of the absolute token thresholds and the ratio-derived thresholds from `contextWindowTokens`, so warning behavior can scale to smaller or larger model windows
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
- percent-style token pressure is still approximate because it depends on observed `llm_output.usage.input` and a configured `contextWindowTokens`, not a live provider-reported max window per request
- timeout and lane-pressure detection remains heuristic and depends on observable output/error text reaching plugin hooks

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
