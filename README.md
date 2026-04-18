# openclaw-automation-tools

Multi-package OpenClaw repository for one active host-backed plugin package and skill-only packages.

## Canon Docs

- [docs/PLUGIN_PACKAGE_CANON.md](docs/PLUGIN_PACKAGE_CANON.md)
- [docs/PLUGIN_STYLE_CANON.md](docs/PLUGIN_STYLE_CANON.md)

These documents define the active repo-level canon.
The active publishable plugin package now matches the current runtime/test layout canon.

## Current Repo Map

| Path | Current shape | Purpose |
| --- | --- | --- |
| [openclaw-host-git-workflow/README.md](openclaw-host-git-workflow/README.md) | publishable plugin-plus-skill package | Active bounded host-backed git/GitHub workflow package |
| [memory-hygiene/README.md](memory-hygiene/README.md) | skill-only package | Memory maintenance skill package |
| [source-of-truth-fix/README.md](source-of-truth-fix/README.md) | skill-only package | Source-of-truth repair skill package |

## Active Package Direction

`openclaw-host-git-workflow/` is the only active plugin package in this repo.
Its bundled skill surface is intentionally collapsed to one primary user-facing entrypoint: `send_to_git` / `отправь в гит`.

Its current shipped slice covers:
- repo-aware planning
- branch-aware planning
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

Its runtime layout is currently grouped under `src/runtime/host/`, `src/runtime/node/`, `src/runtime/planning/`, and `src/runtime/repo/`, with flat default tests under `src/test/`.

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

For a same-machine `Docker Gateway on macOS -> macOS host node -> local plugin path` setup, do not treat plugin install as the first step. The practical order is:

1. configure the local CLI profile with `gateway.remote.url` and `gateway.remote.token`
2. approve the local CLI/operator pairing request on the Docker gateway
3. install and connect the dedicated host node
4. build and install `openclaw-host-git-workflow`
5. enable the plugin and set `nodeSelector` when multiple eligible nodes exist

Minimal same-machine Docker gateway bootstrap:

```bash
openclaw config set gateway.remote.url ws://127.0.0.1:18789
openclaw config set gateway.remote.token "<gateway-token>"
docker exec openclaw-gateway node dist/index.js devices list
docker exec openclaw-gateway node dist/index.js devices approve <requestId>
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

For each skill-only package, verify:
- `SKILL.md` exists
- `README.md` exists
- `LICENSE` exists
- no `package.json`
- no `openclaw.plugin.json`
- no runtime code is implied unless it exists

## Repo Facts

- The repo root does not ship a `package.json`, `pnpm-workspace.yaml`, or `openclaw.plugin.json`.
- Local development is pinned to Node `24.13.0` via `.nvmrc`.
- Repo-local planning scratch files belong only under ignored `.local-planning/`.
- Product-level `openclaw node` install/runtime ownership belongs to OpenClaw product docs, not to an invented repo-local package surface.
- Package-structure and code-style canon now live in `docs/PLUGIN_PACKAGE_CANON.md` and `docs/PLUGIN_STYLE_CANON.md`.
- Repo-local host-lane boundary, node identity, and source-of-truth guidance now live directly in `docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md` plus the active package docs.
- The active `openclaw-host-git-workflow/` package now uses domain-grouped runtime modules under `src/runtime/` and flat default tests under `src/test/`, in line with the tracked package canon.
- In Docker-gateway setups, gateway token configuration and device pairing are separate gates; a valid `gateway.remote.token` does not replace CLI/operator pairing approval.
- On macOS, config hardening can reduce browser-related node surface, but a generic `node` host can still trigger unrelated TCC prompts unless you isolate it by user/session/VM/host.
