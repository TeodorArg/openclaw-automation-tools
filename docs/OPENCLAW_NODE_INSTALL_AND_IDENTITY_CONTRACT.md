# OpenClaw Node Install And Identity Contract

Date: 2026-04-17  
Status: repo-local consolidation of the product-level node contract

## Short Answer

`openclaw node` is a product-level host service, not a publishable package from this repo.

For this repo:
- `openclaw-host-git-workflow/` is the active host-backed plugin package
- `openclaw-workflow-planner/` is a separate planning-first plugin package and does not own node runtime implementation
- skill-only packages in this repo do not own node runtime implementation

## Gateway Vs Node Host

In this repo the canonical baseline is `gateway`, not a separate repo-owned `node host`.

- `openclaw-gateway` in Docker is the always-on Gateway/WebSocket runtime for OpenClaw
- `node host` is a separate headless OpenClaw node on the machine where the agent must actually execute `system.run` / `system.which`
- if a workflow needs local repos, host git, `ssh`, `gh`, push, PR creation, or required-check polling, run the node on that host machine instead of trying to make baseline `openclaw-gateway` own those capabilities

Why this split matters:
- the gateway accepts operator and node connections, stores pairing state, and coordinates runtime
- the node host connects to the gateway and exposes the command surface of its own machine
- the baseline of this repo is intentionally narrow and does not treat container-runtime `git push` or `PR creation` as the canonical path

## Official Install Surface

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node status
openclaw node restart
```

Foreground mode:

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

Official pairing + identity commands:

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

Notes:
- repo-local docs standardize on `openclaw devices list|approve|reject` for gateway-side pairing approval
- official OpenClaw CLI docs also still expose `openclaw nodes pending|approve|reject`; treat those as an alternate product CLI surface, not as a separate repo-owned node package

Service-management commands:

```bash
openclaw node status
openclaw node stop
openclaw node restart
openclaw node uninstall
```

## Minimal Host-Backed Flow

1. Start or reach a product-level `openclaw-gateway`; this repo does not ship the gateway or the node host service.
2. Install OpenClaw CLI on the machine that owns the target repos, credentials, and shell/toolchain surface.
3. Configure the local CLI profile with the gateway URL, and if the operator/CLI path needs remote auth, use the matching product-level CLI auth path.
4. If node-host auth is required, provide it through `OPENCLAW_GATEWAY_TOKEN` or local `gateway.auth.token`; in local mode the node host does not inherit `gateway.remote.token`.
5. Approve the local CLI/operator pairing request on the gateway.
6. Start a node host on that machine:

```bash
openclaw node run --host <gateway-host> --port 18789
```

Or install it as a background service:

```bash
openclaw node install --host <gateway-host> --port 18789
```

7. Approve node pairing on the gateway:

```bash
openclaw devices list
openclaw devices approve <requestId>
```

After that, the agent can execute commands on that host node while the gateway remains the coordination center.

If Docker gateway runs locally on the same machine, `gateway-host` is usually `127.0.0.1`.

### Same-Machine Docker Gateway Note

For a product-level `openclaw-gateway` running in Docker on the same machine as the host node, the practical bootstrap order is stricter than the short generic flow above:

1. confirm the gateway is reachable on `127.0.0.1:18789`
2. configure `gateway.remote.url` for the local CLI profile
3. provide node-host auth with `OPENCLAW_GATEWAY_TOKEN` or local `gateway.auth.token`; in local mode the node host does not inherit `gateway.remote.token`
4. approve the local CLI/operator pairing request from the gateway side
5. install or run the host node
6. approve the host node pairing request if it is separate from the already paired local device identity

Representative local commands:

```bash
openclaw config set gateway.remote.url ws://127.0.0.1:18789
export OPENCLAW_GATEWAY_TOKEN="<gateway-token>"
openclaw devices list
openclaw devices approve <requestId>
openclaw node install --host 127.0.0.1 --port 18789 --display-name "openclaw-docker-host-git"
```

Observed behavior from the local Docker/macOS path:

- valid node auth through `OPENCLAW_GATEWAY_TOKEN` or `gateway.auth.token` fixes `unauthorized`, but the local CLI can still fail with `pairing required` until the operator device itself is approved
- approving the exact pending `requestId` on the gateway side is more reliable than assuming `devices approve --latest` will complete approval non-interactively
- once paired, `openclaw nodes status` can show the local CLI identity before the dedicated host node is connected; do not treat that as proof that host-backed `system.run` is ready

### macOS Display Name Note

`openclaw node install --display-name "..."` sets the OpenClaw-visible node name used by:

- `openclaw nodes status`
- `openclaw nodes describe`
- plugin-side `nodeSelector`

It does not rename the underlying macOS Login Items or LaunchAgent process label. If the service runs through a generic `node` binary, macOS can still display it as `node` in system UI even though OpenClaw shows the configured display name.

### macOS Surface Hardening

If the host node is intended only for git-hosted workflows and you want to reduce browser-related surface area before routine use, apply this local config hardening:

```bash
node -e 'const fs=require("fs"); const p=process.env.HOME+"/.openclaw/openclaw.json"; const raw=JSON.parse(fs.readFileSync(p,"utf8")); raw.browser ??= {}; raw.browser.enabled = false; raw.gateway ??= {}; raw.gateway.nodes ??= {}; raw.gateway.nodes.browser = { ...(raw.gateway.nodes.browser ?? {}), mode: "off" }; raw.nodeHost ??= {}; raw.nodeHost.browserProxy = { ...(raw.nodeHost.browserProxy ?? {}), enabled: false }; fs.writeFileSync(p, JSON.stringify(raw,null,2)+"\n"); console.log(JSON.stringify({browser:raw.browser,gatewayNodesBrowser:raw.gateway.nodes.browser,nodeHostBrowserProxy:raw.nodeHost.browserProxy},null,2));'
openclaw node restart
```

What this changes:

- disables top-level browser capability wiring
- disables gateway node browser routing
- disables node-host browser proxy exposure

Important boundary:

- this reduces browser-related surface area and startup work
- it does not guarantee that the generic `node` process will never trigger unrelated macOS TCC prompts
- if strict isolation from unrelated macOS permission prompts is required, use a separate macOS user, VM, or dedicated machine for the host node

If the gateway is remote and bound to loopback, a remote node host cannot connect directly. Use an SSH tunnel and point the node host at the local tunnel endpoint instead:

```bash
ssh -N -L 18790:127.0.0.1:18789 user@gateway-host
export OPENCLAW_GATEWAY_TOKEN="<gateway-token>"
openclaw node run --host 127.0.0.1 --port 18790 --display-name "Build Node"
```

## Repo Interpretation

Correct current modeling:
- node installation belongs to OpenClaw product docs and CLI
- repo-local packages may depend on the host-backed lane
- `openclaw-host-git-workflow/` owns the plugin-side dependency boundary
- host-backed git and GitHub steps run on the bound host node, not inside an invented container-runtime lane
- repo-local host-lane boundary and source-of-truth notes live directly in this document plus the relevant live package docs

Incorrect modeling:
- inventing a fake node package in this repo
- adding fake `package.json` or `openclaw.plugin.json` for the node lane
- claiming this repo ships the product-level node host service

## Repo Resolution And Source Of Truth

When a workflow depends on host-backed execution:
- resolve the canonical repo from the configured host/project path first
- do not treat generated install metadata as canonical source
- do not treat `process.cwd()` as repo truth by default
- do not treat installed extension output under config roots as live source code

Practical boundary:
- do not authenticate `git` inside the runtime/container
- do not authenticate GitHub inside the runtime/container
- keep push and PR creation on the bound host node

## Platform Notes

Platform canon for node hosts in this repo:

- macOS is the normal supported path and is convenient when local repos plus git/SSH credentials already live on that Mac
- Windows is supported, but if your repos and toolchain live in `WSL2`, the node should run inside `WSL2` instead of mixing Windows and Linux path semantics in one target
- native Windows is valid when the repos and credentials really live in Windows, but approval policy, allowlists, and shell wrappers such as `cmd.exe /c ...` or `powershell -Command ...` need explicit attention

### Windows Note

For Windows, treat these as two separate modes:

- `WSL2` recommended: if your repos, `git`, `ssh`, `gh`, build tools, and shell live in `WSL2`, run `openclaw node` inside `WSL2` and keep Linux path semantics there
- native Windows: if your repos and credentials live in Windows, install OpenClaw in the Windows user environment and run the node there without mixing `C:\\...` and `/home/...` path expectations in one target

Typical native Windows install entrypoint:

```powershell
& ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
```

After installation, the runtime flow is the same:

```powershell
openclaw node run --host 127.0.0.1 --port 18789
```

Or:

```powershell
openclaw node install --host 127.0.0.1 --port 18789
```

Practical Windows rule:
- if runtime commands must operate on `WSL2` repos, paths, and tools, run the node in `WSL2`
- if runtime commands must operate on native Windows repos, paths, and tools, run the node in native Windows
- do not mix Windows and `WSL2` path expectations in one node target
- for native Windows, verify approval and allowlist policy carefully when commands are wrapped through `cmd.exe /c ...` or `powershell -Command ...`

## Host GitHub Finish Flow

Durable host-side flow for this repository:
1. create a dedicated branch
2. commit the bounded slice with canonical title and body
3. push the branch from the bound host lane
4. open the PR into `main`
5. wait for checks until green or a fix cycle is needed
6. merge into `main`
7. fast-forward local `main`

Auth guidance:
- preferred forge is GitHub
- preferred PR CLI is `gh`
- preferred host-side git auth is SSH
- verify SSH auth with `ssh -T git@github.com`

## Required Identity Metadata

For any host-backed node or client visible in gateway/UI, the repo-local lane model should preserve:
- stable instance id
- stable node id when applicable
- display name
- host name
- platform
- client type
- connection status
- disconnect reason when available

Operational expectation:
- normal host/node sessions should not remain `unknown` after a successful handshake
- disconnected entries should remain identifiable in history

## Verification Commands

```bash
openclaw nodes status --connected
openclaw nodes describe --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name "Renamed Node"
openclaw status
openclaw logs --follow
```
