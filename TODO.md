# TODO

## Active

### Repackage custom skills/plugins into publishable per-package folders under `/Users/svarnoy85/teodorArg/openclaw-git-workflow/`

Goal:
- restructure the target repo so each custom skill/plugin gets its own subfolder, prepared for build/test/publish, following the reference shape now materialized in `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow`
- this must explicitly include the mac-node/host-backed lane as its own separate companion folder `host-git-lane/`, not left implicit or mixed into another package
- add a short top-level index/README that links to each package folder and explains what it contains
- make the packages complete, with any needed bundled skills/instructions/docs carried over from current project canon
- current execution state: `openclaw-git-workflow` slice is complete in `main`; `memory-hygiene` slice is in progress on `feat/skills-memory-hygiene-package`

#### Phase 0, source inventory and source-of-truth map
- [ ] Inventory every file currently belonging to:
  - `memory-hygiene`
  - `source-of-truth-fix`
  - `openclaw-git-workflow`
  - `openclaw-host-git-pr`
  - `host-git-lane`
  - legacy `openclaw-host-git-push` installed/runtime package as historical source reference only
- [ ] Separate live source files from historical notes, templates, workspace copies, generated output, and repo-only docs.

##### Current known live locations, container/workspace side
- [ ] `memory-hygiene`
  - live workspace skill: `/Users/svarnoy85/OpenClaw-workspace/skills/memory-hygiene/SKILL.md`
  - template copy: `/Users/svarnoy85/teodorArg/OpenClaw/templates/skills/memory-hygiene/SKILL.md`
  - repo workspace seed copy: `/Users/svarnoy85/teodorArg/OpenClaw/workspace/skills/memory-hygiene/SKILL.md`
  - local package folder now exists at `/Users/svarnoy85/teodorArg/openclaw-git-workflow/memory-hygiene/`
- [ ] `source-of-truth-fix`
  - shared installed skill: `/home/node/.openclaw/skills/source-of-truth-fix/SKILL.md`
- [ ] `openclaw-git-workflow`
  - verified live repo root on Mac: `/Users/svarnoy85/teodorArg/openclaw-git-workflow/`
  - verified package root on Mac: `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/`
  - verified current live files include:
    - `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/openclaw.plugin.json`
    - `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/package.json`
    - `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/index.ts`
    - `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/README.md`
    - `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/EXECUTE_SURFACE.md`
    - `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/skills/openclaw-git-workflow/SKILL.md`
    - `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/src/git-workflow-tool.ts`
    - `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/src/index.ts`
    - `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/src/runtime/intent-routing.ts`
    - `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/src/runtime/plan-groups.ts`
    - `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/src/runtime/validate-confirmed-plan.ts`
    - related tests under `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/src/**/*.test.ts`
- [ ] `openclaw-host-git-pr`
  - installed skill currently exists at `/home/node/.openclaw/extensions/openclaw-host-git-push/skills/openclaw-host-git-pr/SKILL.md`
  - canonical rewrite input is installed skill plus historical git source
  - final package shape is fixed as skill-only package
- [ ] legacy `openclaw-host-git-push` reference state
  - installed package exists at `/home/node/.openclaw/extensions/openclaw-host-git-push/`
  - plugin inspect records source archive `~/repos/openclaw-git-workflow/plugin-host-git-push/.pack/openclaw-openclaw-host-git-push-0.1.0.tgz`
  - host path `/Users/svarnoy85/teodorArg/openclaw-host-git-push/` currently exists but is empty, so it is not a verified live source repo
  - use this package only as historical/runtime reference until the real canonical source path is found
- [ ] `host-git-lane`
  - classification is fixed as companion adapter/service layer, not standalone publishable plugin package
  - current source family is `OpenClaw` docs/config plus related host workflow canon
  - exact local mirrored file set is now documented in `docs/MIGRATION_TABLES.md`
- [ ] Identify the canonical source repo/path for each item.
- [ ] Record which items currently exist only in workspace, only in shared `~/.openclaw/skills`, only in another repo, or in multiple duplicated locations.
- [ ] Record every dependent file that may also need migration:
  - `SKILL.md`
  - `openclaw.plugin.json`
  - `package.json`
  - `index.ts` / runtime entrypoints
  - `src/**`
  - tests
  - README/docs
  - fixtures/examples
  - install/build scripts

#### Phase 1, target package topology design
- [x] Propose the new top-level repo tree for `/Users/svarnoy85/teodorArg/openclaw-git-workflow/`, with one subfolder per package.
- [x] Decide exact folder names for each package.
- [x] Decide which packages are skill-only, plugin-only, or plugin-plus-bundled-skill.
- [ ] Decide whether shared docs/examples/test helpers need a common workspace folder versus package-local copies.
- [x] Define a top-level README/index format that lists every package with a one-line description and path link.
- [ ] Define what “prepared for publish” means for each package:
  - manifest completeness
  - build scripts
  - test scripts
  - README
  - packaged files/include list
  - versioning/release notes placeholders
  - install instructions

#### Phase 2, reference-shape comparison against the existing `openclaw-git-workflow/` package
- [ ] Audit `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow` as the packaging reference.
- [ ] Extract the reusable baseline shape:
  - root files
  - src layout
  - test layout
  - docs layout
  - package metadata
  - build/test scripts
- [ ] Mark which parts of that shape should be copied to all new packages and which are plugin-specific only.
- [ ] Note any current flaws/drift in the reference package so we do not blindly copy broken structure.

#### Phase 3, package-by-package migration plan
- [x] `memory-hygiene`: define target folder, whether it stays skill-only or gets package metadata, and which docs/instructions must ship with it.
- [ ] `source-of-truth-fix`: define target folder, whether it stays skill-only or gets package metadata, and which helper-agent/tooling instructions must be documented.
- [ ] `openclaw-git-workflow`: define final package contents, shipped skill path, plugin runtime files, docs, and tests.
- [ ] `openclaw-host-git-pr`: implement the settled skill-only package file set:
  - `SKILL.md`
  - `README.md`
  - `LICENSE`
  - optional `.gitignore` only if actually needed
- [ ] legacy `openclaw-host-git-push`: define exactly which parts remain reference-only input for extraction, comparison, or rewrite, and which parts must not return as a target package.
- [x] `host-git-lane`: implement the settled companion-folder file set:
  - `README.md`
  - `HOST_GIT_BOUNDARY.md`
  - `HOST_PATHS_AND_REPO_RESOLUTION.md`
  - `GITHUB_AUTH_AND_PR_FLOW.md`
  - `CANONICAL_REFS.md`
  - optional `examples/`, `schemas/`, `scripts/README.md` only if directly justified
- [x] For each package, write a file mapping table:
  - current path
  - target path
  - action (`move`, `copy`, `rewrite`, `drop`, `merge`, `generate`)
  - reason/source-of-truth note

#### Phase 4, docs and instruction completeness
- [ ] Check OpenClaw official docs for the canonical package manifest and extension shape.
- [ ] Check official docs/examples for skill packaging and bundled-skill expectations.
- [ ] Decide what repo-only docs stay at top level versus what package-specific docs must move into each package.

##### Instruction/doc carry-over plan to define per package
- [ ] `memory-hygiene`
  - carry the skill instructions from `/Users/svarnoy85/OpenClaw-workspace/skills/memory-hygiene/SKILL.md`
  - review whether related canon pointers from `/Users/svarnoy85/OpenClaw-workspace/MEMORY.md`, `/Users/svarnoy85/OpenClaw-workspace/AGENTS.md`, and `/Users/svarnoy85/OpenClaw-workspace/USER.md` need package README excerpts or references
  - review whether template/seed copies under `/Users/svarnoy85/teodorArg/OpenClaw/templates/skills/memory-hygiene/` and `/Users/svarnoy85/teodorArg/OpenClaw/workspace/skills/memory-hygiene/` should be documented as downstream copies rather than treated as source
- [ ] `source-of-truth-fix`
  - carry the skill instructions from `/home/node/.openclaw/skills/source-of-truth-fix/SKILL.md`
  - document the expected TODO-first workflow and official-doc/source-of-truth lookup order
  - review whether `build-safe-fixer` agent assumptions need package documentation, but do not blindly ship agent-local config as package content
- [ ] `openclaw-git-workflow`
  - carry packaged skill instructions from `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/skills/openclaw-git-workflow/SKILL.md`
  - carry package docs from:
    - `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/README.md`
    - `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/EXECUTE_SURFACE.md`
  - carry runtime/package source from:
    - `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/openclaw.plugin.json`
    - `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/package.json`
    - `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/index.ts`
    - `/Users/svarnoy85/teodorArg/openclaw-git-workflow/openclaw-git-workflow/src/**`
  - exclude generated output under `dist/` and dependency trees under `node_modules/`
- [ ] `openclaw-host-git-pr`
  - carry its `SKILL.md` from installed/historical canonical inputs
  - ship it as a skill-only package with stable contract docs and no local runtime code
  - do not add `package.json`, `openclaw.plugin.json`, `src/**`, or copied `dist/**`
  - specifically capture PR command surface, bridge/runtime boundaries, auth assumptions, and supported limitations
  - keep operational/historical notes out of the shipped package unless rewritten into stable README language
- [ ] legacy `openclaw-host-git-push`
  - treat installed package plus git history as reference material, not as an automatic target package
  - extract only the durable push/PR contract wording, tool names, and runtime boundary notes that are still needed for `openclaw-host-git-pr` or the future mac-node unit
  - do not treat the currently empty `/Users/svarnoy85/teodorArg/openclaw-host-git-push/` path as canonical source
- [x] `host-git-lane`
  - carry canonical host-workflow/helper docs from `OpenClaw` source family into the local companion folder
  - create exactly `README.md`, `HOST_GIT_BOUNDARY.md`, `HOST_PATHS_AND_REPO_RESOLUTION.md`, `GITHUB_AUTH_AND_PR_FLOW.md`, `CANONICAL_REFS.md`
  - include explicit documentation for:
    - host-vs-container path handling
    - allowlist/repo-key resolution
    - `.env` loading if still canonical
    - Mac node execution boundary
    - relation between helper-side files in `/home/node/project` and gateway/plugin-side files in `/Users/svarnoy85/teodorArg/...`
  - capture only the durable host-backed contract, not temporary operational experiments
  - do not invent `package.json` / `openclaw.plugin.json` for this folder
- [ ] Add a per-package source-of-truth note in the migration table saying exactly which instruction files are copied, rewritten into README, linked as repo-only docs, or intentionally excluded.
- [x] Add a per-package source-of-truth note in the migration table saying exactly which instruction files are copied, rewritten into README, linked as repo-only docs, or intentionally excluded.

#### Phase 5, testing/build/publish readiness plan
- [ ] For TS/plugin packages, define minimal standard scripts:
  - build
  - test
  - lint/typecheck as applicable
- [ ] For any Python-based support code, define pytest layout and `pyproject.toml` expectations if needed.
- [ ] Decide per package whether Docker is needed for test/build/dev reproduction, or whether Docker docs are only operational reference.
- [ ] Define expected smoke tests for every package.
- [ ] Define package `files`/publish include policy so docs/skills/runtime files are actually shipped.
- [ ] Define versioning and release checklist for iterative publication.
- [ ] For every skill package, add publish-required `LICENSE` with `MIT-0` rather than inheriting only the repo-level license.
- [ ] For every skill package, prefill the ClawHub validator minimum:
  - `Slug`
  - `Display name`
  - accept `MIT-0`
  - add at least one file
  - include `SKILL.md`
- [ ] For every skill package, define release metadata fields:
  - `Owner`
  - `Version`
  - `Tags`
- [ ] For every plugin package, define release metadata fields:
  - `Plugin name`
  - `Display name`
  - `Owner`
  - `Version`
  - `Changelog`
  - `Source repo (owner/repo)`
  - `Source commit`
  - `Source ref (tag or branch)`
- [ ] For every plugin package, make sure the uploaded code can be shape-detected before the release form is treated as ready.

#### Phase 6, repo migration execution plan
- [ ] Choose migration order so we do not break working packages mid-move.
- [ ] Decide whether to create new package folders first and backfill files before deleting old paths.
- [ ] Plan incremental checkpoints so each iteration ends in a still-testable repo state.
- [ ] Plan validation after each iteration:
  - tree check
  - manifest check
  - build/test check
  - install/link check
  - docs link check
- [ ] Plan cleanup of old duplicate paths only after new canonical package paths are verified.

#### Phase 7, publication follow-up plan
- [ ] Decide which packages are intended for ClawHub/npm-style publication versus internal/local linking only.
- [ ] Define publication blockers per package.
- [ ] Define metadata still missing for publication, for example:
  - package names
  - descriptions
  - compat/build metadata
  - authors/homepage/repo fields
  - screenshots/examples if needed
- [ ] Prepare a per-package “not yet publishable because…” checklist.
- [ ] Add a per-skill publication checklist that explicitly says whether `MIT-0`, `slug`, `display name`, `owner`, `version`, `tags`, file count, and `SKILL.md` are ready.
- [ ] Add a per-plugin publication checklist that explicitly says whether package shape upload, `display name`, `owner`, `version`, `changelog`, `source repo`, `source commit`, and `source ref` are ready.

#### First execution slices for iterative work
- [ ] Slice A: inventory current files and canonical sources only.
- [x] Slice B: design the new repo tree and package folder names, including companion folder `host-git-lane/`.
- [x] Slice C: audit and move the existing `openclaw-git-workflow/` package as the gold reference.
- [x] Slice D: produce file mapping tables for the five target packages, plus a separate legacy-reference table for `openclaw-host-git-push`.
- [x] Slice E: draft top-level README/index plus per-package README outlines.
- [x] Slice F: implement one package end-to-end first, likely `openclaw-git-workflow`.

## Notes

- `host-git-lane/` is mandatory scope for this restructure and must exist as its own separate companion folder in the target repo.
- A duplicate of this TODO must also live inside `/Users/svarnoy85/teodorArg/openclaw-git-workflow/` so planning is visible in the target repo during migration.
- Use Context7 plus official OpenClaw docs as primary packaging/source-of-truth references.
- Prefer source-of-truth migration from canonical files, not from generated/copied output.
- Keep this file limited to open work only.
