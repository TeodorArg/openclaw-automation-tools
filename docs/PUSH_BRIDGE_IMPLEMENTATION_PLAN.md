# Push Bridge Implementation Plan

This repo now keeps the push bridge implementation track next to the git-workflow track, but as a separate bounded package.

This later track was pulled forward during publication-prep work because GitHub SSH/runtime friction made push-path work a real blocker. It should not be mistaken for the public v1 surface of `openclaw-git-workflow`.

## Scope

The bounded host bridge currently covers two narrow actions:
- `push-current-branch`
- `create-pr-to-main`

It must not be mixed with:
- git grouping
- branch creation
- commit creation
- arbitrary shell execution
- generic gh passthrough

## Repo layout for this track

- `plugin-host-git-push/` — standalone plugin package for capability preflight plus host-jobs push bridge
- `skills/openclaw-host-git-push/` — skill entrypoint for bounded push behavior

## Current bridge contract

The bridge should:
- read capability preflight first
- treat `push` and `pr` as separate states
- avoid writing a push job when `push.ready !== true`
- avoid writing a PR job when `pr.ready !== true`
- return the short blocked remediation response from the relevant capability message instead of inventing a broader failure summary
- write only typed push/PR jobs into the host-jobs spool
- wait for `results/<jobId>.json`

The command contract must stay exact and intentionally small:
- accepted push write intent is only `push-current-branch`
- accepted PR write intent is only `create-pr-to-main`
- accepted read-only intents are only `inspect-capabilities` and `assert-pr-ready`
- skill provenance must stay exact per bounded skill (`openclaw-host-git-push` or `openclaw-host-git-pr`)
- raw `command` text is context/audit data from the skill layer, not an argument tunnel for arbitrary git flags, branch names, remotes, refs, or shell fragments
- `timeoutMs` only controls result waiting and must not redefine job semantics

## Core integration assumptions

The current implementation assumes the validated core-side helper path still lives in the OpenClaw core repo and exposes:
- `./scripts/openclaw-host-git.sh print-capabilities-json`
- `/home/node/.openclaw/host-jobs/git/{queue,results}`

Latest live nuance from the real macOS helper path:
- operator-facing helper scripts now load `.env` and accept both host paths like `/Users/...` and container paths like `/home/node/...`
- they normalize both through the same allowlisted repo keys
- typed jobs still keep canonical container-visible `repo.cwd` for the spool contract

## Current implementation status

What already exists in this repo now:
- `plugin-host-git-push/` package scaffold with plugin manifest, package metadata, TypeScript entrypoints, and bounded bridge tool implementations
- `skills/openclaw-host-git-push/SKILL.md` and `skills/openclaw-host-git-pr/SKILL.md` as narrow user-facing skill entrypoints
- capability preflight read through the validated core-side helper path
- typed `push_current_branch` job creation into the host-jobs spool
- typed `create_pull_request` job creation into the host-jobs spool
- result wait loop for `results/<jobId>.json`
- focused verification already green for blocked capability preflight, typed job creation, and result wait/timeout behavior
- local package verification currently green for `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`

Known gaps before this track should be treated as stable canon:
- verify through a live chat/runtime recheck that first-intent git/push/PR requests actually surface the short blocked alert end-to-end before any reinstall conclusion is made
- verify in future review passes that the exact command contract stays intentionally narrow and cannot drift into generic git or shell passthrough
- keep source-vs-generated artifact boundaries explicit if packaging or verification flows change
- keep the live PR-path story honest: a green host-backed readiness check and successful typed PR job enqueue do not guarantee PR creation if the head branch is not pushed or has no divergence from `main`

Latest live PR result:
- real macOS helper execution now reaches `gh pr create`
- current failure shape for `feat/host-git-push-bridge-package -> main` is downstream repo state, not helper/auth/path wiring
- GitHub returned: `Head sha can't be blank`, `Base sha can't be blank`, `No commits between main and feat/host-git-push-bridge-package`, and `Head ref must be a branch`

## Packaging decision

The package should stay a separate bounded installable unit for now, but remain private/internal.

Why this is the current canon:
- the bridge has a deliberately narrow scope that should not blur the main `openclaw-git-workflow` public v1 surface
- the main public release line is already defined as `@openclaw/openclaw-git-workflow`
- push-path behavior depends on host-jobs and validated host-side capability checks, so it should mature behind a separate package boundary first
- keeping it separate preserves a clean future option to publish, fold, or replace it later without redefining the main package contract now

## Source vs generated artifacts canon

Treat these as canonical source in the subtree:
- plugin manifest and package metadata
- TypeScript entrypoints and runtime/tool code
- tests
- tsconfig files
- bridge-surface and planning docs
- lockfile needed for reproducible local package work

Treat these as generated or local-only artifacts, not canonical review targets:
- `dist/`
- `node_modules/`
- temporary tarballs
- `.pack/` directories
- local extraction/install leftovers from manual verification

## Current next steps

1. keep the new plugin subtree buildable as a standalone package
2. keep the push/PR bridge tool contract exact and narrow
3. verify branch divergence and remote visibility for `feat/host-git-push-bridge-package` before retrying bounded PR creation
4. keep `plugin-host-git-push` private/internal unless a later packaging decision is made intentionally
5. later revisit packaging only if real operator demand or install ergonomics justify folding it into a broader public model
