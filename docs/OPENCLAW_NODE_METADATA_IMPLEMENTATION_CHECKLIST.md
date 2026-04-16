# OpenClaw Node Metadata Implementation Checklist

Date: 2026-04-16
Status: product/runtime gap checklist for the `unknown` instances problem

This is a short implementation checklist for the product-level `openclaw node` owner.
It is not a repo package spec. It is a handoff checklist for fixing gateway/UI identity quality.

## Goal

Make normal host-backed node sessions show stable, human-usable metadata in the Gateway/Instances UI instead of degrading to `unknown`.

## Problem Shape

Current failure mode:
- a node or client appears in Instances UI as `unknown`
- display name, platform, or client type are missing
- disconnect history may preserve only weak status lines

Practical result:
- operators cannot reliably tell which host connected
- transient UI/websocket clients and real host nodes blur together
- disconnect events are harder to debug

## Minimum Acceptance Criteria

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

## Implementation Checklist

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
- disconnect rows are useful for debugging and not just generic “disconnected”

## Verification Commands

Officially documented commands relevant to the fix:

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw nodes status --connected
openclaw nodes list --connected --last-connected "24h"
openclaw nodes describe --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name "Renamed Node"
```

Gateway-side verification:

```bash
openclaw status
openclaw logs --follow
```

Presence verification:

```bash
GET /system/presence
```

## Suggested Test Cases

1. Install a node with `--display-name "Build Node"` and confirm the first connected entry is labeled.
2. Disconnect and reconnect the same node and confirm host/platform/client-type remain stable.
3. Rename the node and confirm the new name appears in UI and `openclaw nodes describe`.
4. Force a disconnect and confirm the entry remains identifiable with a useful disconnect reason.
5. Open the UI/control session separately and confirm it is not confused with the node host session.

## Out Of Scope For This Repo

- implementing the node runtime itself
- redefining `host-git-lane/` as a plugin package
- treating the repo-local docs as proof that the product runtime is already fixed

## Sources

Official OpenClaw docs confirmed via Context7:
- `docs/nodes/index.md`
- `docs/cli/node.md`
- `docs/cli/nodes.md`
- `docs/cli/system.md`
- `docs/gateway/troubleshooting.md`

Repo-local supporting docs:
- [docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md)
- [host-git-lane/HOST_GIT_BOUNDARY.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/host-git-lane/HOST_GIT_BOUNDARY.md)
- [docs/PUBLISH_READINESS.md](/Users/svarnoy85/teodorArg/openclaw-git-workflow/docs/PUBLISH_READINESS.md)
