# ClawHub Publish Preflight

Date: 2026-04-18  
Status: current baseline after migration cleanup

## Active Publish Surfaces

The source of truth for the live publishable plugin package list is `docs/PLUGIN_PACKAGE_CANON.md`.

Plugin packages listed there and currently expected here in lockstep:
- `openclaw-host-git-workflow/`
- `openclaw-workflow-planner/`
- `openclaw-canon/`

Primary host-backed package entrypoint:
- `send_to_git` / `отправь в гит`

Planner package entrypoints:
- bundled skills `openclaw-workflow-planner`, `openclaw-workflow-research`, and `openclaw-workflow-implementer`
- typed tool `workflow_planner_action`

Canon package entrypoints:
- bundled skills `memory-hygiene` and `source-of-truth-fix`
- typed tools `canon_status`, `canon_doctor`, and `canon_fix`
- no standalone skill-only packages remain in the repo; this guidance now ships only through `openclaw-canon/`

Non-publishable repo docs:
- `README.md`
- `docs/CLAWHUB_PUBLISH_PREFLIGHT.md`
- `docs/PLUGIN_PACKAGE_CANON.md`
- `docs/PLUGIN_STYLE_CANON.md`
- `docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md`

## Plugin Checks

Before publishing, verify that CI covers every live publishable plugin package from `docs/PLUGIN_PACKAGE_CANON.md` and that each one runs the full plugin verification minimum through `pnpm pack:smoke`.

Run for `openclaw-host-git-workflow/`:

```bash
cd openclaw-host-git-workflow
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

Run for `openclaw-workflow-planner/`:

```bash
cd openclaw-workflow-planner
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

Run for `openclaw-canon/`:

```bash
cd openclaw-canon
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

Then verify:
- `package.json` and `openclaw.plugin.json` versions match
- manifest id/name/entry match the built package
- package `files` match the intended shipped artifact
- packed tarball contains the built `dist/**` artifacts required by the package entry surface
- no secrets or host-local paths leak into shipped files
- source provenance is ready

These checks extend beyond the CI verification minimum and remain an explicit manual pre-publish gate unless later automated in package scripts or CI.

Current runtime coverage to publish:
- setup doctor
- planning
- branch-aware planning
- explicit commit prep
- repo resolution
- live host node binding
- confirmed-plan validation
- host preflight
- bounded branch entry
- bounded push
- bounded PR creation
- bounded wait for required checks
- bounded merge
- bounded sync of local `main`

Current planning metadata to publish:
- branch suggestions identify the owning package slug or explicit repo surface
- commit titles identify the owning package slug or explicit repo surface
- PR titles remain informative because bounded PR creation reuses the latest commit subject

Current planner package coverage to publish:
- file-backed `WORKFLOW_PLAN.md` planner state
- idea creation and listing
- typed research attachment
- explicit `Idea Gate`
- accepted plan create and refresh
- plan snapshot and idea retrieval
- manual task tracking
- bounded implementation brief handoff
- idea closure

Current canon package coverage to publish:
- latest-known `canon_status` summary snapshots
- bounded `canon_doctor` scopes `source`, `memory`, and `sync`
- preview-first `canon_fix` for `memory`
- short-lived confirm-token previews in plugin-owned state
- bundled `memory-hygiene` and `source-of-truth-fix` instruction layers

## Commands

Plugin publish preflight:

```bash
clawhub package publish ./openclaw-host-git-workflow --dry-run
clawhub package publish ./openclaw-workflow-planner --dry-run
clawhub package publish ./openclaw-canon --dry-run
```

Plugin publish:

```bash
clawhub package publish ./openclaw-host-git-workflow
clawhub package publish ./openclaw-workflow-planner
clawhub package publish ./openclaw-canon
```

Notes:
- official ClawHub plugin publish accepts a `<source>` such as a local folder, `owner/repo`, `owner/repo@ref`, or a GitHub URL
- plugin identity and compatibility metadata must already be present in `package.json` / `openclaw.plugin.json`; do not rely on ad hoc publish flags for canonical package metadata
- prefer `--dry-run` on the current machine before the first real publish

## Blockers

- verify installed `clawhub` syntax on the current machine before the first real publish
- `clawhub whoami` must succeed
- first external install verification should be recorded before the first public release
