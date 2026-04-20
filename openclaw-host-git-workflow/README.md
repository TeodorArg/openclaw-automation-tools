# @openclaw/openclaw-host-git-workflow

Safe agent-driven git and PR delivery.

`@openclaw/openclaw-host-git-workflow` gives OpenClaw a disciplined way to move from local changes to shipped work. It helps agents and operators branch safely, prepare commits, open PRs, wait for checks, merge cleanly, and sync `main` without turning git execution into unrestricted shell chaos.

It is built for environments where OpenClaw coordinates the workflow, while the actual git and GitHub actions run on a paired host node that already has the repo, auth, and local execution surface. That keeps the delivery path strong and practical without pretending the container is the host.

## Why install this

- Ship through git with more trust and fewer manual mistakes.
- Give agents a bounded path through branch, PR, checks, and merge.
- Reduce workflow confusion around delivery, repo state, and PR completion.
- Bring more discipline to agent-assisted shipping.

## Common use cases

- Turn a finished local slice into a clean PR and merge flow.
- Use a safer delivery path instead of improvising git operations in chat.
- Standardize branch, PR, checks, and merge sequencing for agent work.
- Support real shipping on host-backed repos with more confidence.

## One-line example request

`Safely take this change from branch setup to PR, checks, merge, and main sync.`

## Primary UX

The bundled skill surface is intentionally collapsed to one primary user-facing entrypoint:
- `send_to_git`
- `отправь в гит`

## Current Runtime Coverage

This package currently ships:
- setup doctor for repo target, node binding, and host readiness
- repo-aware planning
- branch-aware planning
- explicit commit prep for ownership grouping and commit contracts
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
Commit prep now exposes the current-state matrix, the tested bounded flow, and the recommended small-session choreography so the package can act as an execution kernel without collapsing everything into one giant session.

## Recommended Session Flow

Use the package as a short-session chain:

1. `doctor`
2. `plan_with_branches`
3. `commit_prep`
4. `validate_confirmed_plan`
5. `enter_branch`
6. `preflight`
7. `push_branch`
8. `create_pr`
9. `wait_for_checks`
10. `merge_pr`
11. `sync_main`

If the merged slice changed shipped truth, run docs sync as a separate follow-up session after the bounded execution kernel finishes.

## Execution Behavior

For live verification requests such as `проверь работает ли плагин openclaw-host-git-workflow` or `нужен полный цикл`, the bundled skill should normalize that phrasing to the same canonical `send_to_git` intent and start the bounded chain immediately.

Routine bounded steps are expected to behave proactively:
- do the work first
- do not narrate each upcoming probe or tool call
- only emit a short user update when a major phase changes or a real blocker appears
- keep chain-of-thought and speculative step-by-step commentary out of the user-visible flow

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

### macOS Hardening Note

For a git-only host-node path on macOS, reduce browser-related surface area before relying on the node for routine use:

```bash
node -e 'const fs=require("fs"); const p=process.env.HOME+"/.openclaw/openclaw.json"; const raw=JSON.parse(fs.readFileSync(p,"utf8")); raw.browser ??= {}; raw.browser.enabled = false; raw.gateway ??= {}; raw.gateway.nodes ??= {}; raw.gateway.nodes.browser = { ...(raw.gateway.nodes.browser ?? {}), mode: "off" }; raw.nodeHost ??= {}; raw.nodeHost.browserProxy = { ...(raw.nodeHost.browserProxy ?? {}), enabled: false }; fs.writeFileSync(p, JSON.stringify(raw,null,2)+"\n"); console.log(JSON.stringify({browser:raw.browser,gatewayNodesBrowser:raw.gateway.nodes.browser,nodeHostBrowserProxy:raw.nodeHost.browserProxy},null,2));'
openclaw node restart
```

This hardening reduces browser-routing and browser-proxy surface area, but it does not guarantee that macOS will never show TCC prompts for the generic `node` process. If you need hard isolation from unrelated macOS permission prompts, run the host node under a separate macOS user, VM, or dedicated machine.

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

If this package is copied into a separate runtime environment such as a Docker gateway under `/home/node/tools/openclaw-host-git-workflow`, do not trust the copied host `node_modules` tree as install-safe runtime state.

Use this runtime-local repair path before the final linked install:

```bash
cd /home/node/tools/openclaw-host-git-workflow
rm -rf node_modules
pnpm run install:runtime-safe
openclaw plugins install -l /home/node/tools/openclaw-host-git-workflow
```

This package ships `dist/**`, `openclaw.plugin.json`, `skills/**`, `README.md`, and `LICENSE` as the canonical plugin surface. A host-copied dev `node_modules` tree is not part of that shipped surface and can trigger ownership or safety-scan drift when the target runtime user differs from the host uid/gid.

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
