# OpenClaw Host Git PR

Skill-only package for bounded host-backed PR readiness checks and PR creation into `main`.

This package does not ship a local plugin runtime or bridge implementation. It ships only the skill contract and package-local publication files for the PR-oriented skill surface.

## What It Does

- exposes a bounded PR-oriented skill surface
- keeps PR readiness separate from push readiness
- treats PR creation as opening the current branch into `main`
- depends on an external host-backed lane rather than a package-owned runtime

## What It Does Not Do

- it does not ship `package.json`
- it does not ship `openclaw.plugin.json`
- it does not ship `src/` or runtime code
- it does not widen into arbitrary `gh` passthrough
- it does not claim ownership of the host-backed transport layer

## Supported Intents

- `git-pr ready`
- `git-pr create`
- `открой pr из текущей ветки в main`

## Runtime Boundary

This skill depends on the external host-backed lane documented by the repo-level companion-layer planning.
It does not bundle or imply a local bridge runtime inside this package.

## Preflight Expectations

- the current branch is the intended PR head
- the target base is `main`
- host-backed git and GitHub auth are already available
- PR capability preflight runs before any PR job is written
- blocked readiness stops the workflow before PR creation

## Manual Approval Boundary

- this skill is bounded to typed PR readiness and PR creation behavior
- it is not a generic shell or `gh` wrapper
- host-backed execution remains explicit outside a package-owned runtime

## Canonical Source

Current strongest source-of-truth for this package content:
- local installed skill copy: `/Users/svarnoy85/OpenClaw-config/extensions/openclaw-host-git-push/skills/openclaw-host-git-pr/SKILL.md`

Allowed historical rewrite input:
- git history `plugin-host-git-push/skills/openclaw-host-git-pr/SKILL.md`

## Publication Metadata Baseline

- slug: `openclaw-host-git-pr`
- display name: `OpenClaw Host Git PR`
- owner: `TeodorArg`
- version: `0.1.0`
- tags: `git`, `github`, `pr`, `host`
- license: `MIT-0`

Publish command baseline:

```bash
clawhub skill publish ./openclaw-host-git-pr --slug openclaw-host-git-pr --name "OpenClaw Host Git PR" --owner TeodorArg --version 0.1.0 --changelog "Initial standalone package release" --tags git,github,pr,host
```

Current publish-host note:
- official docs currently show `clawhub skill publish`
- the locally observed `clawhub v0.9.0` exposes top-level `clawhub publish`
- verify the installed CLI syntax on the publish host before the first real upload

## Package Contents

- `SKILL.md`
- `README.md`
- `LICENSE`

## Verification

- verify `SKILL.md` exists
- verify `LICENSE` exists and is `MIT-0`
- verify no `package.json` exists
- verify no `openclaw.plugin.json` exists
- verify no `src/` tree exists
- verify README keeps runtime boundary external to this package
