# openclaw-automation-tools

Multi-package OpenClaw repository for four active publishable plugin packages.

## Repo Docs

Core canon:

- [docs/PLUGIN_PACKAGE_CANON.md](docs/PLUGIN_PACKAGE_CANON.md)
- [docs/PLUGIN_STYLE_CANON.md](docs/PLUGIN_STYLE_CANON.md)

Operational canon:

- [docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md](docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md)
- [docs/CLAWHUB_PUBLISH_PREFLIGHT.md](docs/CLAWHUB_PUBLISH_PREFLIGHT.md)

Together these documents define the active repo-level package, style, node-boundary, and publish-preflight canon.
The live plugin packages now match the current runtime/test layout canon.
The package-shape canon is broader than runtime/test layout alone, and the style canon is active policy even though some enforcement still remains review/script-driven until repo tooling converges further.

## Current Repo Map

| Path | Current shape | Purpose |
| --- | --- | --- |
| [openclaw-host-git-workflow/README.md](openclaw-host-git-workflow/README.md) | publishable plugin-plus-skill package | Active bounded host-backed git/GitHub workflow package |
| [openclaw-workflow-planner/README.md](openclaw-workflow-planner/README.md) | publishable plugin-plus-skill package | Planning-first workflow planner package with file-backed idea and plan lifecycle |
| [openclaw-canon/README.md](openclaw-canon/README.md) | publishable plugin-plus-skill package | Operational canon package for typed status, drift diagnosis, and preview-first memory and bounded sync fixes |
| [openclaw-session-bloat-warning/README.md](openclaw-session-bloat-warning/README.md) | publishable plugin-plus-skill package | Compaction-warning package for calm pre/post compaction session-bloat notices |

## Plugin Packages

`openclaw-host-git-workflow/` is the active host-backed execution package in this repo.
Its bundled skill surface is intentionally collapsed to one primary user-facing entrypoint: `send_to_git` / `отправь в гит`.

Its current shipped slice covers:
- setup doctor for repo targeting, node binding, and host readiness
- repo-aware planning
- branch-aware planning
- explicit commit prep for ownership grouping, branch naming, and commit bodies
- repo resolution
- live host node binding
- host preflight
- bounded branch entry from `main` or another clean local branch into a requested non-main working branch
- confirmed-plan validation
- bounded push of the current non-main branch to `origin`
- bounded PR creation into `main`
- bounded wait for required checks
- bounded merge of the current branch PR into `main`
- bounded sync of local `main` from `origin/main`

The runtime now binds to a concrete host node and executes shell steps through `node.invoke` `system.run.prepare` / `system.run`, instead of treating node selection as an unbound placeholder.
Branch-aware planning output now emits package-aware branch suggestions and commit titles, so merge-visible PR titles identify the owning package or explicit repo surface instead of a generic workflow label.
The package now also exposes a recommended short-session choreography of `doctor -> plan_with_branches -> commit_prep -> bounded execution flow`, where the execution flow is the canonical push/PR/checks/merge/main-sync path and docs sync stays a separate follow-up when shipped truth changed.

Its runtime layout is currently grouped under `src/runtime/host/`, `src/runtime/node/`, `src/runtime/planning/`, and `src/runtime/repo/`, with flat default tests under `src/test/`.

`openclaw-workflow-planner/` is the active planning-first plugin package in this repo.
Its shipped surface centers on file-backed `WORKFLOW_PLAN.md` state plus typed planner actions for:
- idea creation and listing
- typed research attachment
- explicit `Idea Gate` decisions
- accepted-plan creation and refresh
- persisted plan snapshots and idea reads
- manual task add / done tracking
- bounded implementation brief generation
- explicit idea closure

Its concrete planner entry surfaces are the bundled skills `openclaw-workflow-planner`, `openclaw-workflow-research`, and `openclaw-workflow-implementer`, plus the typed tool `workflow_planner_action`.

Its runtime layout is currently grouped under `src/runtime/planning/` and `src/runtime/state/`, with flat default tests under `src/test/`.

`openclaw-canon/` is the active operational-canon plugin package in this repo.
Its shipped surface centers on a compact typed runtime contract:
- `canon_status` for latest-known summary snapshots plus optional light refresh
- `canon_doctor` for bounded `source`, `memory`, and `sync` diagnosis
- `canon_fix` for preview-first `memory` and bounded `sync` fixes with confirm-token gated apply

Its bundled skills are `canon-memory-hygiene` and `canon-source-of-truth-fix`, but those remain instruction layers on top of the typed tool surface rather than replacing it.
The plugin keeps only minimal file-backed domain state for latest summaries, doctor reports, and short-lived preview tokens.

Its runtime layout is currently grouped under `src/runtime/doctor/`, `src/runtime/fix/`, `src/runtime/report/`, `src/runtime/state/`, and `src/runtime/status/`, with flat default tests under `src/test/`.

`openclaw-session-bloat-warning/` is the active compaction-warning plugin package in this repo.
Its shipped surface combines the official compaction lifecycle with bounded visible early-warning delivery:
- `before_compaction` for a calm warning before compaction starts
- `after_compaction` for a short continuation note after compaction finishes when the hook payload exposes a writable `messages` array
- observe-only `llm_input` and `llm_output` signal capture
- visible early-warning delivery on `before_agent_reply`
- plugin-owned dedupe plus cooldown state for per-session warning ceilings

Its bundled skill surface currently centers on `session-bloat-warning`.
The live slice stays bounded to calm warning copy, visible early warning, persisted dedupe/cooldown state, and heuristic timeout/lane-pressure signal reuse rather than runtime-owned recovery or bounded handoff summarization.

Its runtime layout is currently grouped under `src/runtime/config/`, `src/runtime/hooks/`, `src/runtime/state/`, and `src/runtime/text/`, with flat default tests under `src/test/`.

## Gateway Vs Node Host

In this repo the canonical baseline is the Gateway, not a repo-owned node-host package.

- `openclaw-gateway` in Docker is the always-on Gateway/WebSocket runtime for OpenClaw
- `node host` is a separate headless OpenClaw node running on the machine where `system.run` / `system.which` must execute for real
- if you need local repos, host git, `ssh`, `gh`, push, PR creation, or required-check polling, run that node on the corresponding host machine instead of trying to make baseline `openclaw-gateway` own those capabilities

This split matters:
- the gateway accepts operator and node connections, stores pairing state, and coordinates runtime
- the node host connects to the gateway and exposes the command surface of its own machine
- this repo's baseline is intentionally narrow and does not treat container-runtime `git push` or `PR creation` as the canonical path

For the full host-node install, pairing, Windows, and remote-loopback/SSH-tunnel contract, see [docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md](docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md).

## Install

Local development install:

```bash
nvm use || nvm install
cd openclaw-host-git-workflow
pnpm install
pnpm build
cd ..
openclaw plugins install -l ./openclaw-host-git-workflow
```

Repeat the same package-local `pnpm install`, `pnpm build`, and `openclaw plugins install -l ...` flow for `openclaw-workflow-planner/` when working on the planner package.
Repeat the same package-local `pnpm install`, `pnpm build`, and `openclaw plugins install -l ...` flow for `openclaw-canon/` when working on the canon package.
Repeat the same package-local `pnpm install`, `pnpm build`, and `openclaw plugins install -l ...` flow for `openclaw-session-bloat-warning/` when working on the compaction-warning package.

For a Docker gateway with local plugin directories mounted into `/home/node/tools`, do not batch multiple linked installs inside one long-lived `docker exec ... sh -lc '...'` shell. A config-changing `openclaw plugins install -l ...` can trigger gateway reload and kill that shell after the first install.

Treat the batch reinstall flow as runtime-repo orchestration, not plugin-package canon. Use the helper or equivalent install/wait/verify loop from the Docker/OpenClaw runtime repo that owns the live `openclaw-gateway` container.

For a same-machine `Docker Gateway on macOS -> macOS host node -> local plugin path` setup, do not treat plugin install as the first step. The practical order is:

1. configure the local CLI profile with `gateway.remote.url`
2. set node-host auth with `OPENCLAW_GATEWAY_TOKEN` or `gateway.auth.token` for local-mode node install/run
3. approve the local CLI/operator pairing request on the gateway
4. install and connect the dedicated host node
5. build and install `openclaw-host-git-workflow`
6. enable the plugin and set `nodeSelector` when multiple eligible nodes exist

Token auth and pairing approval are separate gates in this flow. A valid token does not replace operator pairing approval, and host-node pairing can still require its own approval step after install/run.

Minimal same-machine Docker gateway bootstrap:

```bash
openclaw config set gateway.remote.url ws://127.0.0.1:18789
export OPENCLAW_GATEWAY_TOKEN="<gateway-token>"
openclaw devices list
openclaw devices approve <requestId>
openclaw node install --host 127.0.0.1 --port 18789 --display-name "openclaw-docker-host-git"
```

Recommended macOS hardening before routine use:

```bash
node -e 'const fs=require("fs"); const p=process.env.HOME+"/.openclaw/openclaw.json"; const raw=JSON.parse(fs.readFileSync(p,"utf8")); raw.browser ??= {}; raw.browser.enabled = false; raw.gateway ??= {}; raw.gateway.nodes ??= {}; raw.gateway.nodes.browser = { ...(raw.gateway.nodes.browser ?? {}), mode: "off" }; raw.nodeHost ??= {}; raw.nodeHost.browserProxy = { ...(raw.nodeHost.browserProxy ?? {}), enabled: false }; fs.writeFileSync(p, JSON.stringify(raw,null,2)+"\n");'
openclaw node restart
```

This reduces browser-related surface area, but it does not fully convert the generic `node` host into a strict system-only process from the perspective of macOS privacy prompts.

Registry install:

```bash
openclaw plugins install clawhub:@openclaw/openclaw-host-git-workflow
openclaw plugins install clawhub:@openclaw/openclaw-workflow-planner
openclaw plugins install clawhub:@openclaw/openclaw-canon
openclaw plugins install clawhub:@openclaw/openclaw-session-bloat-warning
```

## Verification

For `openclaw-host-git-workflow/`:

```bash
cd openclaw-host-git-workflow
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

For `openclaw-workflow-planner/`:

```bash
cd openclaw-workflow-planner
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

For `openclaw-canon/`:

```bash
cd openclaw-canon
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

For `openclaw-session-bloat-warning/`:

```bash
cd openclaw-session-bloat-warning
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

For publish workflow details and the manual pre-publish gate beyond CI minimum, use [docs/CLAWHUB_PUBLISH_PREFLIGHT.md](docs/CLAWHUB_PUBLISH_PREFLIGHT.md).

## Repo Facts

- The repo root does not ship a `package.json`, `pnpm-workspace.yaml`, or `openclaw.plugin.json`.
- Local development is pinned to Node `24.13.0` via `.nvmrc`.
- Repo-local planning scratch files belong only under ignored `.local-planning/`.
- The repo currently ships four publishable plugin packages: `openclaw-host-git-workflow/`, `openclaw-workflow-planner/`, `openclaw-canon/`, and `openclaw-session-bloat-warning/`.
- Product-level `openclaw node` install/runtime ownership belongs to OpenClaw product docs, not to an invented repo-local package surface.
- Package-structure and code-style canon now live in `docs/PLUGIN_PACKAGE_CANON.md` and `docs/PLUGIN_STYLE_CANON.md`.
- Repo-local host-lane boundary, node identity, and source-of-truth guidance now live directly in `docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md` plus the relevant live package docs.
- Repo-local publish/preflight guidance now lives in `docs/CLAWHUB_PUBLISH_PREFLIGHT.md`.
- The live plugin packages follow the broader local package canon, including domain-grouped runtime modules under `src/runtime/`, flat default tests under `src/test/`, required package docs/metadata, and package-local `.npmignore` so packed tarballs keep built `dist/**` artifacts despite the repo-root `dist/` ignore.
- In Docker-gateway setups, gateway token configuration and device pairing are separate gates; a valid `gateway.remote.token` does not replace CLI/operator pairing approval.
- On macOS, config hardening can reduce browser-related node surface, but a generic `node` host can still trigger unrelated TCC prompts unless you isolate it by user/session/VM/host.
