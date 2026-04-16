# TODO

## Active

### Post-reorg hardening

Goal:
- keep the now-materialized repo structure aligned with CI, publication metadata, and release/readiness docs

Status on 2026-04-16:
- [x] `openclaw-git-workflow/` is materialized as the active plugin-plus-skill package
- [x] `memory-hygiene/` is materialized as a skill-only package
- [x] `source-of-truth-fix/` is materialized as a skill-only package
- [x] `openclaw-host-git-pr/` is materialized as a skill-only package
- [x] `host-git-lane/` is materialized as a companion folder

Open work:
- [x] tighten package publication metadata so no skill package still relies on `TBD` placeholders
- [x] align `.github/workflows/ci.yml` with the final multi-unit repo shape
- [x] finalize repo-level publish/readiness checklist status per unit
- [ ] confirm which units are structurally ready to publish versus intentionally still blocked on first external release
- [ ] log in to ClawHub CLI on the publish host and record the first successful `whoami`
- [ ] record the first successful skill upload version for each skill package
- [ ] record the first successful plugin upload and first external install verification for `openclaw-git-workflow`

### CI alignment

- [x] add one skill-package validation job for:
  - `memory-hygiene`
  - `source-of-truth-fix`
  - `openclaw-host-git-pr`
- [x] add one `host-git-lane` companion validation job
- [x] keep plugin verification scoped to `openclaw-git-workflow/`
- [x] keep shell checks only for real package-local scripts under `openclaw-git-workflow/scripts/`

### Publication metadata

- [x] set stable `owner`, `version`, and `tags` values for each skill package
- [x] keep `MIT-0` explicit and package-local for each skill package
- [x] document exact publish commands for each skill package
- [x] keep plugin release metadata explicit for `openclaw-git-workflow`
- [x] document the first-upload ClawHub preflight for skills and plugin packages
- [ ] resolve docs-vs-CLI syntax drift for `clawhub` publish commands on the real publish host
- [ ] confirm whether the publish host exposes `clawhub publish` or `clawhub skill publish` for skills
- [ ] confirm whether the publish host exposes `clawhub package publish --dry-run` or only direct publish

### Readiness

- [x] maintain a repo-level readiness table for:
  - structural shape
  - local verification
  - publication metadata
  - release blockers
- [ ] track product-level host/node metadata requirement until the gateway/UI no longer shows normal host sessions as `unknown`
- [x] consolidate the `openclaw node` install and identity contract into one repo-local doc
- [ ] keep `host-git-lane/` excluded from any ClawHub publish workflow
- [ ] keep this file limited to current open work only
