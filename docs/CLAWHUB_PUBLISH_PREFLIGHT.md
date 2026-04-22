# ClawHub Publish Preflight

Date: 2026-04-22  
Status: current baseline after migration cleanup

## Active Publish Surfaces

The source of truth for the live publishable plugin package list is `docs/PLUGIN_PACKAGE_CANON.md`.

Plugin packages listed there and currently expected here in lockstep:
- `openclaw-host-git-workflow/`
- `openclaw-workflow-planner/`
- `openclaw-canon/`
- `openclaw-session-bloat-warning/`
- `openclaw-url-tailwind-scaffold/`

Primary host-backed package entrypoint:
- `send_to_git` / `отправь в гит`

Planner package entrypoints:
- bundled skills `openclaw-workflow-planner`, `openclaw-workflow-research`, and `openclaw-workflow-implementer`
- typed tool `workflow_planner_action`

Canon package entrypoints:
- bundled skills `canon-memory-hygiene`, `canon-source-of-truth-fix`, and `canon-ops-orchestrator`
- typed tools `canon_status`, `canon_doctor`, and `canon_fix`
- no standalone skill-only packages remain in the repo; this guidance now ships only through `openclaw-canon/`

Session-bloat warning package entrypoints:
- bundled skill `session-bloat-warning`
- official compaction lifecycle hooks `before_compaction` and `after_compaction`
- observe-only hooks `llm_input` and `llm_output`
- visible early-warning delivery on `before_agent_reply`
- operator diagnostics on `before_prompt_build`
- optional `session_bloat_status` tool

URL-tailwind scaffold package entrypoints:
- bundled skills `openclaw-url-tailwind-scaffold` and `openclaw-url-tailwind-scaffold-orchestrator`
- typed tool `url_tailwind_scaffold_action`
- working action `analyze_reference_page`
- in our custom skill host, the canonical user-facing invocation is `/skill openclaw-url-tailwind-scaffold <url-or-compact-json>`
- static fetch-backed acquisition for publicly reachable HTML pages is the only live source-backed mode in the current slice
- bounded static DOM/island extraction is available for shell landmarks when usable fetched HTML exists
- unmatched shell regions remain inferred placeholders when no confident static DOM landmark is found
- output may be either a Tailwind CSS v4 scaffold summary or a structured `page_contract`
- multi-step orchestration, subagent coordination, and file persistence remain outside the plugin boundary

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

Run for `openclaw-session-bloat-warning/`:

```bash
cd openclaw-session-bloat-warning
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

Run for `openclaw-url-tailwind-scaffold/`:

```bash
cd openclaw-url-tailwind-scaffold
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

Then confirm the following as explicit manual pre-publish checks when relevant:
- `package.json` and `openclaw.plugin.json` versions match
- manifest id matches package slug, plugin display name/package naming stay intentional, and runtime entrypoints stay in `package.json` `openclaw.extensions`
- package `files` match the intended shipped artifact
- packed tarball contains the built `dist/**` artifacts required by the package entry surface
- no secrets or host-local paths leak into shipped files
- source provenance is ready

## Release Boundary

A merged PR is not a package release by itself.

For this repo, treat a package release as the bounded sequence:
- release-scoped version alignment in the package manifests
- package verification minimum through `pnpm pack:smoke`
- merge to `main` and sync local `main`
- package-qualified git tag creation in the form `<package-slug>/vX.Y.Z`
- GitHub Release publication from that pushed tag
- a tracked release record under `docs/releases/<package-slug>/`

Default local agent behavior in this repo still centers the public release boundary on the package-qualified GitHub tag plus GitHub Release.
The release slice is not fully closed until verification is green, both versioned tracked release artifacts are backfilled, and the fresh package archive exists in the package directory for ClawHub handoff: `vX.Y.Z.md`, `vX.Y.Z.clawhub.md`, and the package-qualified `.tgz`.
Real ClawHub publish and manual archive upload remain optional operator steps unless the user explicitly asks for them.

Official OpenClaw publish guidance accepts a local folder, `owner/repo`, `owner/repo@ref`, or a GitHub URL as the package source, so GitHub Release objects are not required by ClawHub itself.
They are still required by this repo's public release policy because GitHub Releases are tag-backed, public, and auditable for a multi-package public repo.

## Release Lane

Use local `release-lane` for one package at a time when a release is being prepared or recorded.

Its bounded ownership is:
- align release-scoped versions across `package.json`, `openclaw.plugin.json`, and release-note artifacts
- run `node scripts/release-prep.mjs` for one live package at a time
- run or verify the package verification minimum
- preserve manual ClawHub operator instructions in package README and tracked release notes when they exist
- generate both `docs/releases/<package-slug>/vX.Y.Z.md` and `docs/releases/<package-slug>/vX.Y.Z.clawhub.md` for every plugin release
- build a fresh package archive from the release state and keep it in the package directory for every plugin release
- review release-facing marketing description and changelog quality before calling the package release-ready so README copy, package metadata, tracked release notes, and worksheet text stay aligned and operator-ready
- expand generated release scaffolds into public-ready notes before handoff so GitHub release text contains concrete shipped changes and ClawHub changelog text stays compact but specific
- do not close the release task until the GitHub Release exists and both tracked release files are backfilled with real tag-backed values, including GitHub Release URL plus `Source commit` and `Source ref`
- prepare the tracked Markdown text used for GitHub Release first, plus the mandatory companion ClawHub worksheet and the fresh package archive, and then any real manual ClawHub release or archive upload flow when explicitly needed
- draft the tracked release note file under `docs/releases/<package-slug>/`

Keep the live publishable package list in `docs/PLUGIN_PACKAGE_CANON.md`; do not move that ownership into the release lane.

## GitHub Release Lane

Use local `github-release-lane` after merge and local `main` sync for one package release at a time.

Its bounded ownership is:
- create and push one package-qualified tag in the form `<package-slug>/vX.Y.Z`
- verify that pushed tag before GitHub publication
- create the GitHub Release from that tag
- optionally use GitHub autogenerated release notes configured by `.github/release.yml`, then mirror or note that status in the tracked release file
- publish from the finalized tracked release note instead of an earlier scaffold snapshot
- if the tracked release note is backfilled after publication, update the GitHub Release body so it matches the tracked file
- return the GitHub Release URL and resolved tag commit to the tracked release note file

Do not collapse these steps into `pr-lane`; the GitHub Release flow is a separate public-release boundary, not part of PR merge mechanics.

## Tag Naming

In this multi-package repo, use package-qualified release tags:

- `<package-slug>/vX.Y.Z`

Examples:

- `openclaw-session-bloat-warning/v0.1.1`
- `openclaw-canon/v0.2.0`

Do not use ambiguous repo-wide tags such as `v0.1.1` because they collide across packages.

## Tracked Release Notes And Worksheets

For every plugin release, store a small tracked Markdown note at:

- `docs/releases/<package-slug>/vX.Y.Z.md`

And store a companion fill-in worksheet at:

- `docs/releases/<package-slug>/vX.Y.Z.clawhub.md`

That tracked note is the canonical GitHub Release note source in this repo and the durable release record for the package version. It should include at minimum:
- package slug
- released version
- release date
- tag name
- tag commit SHA
- GitHub Release URL
- whether GitHub autogenerated notes were mirrored or supplemented
- short user-facing summary
- verification evidence summary
- archive path
- source commit
- source ref
- source path when the tracked note carries it
- branch or PR reference when known
- publish target and operator notes
- evidence that marketing description and changelog copy were reviewed for this release and are specific to the shipped change set
- a concrete shipped-change section with at least two version-specific bullets unless the release truly contains only one meaningful change
- an operator-impact line that explicitly says `None.` when no manual action or migration is required

The companion worksheet should include at minimum:
- exact manual ClawHub release UI fields only
- package type
- package name
- display name
- owner/publisher
- changelog text
- source repo
- source commit
- source ref
- source path
- version
- a compact user-facing changelog that names the shipped changes in concrete terms and does not fall back to package-purpose copy

Quality bar for public release text:
- GitHub release notes should usually include a short summary plus 2-5 concrete shipped changes grouped in a scan-friendly way such as `Added`, `Fixed`, `Changed`, `Safety`, or `Operator impact`
- ClawHub changelog text should stay shorter than the GitHub notes, but still mention 2-4 concrete shipped changes or outcomes rather than one generic sentence
- do not publish release text that only says the package was updated, republished, or kept aligned unless that truly was the whole shipped change set
- do not leave the GitHub Release page on an older scaffold once tracked release notes were backfilled with final metadata or richer copy

For every plugin release in this repo, place the fresh built tarball in the package directory itself by default:
- `<package-slug>/<tarball-name>.tgz`

Do not treat temporary directories or repo-level scratch artifact folders as the canonical handoff location for the upload archive.

Keep a package release index at:
- `docs/releases/<package-slug>/README.md`

Use `docs/RELEASES.md` as the repo-level index and storage contract for these release artifacts.

For local linked installs into a Docker gateway or other separate runtime environment:
- do not rely on host-copied `node_modules` as the install-safe runtime tree
- do not assume a copied or linked plugin directory has a fresh built `dist/**` just because the package version matches; rebuild the package before the final install when runtime code changed after the last copied artifact or release
- if the plugin directory is copied into `/home/node/tools` or a similar runtime-local path, rebuild `node_modules` inside that target environment before the final linked install
- prefer `pnpm install --prod --frozen-lockfile --ignore-scripts` in the target environment so runtime dependencies are owned by the runtime user and dev-only host artifacts do not trigger ownership or safety-scan drift
- when reinstalling the same package version into a live runtime, prefer `openclaw plugins install --force ...` or a fresh tarball install so the runtime cannot retain an older built artifact under the same version string
- if a linked plugin install fails on suspicious ownership inside `node_modules`, treat that as packaging/install drift and repair the target-local dependency tree before publish or runtime validation is considered complete
- if several linked plugin reinstalls must be run against a live Docker gateway, do not batch them inside one long-lived `docker exec` shell because the first successful install can trigger a gateway reload and terminate the shell before later installs run
- run one `docker exec` per plugin and wait for the gateway to come back between installs; keep that helper in the Docker/OpenClaw runtime repo rather than hardcoding it into the plugin-packages repo

These checks extend beyond the CI verification minimum and remain an explicit manual pre-publish gate unless later automated in package scripts or CI.

Real ClawHub publication is not part of the default local-agent public-release closure unless the user explicitly asks for it, but the companion versioned ClawHub worksheet file and the fresh package archive are part of the default release artifact set for every plugin release.

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
- manual task add / done / remove / reopen tracking
- bounded implementation brief handoff
- idea closure

Current canon package coverage to publish:
- latest-known `canon_status` summary snapshots
- bounded `canon_doctor` scopes `source`, `memory`, and `sync`
- preview-first `canon_fix` for `memory` plus bounded `sync`
- short-lived confirm-token previews in plugin-owned state
- bundled `canon-memory-hygiene`, `canon-source-of-truth-fix`, and `canon-ops-orchestrator` instruction layers

Current session-bloat warning package coverage to publish:
- official compaction lifecycle coverage through `before_compaction` and `after_compaction`
- observe-only runtime signal capture on `llm_input` and `llm_output`
- visible early-warning delivery on `before_agent_reply`
- operator diagnostics on `before_prompt_build`
- optional `session_bloat_status` tool for compact JSON snapshots
- calm localized pre/post compaction and early-warning copy
- timeout/lane-pressure/no-reply runtime-risk signal reuse
- plugin-owned per-session dedupe and cooldown state
- bundled `session-bloat-warning` instruction layer

Current URL-tailwind scaffold package coverage to publish:
- typed tool `url_tailwind_scaffold_action`
- working action `analyze_reference_page`
- bundled skills `openclaw-url-tailwind-scaffold` and `openclaw-url-tailwind-scaffold-orchestrator`
- bounded static fetch-backed acquisition metadata including HTTP and document signals for a reference URL input
- normalized shell regions for `app-shell`, `sidebar`, `header`, `content`, and `footer`
- source-backed shell landmark extraction for matched static DOM regions
- synthesized Tailwind v4 token candidates and utility candidates remain bounded and inferred from shell structure rather than from donor CSS or computed styles
- normalized shell regions remain inferred only where no confident static DOM landmark is found
- bounded Tailwind CSS v4 scaffold summary or structured `page_contract` output
- packaged orchestration skill and artifact contract describe the outer workflow, while plugin boundary keeps actual multi-step orchestration, subagent coordination, and file persistence external-only
- raw slash-command dispatch through either a plain URL or a compact JSON payload

## Commands

Release prep automation:

```bash
node scripts/release-prep.mjs --package openclaw-session-bloat-warning --bump patch --date 2026-04-19 --summary "Short user-facing summary."
```

Package-qualified git tag:

```bash
git tag openclaw-session-bloat-warning/v0.1.1
git push origin openclaw-session-bloat-warning/v0.1.1
```

GitHub Release from the pushed tag:

```bash
gh release create openclaw-session-bloat-warning/v0.1.1 --verify-tag --title "openclaw-session-bloat-warning v0.1.1" --notes-file docs/releases/openclaw-session-bloat-warning/v0.1.1.md
```

Plugin publish preflight:

```bash
clawhub whoami
# if the installed clawhub CLI supports it:
clawhub package publish ./openclaw-host-git-workflow --dry-run
clawhub package publish ./openclaw-workflow-planner --dry-run
clawhub package publish ./openclaw-canon --dry-run
clawhub package publish ./openclaw-session-bloat-warning --dry-run
clawhub package publish ./openclaw-url-tailwind-scaffold --dry-run
```

Plugin publish:

```bash
clawhub package publish ./openclaw-host-git-workflow
clawhub package publish ./openclaw-workflow-planner
clawhub package publish ./openclaw-canon
clawhub package publish ./openclaw-session-bloat-warning
clawhub package publish ./openclaw-url-tailwind-scaffold
```

Notes:
- official ClawHub plugin publish accepts a `<source>` such as a local folder, `owner/repo`, `owner/repo@ref`, or a GitHub URL
- plugin identity and compatibility metadata must already be present in `package.json` / `openclaw.plugin.json`; do not rely on ad hoc publish flags for canonical package metadata
- prefer `--dry-run` on the current machine before the first real publish when the installed `clawhub` CLI supports that command surface
- GitHub says releases are based on Git tags, and GitHub supports autogenerated release notes plus `.github/release.yml` customization

## Blockers

- verify installed `clawhub` syntax on the current machine before the first real publish or preflight
- `clawhub whoami` must succeed
- first external install verification should be recorded before the first public release
