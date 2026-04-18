# @openclaw/openclaw-host-git-workflow

Publishable OpenClaw plugin package for the active bounded host-backed git/GitHub workflow.

## Primary UX

The bundled skill surface is intentionally collapsed to one primary user-facing entrypoint:
- `send_to_git`
- `отправь в гит`

## Current Runtime Coverage

This package currently ships:
- repo-aware planning
- branch-aware planning
- repo resolution
- live host node binding
- host preflight
- bounded branch entry from `main` or another clean local branch into a requested non-main working branch
- confirmed-plan validation
- bounded push of the current non-main branch
- bounded PR creation into `main`
- bounded wait for required checks
- bounded merge of the current branch PR into `main`
- bounded sync of local `main` from `origin/main`

Shell execution now runs on the bound host node through `node.invoke` `system.run.prepare` / `system.run`, not through an unbound selector placeholder and not through repo-local helper scripts outside the package.

Branch-aware planning output now generates branch suggestions and commit titles that identify the owning package or repo surface, so downstream PR titles derived from the latest commit stay informative at merge time.

## Hard Boundaries

- no arbitrary shell passthrough
- no arbitrary `git` passthrough
- no arbitrary `gh` passthrough
- no git or GitHub authentication inside the runtime/container surface
- push and PR creation stay on the bound host node through `node.invoke` `system.run.prepare` / `system.run`
- branch entry is bounded to a validated non-main local branch name
- branch entry may carry uncommitted changes only for `main -> new local branch` creation
- push is bounded to the current local non-main branch and `origin`
- PR creation is bounded to the current local non-main branch into `main`
- checks waiting is bounded to required checks for the current branch PR into `main`
- merge is bounded to the current branch PR into `main` with HEAD SHA matching
- sync-main is bounded to a clean worktree and `origin/main`
- repo resolution must come from the canonical configured host repo path rather than installed extension output or implicit cwd assumptions

## Runtime Requirement

This plugin does not turn the baseline Gateway container into a host git runtime.

- `openclaw-gateway` remains the coordination layer
- host-backed commands run on a bound OpenClaw node host through `node.invoke` `system.run.prepare` / `system.run`
- if you want access to local repos, `git`, `ssh`, `gh`, push, PR creation, or checks on a real machine, start `openclaw node` on that machine and pair it to the gateway first

For a local Docker Gateway plus local macOS host-node experiment, there are two separate prerequisites before this plugin can execute real host-backed actions:

1. pair the local OpenClaw CLI/operator profile to the Docker gateway
2. pair and connect the dedicated host node that will expose `system.run`

Setting `gateway.remote.url` plus `gateway.remote.token` only fixes gateway authentication. It does not auto-approve the local CLI/operator device. A fresh local CLI profile can still fail with `pairing required` until the gateway approves that device request.

Minimal host-backed flow:

```bash
openclaw node run --host <gateway-host> --port 18789
```

Or install it as a background service:

```bash
openclaw node install --host <gateway-host> --port 18789
```

Approve pairing on the gateway:

```bash
openclaw devices list
openclaw devices approve <requestId>
```

If the gateway is remote and bound to loopback, the node host cannot connect directly; use the SSH-tunnel flow documented in [../docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md](../docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md).

### Local Docker Gateway Quickstart

If `openclaw-gateway` runs in Docker on the same machine and your local CLI is not yet paired, the practical order is:

1. set the local CLI profile to the Docker gateway and copy the gateway token into `gateway.remote.token`
2. create and approve the local CLI/operator pairing request on the gateway
3. install and connect the dedicated host node
4. install and enable this plugin

Typical Docker-side pairing flow:

```bash
openclaw config set gateway.remote.url ws://127.0.0.1:18789
openclaw config set gateway.remote.token "<gateway-token>"
docker exec openclaw-gateway node dist/index.js devices list
docker exec openclaw-gateway node dist/index.js devices approve <requestId>
openclaw node install --host 127.0.0.1 --port 18789 --display-name "openclaw-docker-host-git"
```

Operational notes:

- prefer approving the exact `requestId` from the gateway side instead of relying on `--latest`
- `--display-name` affects the OpenClaw-visible node identity used by `openclaw nodes status`, pairing diagnostics, and this plugin's `nodeSelector`
- on macOS, the LaunchAgent/Login Items UI can still show the underlying runtime as generic `node`; that system label does not override the OpenClaw node display name

## Install

```bash
openclaw plugins install clawhub:@openclaw/openclaw-host-git-workflow
```

Local development:

```bash
nvm use || nvm install
cd openclaw-host-git-workflow
pnpm install
pnpm build
cd ..
openclaw plugins install -l ./openclaw-host-git-workflow
```

Enable the plugin in `openclaw.json` and set `config.nodeSelector` when more than one eligible host node may be visible:

```json5
{
  "plugins": {
    "entries": {
      "openclaw-host-git-workflow": {
        "enabled": true,
        "config": {
          "nodeSelector": "openclaw-docker-host-git"
        }
      }
    }
  }
}
```

## Verify

```bash
cd openclaw-host-git-workflow
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```
