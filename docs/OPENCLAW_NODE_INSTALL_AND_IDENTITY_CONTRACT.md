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
- `openclaw-host-git-workflow/` is the materialized standalone host-backed plugin package direction
- `openclaw-git-workflow/` is the current materialized plugin package and a legacy prototype/reference for reusable planning/runtime modules
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
- the self-contained package that should own that dependency boundary is `openclaw-host-git-workflow/`
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

## Implementation Checklist

This is the short runtime-gap checklist for the `unknown` instances problem.

### Minimum Acceptance Criteria

For a normal `openclaw node` connection, the gateway/UI should retain:
- stable instance id
- stable node id
- display name
- host name
- platform
- client type
- connection status
- disconnect reason when available
- last-seen timestamp or equivalent recency marker

UI acceptance:
- no normal approved node should remain `unknown` after a successful handshake
- a disconnected node entry should still remain identifiable in history
- rename flows should surface the updated display name

### 1. Handshake Payload

- ensure the node sends identity metadata during initial registration/handshake
- do not rely on later enrichment for required display fields
- treat `display-name`, `host name`, `platform`, and `client type` as first-class handshake fields

Done when:
- a fresh node connection immediately produces a labeled entry instead of `unknown`

### 2. Gateway Persistence

- persist enough node/instance metadata to survive disconnect events
- do not collapse disconnected entries to status-only rows
- keep disconnect reason attached to the same identifiable entry

Done when:
- a node that disconnects is still recognizable by name/host/platform in history

### 3. Display Name Rules

- honor `openclaw node install --display-name ...`
- honor `openclaw node run --display-name ...`
- honor post-pair rename via `openclaw nodes rename`
- avoid regressing back to raw ids once a display name exists

Done when:
- renamed nodes consistently show the current display name in UI and CLI

### 4. Host/Platform Resolution

- normalize host name capture
- normalize platform labeling
- avoid empty strings or placeholder values being rendered as missing metadata

Done when:
- the same host shows stable host/platform labels across reconnects

### 5. Client-Type Separation

- distinguish real node-host sessions from transient UI/websocket clients
- ensure client type is explicit in presence/state data
- avoid having UI infer node-vs-client purely from partial fields

Done when:
- operators can distinguish node hosts from ephemeral UI/control sessions

### 6. Presence API Quality

- verify `GET /system/presence` carries enough data for UI rendering, or ensure the UI can join it with richer node metadata
- if the API intentionally stays minimal, document the secondary metadata lookup path clearly

Done when:
- the Instances UI no longer depends on undocumented fallback heuristics to label nodes

### 7. Disconnect Reason Quality

- preserve disconnect reason when available
- differentiate expected shutdown, transport failure, handshake failure, and auth/pairing rejection when possible

Done when:
- disconnect rows are useful for debugging and not just generic `disconnected`

### Verification Commands

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw nodes status --connected
openclaw nodes list --connected --last-connected "24h"
openclaw nodes describe --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name "Renamed Node"
openclaw status
openclaw logs --follow
```

Presence verification:

```text
GET /system/presence
```

### Suggested Test Cases

1. Install a node with `--display-name "Build Node"` and confirm the first connected entry is labeled.
2. Disconnect and reconnect the same node and confirm host/platform/client-type remain stable.
3. Rename the node and confirm the new name appears in UI and `openclaw nodes describe`.
4. Force a disconnect and confirm the entry remains identifiable with a useful disconnect reason.
5. Open the UI/control session separately and confirm it is not confused with the node host session.

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
- `docs/cli/system.md`
- `docs/gateway/troubleshooting.md`

Repo-local canon:
- [host-git-lane/README.md](../host-git-lane/README.md)
- [host-git-lane/HOST_GIT_BOUNDARY.md](../host-git-lane/HOST_GIT_BOUNDARY.md)
