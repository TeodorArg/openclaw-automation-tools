# Repository Guidelines

## Scope

This repo is being reorganized into separate publishable units plus one companion layer.

Current accepted canon:
- `openclaw-git-workflow` remains the main plugin-plus-skill package.
- `memory-hygiene` is a skill-only package target.
- `source-of-truth-fix` is a skill-only package target.
- `openclaw-host-git-pr` is a skill-only package target.
- `host-git-lane/` is a companion folder, not a publishable plugin package by current evidence.
- legacy `plugin-host-git-push` is historical source input only.

Before changing structure, read:
- `docs/REPO_REORG_PLAN.md`
- `docs/SOURCE_INVENTORY.md`

## Source Of Truth

- Use current repo files as source of truth when they exist in the live tree.
- Use `docs/SOURCE_INVENTORY.md` to distinguish live source, installed runtime, historical git, derived config, and non-source paths.
- Do not treat installed extension output or `/home/node/repos/...` archive metadata as canonical source code.
- Do not treat `/Users/svarnoy85/teodorArg/openclaw-host-git-push/` as source; it is currently an empty non-source path.

## Reorg Execution Rule

- Move one unit per branch.
- Finish one unit end-to-end before starting the next one.
- Keep docs, package contents, and verification aligned in the same change set for that unit.
- Do not mix unrelated package migrations in one branch or one PR.

Preferred order:
1. `openclaw-git-workflow`
2. `memory-hygiene`
3. `source-of-truth-fix`
4. `openclaw-host-git-pr`
5. `host-git-lane/`

## Git Workflow

Follow the host-backed git guidance from `/Users/svarnoy85/teodorArg/OpenClaw/GIT_GUIDANCE.md`.

Repo-local execution rules:
- branch format: `<type>/<scope>-<short-kebab>`
- commit format: `<type>(<scope>): <short summary>`
- prefer commit body with one short intro line plus exactly 4 short bullets
- use one branch for one package/skill migration slice
- do not authenticate git or GitHub inside runtime/container
- push and PR happen on the host-backed lane only
- for this repo, host-backed finish is part of the same execution chain: if the slice is on its dedicated branch, committed, and local verification passed, continue with `git push` and then open a PR to `main`
<<<<<<< HEAD
- after opening a PR to `main`, check status once after 30 seconds; if checks are still `IN_PROGRESS`, poll every 15 seconds until they are green or a failing check needs a fix
=======
- after opening a PR to `main`, check status once after 20 seconds; if checks are still `IN_PROGRESS`, poll every 15 seconds until they are green or a failing check needs a fix
- before any `git push` for a migration slice, verify the resulting skill or plugin package shape against official OpenClaw docs and compare it with the local reference package `openclaw-git-workflow/` where that comparison is relevant
>>>>>>> d335c56 (feat(skills): package memory-hygiene skill)

Recommended scopes for this repo:
- `repo`
- `docs`
- `workflow`
- `skills`
- `plugin`
- `inventory`
- `packages`
- `agents`
- `git`

## Required Migration Loop

For each unit:
1. create a dedicated branch
2. move or create only the files for that unit
3. sync docs and inventory if boundaries changed
4. run the relevant verification
5. validate against official OpenClaw/ClawHub requirements and compare the resulting package shape against the local `openclaw-git-workflow/` reference when applicable
6. commit with canonical title/body
7. push branch
8. open PR to `main`
9. confirm PR checks are green
10. update local `main`
11. mark the completed slice in the plan/TODO if needed
12. start the next unit on a fresh branch

## Verification Minimum

For plugin packages:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `pnpm pack:smoke`

For skill-only packages:
- verify `SKILL.md` exists
- verify package-local `LICENSE` exists and matches publication target
- verify required publish metadata is present in docs/checklists
- verify no runtime code is implied unless it really exists

For `host-git-lane/`:
- verify docs/source references are canonical
- verify no fake `package.json` / `openclaw.plugin.json` is introduced
- verify boundary with runtime/container lane stays explicit

## Publication Guardrails

Skills:
- published skill packages must use `MIT-0`
- `SKILL.md` is required
- keep ClawHub validator requirements explicit in docs/checklists

Plugins:
- package shape must be real, not implied
- source provenance fields must be available for release
- do not invent compatibility metadata that is not backed by source

## Do Not

- Do not migrate multiple target units in one branch.
- Do not reintroduce `plugin-host-git-push` as a target package.
- Do not invent a publishable plugin package for `host-git-lane/`.
- Do not bundle runtime code into `openclaw-host-git-pr` unless a real live source owner is found first.
