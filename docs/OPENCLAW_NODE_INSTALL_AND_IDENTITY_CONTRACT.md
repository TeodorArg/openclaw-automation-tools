# OpenClaw Node Install And Identity Contract

Date: 2026-04-16
Status: repo-local consolidation of the product-level node contract

This document puts one question in one place:
- what `openclaw node` is
- how it is installed
- how it relates to `host-git-lane/`
- which identity metadata it must expose to the gateway/UI

## Short Answer

`openclaw node` is a product-level host service, not a publishable plugin package from this repo.

For this repo:
- `openclaw-git-workflow/` is the publishable plugin package
- `openclaw-host-git-pr/` is a skill-only package
- `host-git-lane/` is the companion-layer documentation for the external host-backed execution path

Do not model `openclaw node` here as a fake plugin package unless a real standalone package source with its own manifests is found later.

## Official Install Surface

The official OpenClaw docs describe node installation as a product CLI/service flow.

Install as a background service:

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node restart
```

Run in the foreground:

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

Related node-management commands in official docs:

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes status
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

## What This Means For This Repo

Correct current modeling:
- installation of the node belongs to official OpenClaw product docs and CLI
- repo-local packages may depend on the host-backed lane
- repo-local packages do not currently ship the node service implementation

Incorrect modeling:
- inventing `host-git-lane/` as a plugin package
- inventing `package.json` or `openclaw.plugin.json` for the node lane without real canonical source
- claiming that this repo owns the product-level node runtime

## Relation To `host-git-lane/`

`host-git-lane/` exists because this repo still needs a stable local place to document:
- host-vs-container boundary
- repo resolution on the host
- GitHub auth and PR finish flow
- node identity metadata expectations for gateway/UI clarity

It is a companion layer, not a distribution artifact.

## Required Identity Metadata

For any host-backed node or client visible in gateway/UI, the lane should expose:
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
- disconnected sessions should still retain enough metadata to be distinguishable in history
- operators must be able to tell apart a real host node, a transient UI websocket client, and a failed handshake

## Why This Matters

Without stable metadata:
- the Instances UI falls back to weak labels like `unknown`
- host debugging becomes ambiguous
- disconnect history becomes hard to trust
- operators cannot safely reason about which host actually handled a job

## Current Known Gaps

Current repo-level conclusion:
- the documentation boundary is good enough
- the product/runtime implementation is still external to this repo
- the metadata contract is documented here, but not yet proven complete in the underlying node runtime

That means the current answer is:
- architecture classification: correct
- documentation coverage: now acceptable
- implementation completeness in the product runtime: still not proven complete

## When The Classification Would Change

Revisit this model only if canonical source later reveals a real standalone node package with:
- its own source root
- its own package manifests
- its own install/release boundary

Until then:
- keep `openclaw node` as a product/service concept
- keep `host-git-lane/` as documentation-only companion canon

## Sources

Official OpenClaw docs confirmed via Context7:
- `docs/nodes/index.md`
- `docs/cli/node.md`
- `docs/cli/nodes.md`
- `docs/cli/plugins.md`
- `docs/gateway/pairing.md`

Repo-local canon:
- [host-git-lane/README.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/host-git-lane/README.md)
- [host-git-lane/HOST_GIT_BOUNDARY.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/host-git-lane/HOST_GIT_BOUNDARY.md)
- [docs/OPENCLAW_NODE_METADATA_IMPLEMENTATION_CHECKLIST.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/OPENCLAW_NODE_METADATA_IMPLEMENTATION_CHECKLIST.md)
- [docs/SOURCE_INVENTORY.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/SOURCE_INVENTORY.md)
- [docs/REPO_REORG_PLAN.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/REPO_REORG_PLAN.md)
