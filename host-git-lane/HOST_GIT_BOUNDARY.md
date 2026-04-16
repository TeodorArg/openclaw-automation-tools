# Host Git Boundary

The host-backed git lane is outside the runtime/container surface of this repo.

## Canonical Boundary

- do not authenticate git inside the runtime/container
- do not authenticate GitHub inside the runtime/container
- do not describe push or PR creation as a runtime/container capability of the repo package units
- keep host-backed git and GitHub operations on the Mac host lane

## Practical Meaning

- package units may prepare branches, commits, readiness checks, or structured plans
- host-backed finish steps perform push and PR creation
- the host lane is explicit and separate, not an implied extension of the package runtime
- host/node identity metadata must be emitted by the product-level lane strongly enough for gateway/UI instance lists to show real labels instead of `unknown`

## Required Host/Node Identity Contract

For any host-backed node or client visible in the gateway/UI, the lane should expose:
- stable instance id
- display name
- host name
- platform
- client type
- connection status
- disconnect reason on close when available

This contract matters because:
- disconnected sessions still appear in the Instances UI
- missing handshake metadata degrades the UI into `unknown`
- operators need to distinguish real host nodes from transient UI/websocket clients

Repo-local constraint:
- this repo documents the requirement
- this repo does not currently own the product-level node runtime that must implement it

## Forbidden Drift

- do not turn this folder into a plugin package
- do not move installed runtime output here and call it source
- do not claim that container-side helper wiring is the canonical finish path
