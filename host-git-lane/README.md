# Host Git Lane

Companion documentation for the external host lane used by `openclaw-host-git-workflow/`.

## What This Unit Is

- companion docs for the host-vs-container boundary
- canonical notes for host repo resolution and GitHub finish flow
- repo-local documentation for the product-level node identity contract

## What This Unit Is Not

- not a publishable plugin package
- not a skill package
- not a runtime bundle
- not a replacement for OpenClaw product docs

## Relation To Other Units

- `openclaw-host-git-workflow/` is the active standalone plugin package that owns bounded planning and the bounded host-backed finish flow
- the package exposes that bounded workflow through the single primary user-facing entrypoint `send_to_git` / `отправь в гит`
- `memory-hygiene/` and `source-of-truth-fix/` remain active skill-only packages unrelated to host execution runtime

## Required Host Identity Metadata

The product-level host lane should expose:
- stable instance or node id
- display name
- host name
- platform
- client type
- connection state
- disconnect reason when available

Operational expectation:
- normal host/node sessions should not remain `unknown` after a successful handshake
- disconnected entries should remain identifiable in history

## Release Policy

- `host-git-lane/` never enters a ClawHub publish batch
- this folder exists for operator clarity and repo canon only
