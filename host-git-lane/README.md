# Host Git Lane

Companion folder for the host-backed git and GitHub finish path used by this repo family.

This is not a publishable plugin package and not a skill-only package.
It exists to keep the host-backed lane explicit without inventing a fake package root.

## What This Unit Is

- a companion-layer doc set for host-backed git and GitHub operations
- the boundary between repo-local package logic and the external host execution lane
- a local mirror of durable canon from the `OpenClaw` source family
- the place where required host/node identity metadata expectations are documented for the product-level lane

## What This Unit Is Not

- not `plugin-host-git-push`
- not a standalone publishable plugin package
- not a skill package
- not a local runtime implementation bundle

## Required Files

- `README.md`
- `HOST_GIT_BOUNDARY.md`
- `HOST_PATHS_AND_REPO_RESOLUTION.md`
- `GITHUB_AUTH_AND_PR_FLOW.md`
- `CANONICAL_REFS.md`

## Explicit Non-Files

- no `package.json`
- no `openclaw.plugin.json`
- no `openclaw.bundle.json`
- no fake build or test scaffold
- no copied installed runtime output

## Relation To Other Units

- `openclaw-host-git-workflow/` is the materialized standalone plugin package that already owns bounded planning, push, and PR runtime behavior and should absorb the remaining host-backed runtime/tool ownership over successive slices
- `openclaw-git-workflow/` remains the current materialized plugin package and a legacy prototype/reference for planning/runtime modules
- `openclaw-host-git-pr/` remains a skill-only package until its bounded PR contract is folded into the new plugin package
- this folder documents the host-backed finish lane those units depend on during and after that migration
- node install and runtime ownership stay product-level concerns outside this repo package surface
- the consolidated node install and identity contract lives in [docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md](../docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md)

## Required Host Identity Metadata

The host-backed lane must present stable instance metadata to the OpenClaw gateway/UI.

Minimum expected fields:
- stable instance or node id
- display name
- host name
- platform
- client type
- connection state
- disconnect reason when a session closes

Operational expectation:
- the UI should not fall back to generic `unknown` labels for normal host/node sessions once the handshake succeeds
- if a disconnected entry still appears in history, the metadata should remain inspectable after disconnect
- this is a product-level host-lane requirement, not a claim that this repo ships the runtime implementation

Release-policy implication:
- `host-git-lane/` never enters a ClawHub publish batch
- its metadata exists for operator clarity in gateway/UI and host execution debugging, not for registry publication
