# OpenClaw Node Install And Identity Contract

Date: 2026-04-17  
Status: repo-local consolidation of the product-level node contract

## Short Answer

`openclaw node` is a product-level host service, not a publishable package from this repo.

For this repo:
- `openclaw-host-git-workflow/` is the active host-backed plugin package
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
- host-backed git and GitHub steps run on the bound host node, not inside an invented container-runtime lane
- repo-local host-lane boundary and source-of-truth notes live directly in this document plus the active package docs

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
