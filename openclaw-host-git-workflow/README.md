# @openclaw/openclaw-host-git-workflow

## Host Git Workflow: Branch to Merge, Safely

Host-aware Git workflow for safe, structured repo changes.

`@openclaw/openclaw-host-git-workflow` turns vague “commit this and open a PR” requests into a bounded, branch-aware shipping flow for OpenClaw. It moves real repo work on a host machine through doctor, branch prep, push, PR, checks, merge, and `main` sync without falling back to arbitrary git shell chaos.

If you want an agent to ship code on a real repository with fewer wrong-branch, wrong-repo, and skipped-check mistakes, this plugin is the guarded path.

## What you get

- open a PR from the current non-main branch
- reuse or create the right PR into `main`
- wait for required checks before merge
- merge safely and sync local `main`
- fail early with concrete remediation when host GitHub readiness is not actually ready
- avoid arbitrary `git` / `gh` passthrough during shipping

## Who this is for

Use this if you already do real work in a host repo and want OpenClaw to help you ship it safely.

Good fit:
- agent-assisted coding on a real machine or paired host node
- repos where wrong-branch pushes or sloppy PR flow are painful
- teams or solo workflows that want a repeatable shipping lane

Not this plugin:
- a generic free-form git wrapper
- a shortcut around GitHub auth, SSH, or host setup
- a replacement for a real host repo execution surface

## 2-minute quickstart

1. Install the plugin:

```bash
openclaw plugins install clawhub:@openclaw/openclaw-host-git-workflow
```

2. Enable it and point it at the real host repo / host node:

```json5
{
  "plugins": {
    "entries": {
      "openclaw-host-git-workflow": {
        "enabled": true,
        "config": {
          "nodeSelector": "your-host-node",
          "hostRepoPath": "/absolute/path/to/your/repo"
        }
      }
    }
  }
}
```

3. In chat, say:

```text
send_to_git
```

Or in Russian:

```text
отправь в гит
```

## Example outcomes

- “Take my current branch, open a PR, wait for checks, merge it, and sync main.”
- “Check whether this repo is actually ready for safe push/PR from the host.”
- “Fail early and tell me the exact commands I need when SSH or GitHub auth is not ready.”

## Why this beats ad-hoc git from chat

- It is workflow-driven, not improvisation-driven.
- It is repo-aware and branch-aware before it touches shipping actions.
- It makes human checkpoints explicit through doctor, commit prep, validation, PR, and checks.
- It keeps host Git operations more predictable and easier to review.
- It leaves a cleaner audit trail than re-explaining git steps in every conversation.
- It scales better than ad-hoc prompting as tasks get more complex.

## Why install this

- ship from chat without giving the agent unrestricted git shell freedom
- reduce wrong-repo and wrong-branch mistakes
- turn shipping into a repeatable guarded flow instead of ad-hoc commands
- get precise doctor/preflight feedback before a push or PR fails halfway through

## Primary UX

The bundled skill surface is intentionally collapsed to one primary user-facing entrypoint:
- `send_to_git`
- `отправь в гит`

## What the workflow covers

This package currently ships:
- doctor for repo target, node binding, and host readiness
- repo-aware and branch-aware planning
- commit prep and confirmed-plan validation
- host preflight with concrete remediation when push/PR readiness is blocked
- bounded push of the current non-main branch
- bounded PR creation into `main`
- required-check waiting, merge, and local `main` sync

Under the hood, execution stays on the bound host node and follows a typed workflow instead of repo-local helper scripts or arbitrary shell passthrough.

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
- when push/PR readiness is blocked, fail early with a concrete host-side remediation list instead of attempting a blind remote action
- keep chain-of-thought and speculative step-by-step commentary out of the user-visible flow

## Canonical Docker SSH Audit Flow

When OpenClaw is running in Docker and remote readiness fails for GitHub SSH, use a fixed audit/remediation order instead of ad-hoc commands.

Recommended order:
1. confirm package health first, including tests
2. inspect runtime SSH surface under `/home/node/.ssh`
3. run `ssh -T git@github.com` and `git ls-remote --heads origin`
4. if the error is `Host key verification failed`, fix `known_hosts` first
5. retry the same checks
6. if the error becomes `Permission denied (publickey)`, inspect available keys and SSH config inside the runtime
7. if the user already has working GitHub SSH on the local machine, reuse that exact `IdentityFile` rather than inventing a new key name
8. for Docker, prefer copying the working keypair with `docker cp`
9. if SSH then reports `Load key ... Permission denied`, fix ownership and permissions inside the container before suggesting any new key generation
10. only treat remote readiness as restored after both `ssh -T git@github.com` and `git ls-remote --heads origin` succeed from the runtime user

Canonical container remediation shape:

```bash
docker exec <container> mkdir -p /home/node/.ssh
docker cp ~/.ssh/<working_github_key> <container>:/home/node/.ssh/id_ed25519
docker cp ~/.ssh/<working_github_key>.pub <container>:/home/node/.ssh/id_ed25519.pub
docker exec <container> sh -lc 'cat > /home/node/.ssh/config <<EOF
Host github.com
  HostName github.com
  User git
  IdentityFile /home/node/.ssh/id_ed25519
  IdentitiesOnly yes
EOF
ssh-keyscan github.com >> /home/node/.ssh/known_hosts'
docker exec -u 0 <container> sh -lc 'chown -R node:node /home/node/.ssh && chmod 700 /home/node/.ssh && chmod 600 /home/node/.ssh/id_ed25519 /home/node/.ssh/config /home/node/.ssh/known_hosts && chmod 644 /home/node/.ssh/id_ed25519.pub'
docker exec -u node <container> sh -lc 'HOME=/home/node ssh -T git@github.com'
docker exec -u node <container> sh -lc 'HOME=/home/node git -C /home/node/tools ls-remote --heads origin | sed -n "1,10p"'
```

This exact pattern was verified against the `openclaw-gateway` Docker container during a live audit. The real failure sequence was:
- missing `/home/node/.ssh` / `known_hosts`
- then `Permission denied (publickey)` after host trust was fixed
- then unreadable copied key due to ownership/permissions
- then successful SSH auth and `git ls-remote`

## Hard Boundaries

- no arbitrary shell passthrough
- no arbitrary `git` passthrough
- no arbitrary `gh` passthrough
- no git or GitHub authentication inside the runtime/container surface
- push and PR creation stay on the bound host node through `node.invoke` `system.run.prepare` / `system.run`
- push and PR creation must first pass bounded remote readiness checks for origin protocol, GitHub CLI auth, and when applicable SSH trust/auth to GitHub
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
          "nodeSelector": "openclaw-docker-host-git",
          "hostRepoPath": "/Users/svarnoy85/teodorArg/openclaw-automation-tools",
          "pathMappings": [
            {
              "containerPath": "/home/node/tools/openclaw-host-git-workflow",
              "hostPath": "/Users/svarnoy85/teodorArg/openclaw-automation-tools/openclaw-host-git-workflow"
            }
          ]
        }
      }
    }
  }
}
```

`hostRepoPath` is the canonical host-side repo path for bounded execution. When it is set, the plugin uses it ahead of `OPENCLAW_HOST_GIT_WORKFLOW_REPO` or `OPENCLAW_PROJECT_DIR`, so host-backed `git` and `gh` execution does not depend on a container-local default path. `pathMappings` is optional and only matters when discovery surfaces a container path that must be translated into a host path before execution.

## Chat-Driven Confirmed-Plan Flow

For chat-driven delivery after planning, the bounded execution surface now includes `execute_confirmed_plan`.

The flow is:

1. resolve repo target from plugin config and path mapping
2. bind a concrete connected host node
3. validate confirmed plan against the active repo
4. run bounded host preflight for repo, branch, remote, GitHub access, and existing PR readiness
5. push the current non-main branch to `origin`
6. create a PR into `main` or reuse the existing open PR for that branch

The consolidated result is designed for chat and reports one of these outcomes:

- `push success`: the current non-main branch was pushed to `origin` with upstream set
- `pr opened`: no open PR existed and a new PR into `main` was created
- `pr reused`: an open PR for the current branch into `main` already existed and was reused
- `blocked with remediation`: node binding, confirmed-plan matching, or preflight stopped execution and returned a structured blocker plus host-side remediation

## Verify

```bash
cd openclaw-host-git-workflow
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```
