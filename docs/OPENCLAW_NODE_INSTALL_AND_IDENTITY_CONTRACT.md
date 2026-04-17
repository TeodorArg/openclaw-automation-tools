# OpenClaw Node Install And Identity Contract

Date: 2026-04-17  
Status: repo-local consolidation of the product-level node contract

## Short Answer

`openclaw node` is a product-level host service, not a publishable package from this repo.

For this repo:
- `openclaw-host-git-workflow/` is the active host-backed plugin package
- `host-git-lane/` is the companion docs layer for the external host lane
- skill-only packages in this repo do not own node runtime implementation

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

## Repo Interpretation

Correct current modeling:
- node installation belongs to OpenClaw product docs and CLI
- repo-local packages may depend on the host-backed lane
- `openclaw-host-git-workflow/` owns the plugin-side dependency boundary

Incorrect modeling:
- inventing a fake node package in this repo
- adding fake `package.json` or `openclaw.plugin.json` for the node lane
- claiming this repo ships the product-level node host service

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
