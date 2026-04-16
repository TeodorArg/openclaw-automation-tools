# Source of Truth Fix

Skill-only package for turning generated-output bug reports into durable fixes in canonical source.

This package ships the `source-of-truth-fix` skill and intentionally does not imply a plugin runtime, package manifest, or local execution layer.

## What It Does

- treats generated or copied output as evidence, not canonical source
- forces a TODO-first workflow when the first visible bug appears in unstable output
- prioritizes official docs and real local source before editing
- drives fixes toward durable canonical source instead of normalizing temporary build artifacts

## What It Does Not Do

- it does not ship `package.json`
- it does not ship `openclaw.plugin.json`
- it does not ship `src/` or runtime code
- it does not claim ownership of a build or plugin execution layer

## Canonical Source

Current strongest source-of-truth for this package content:
- local shared skill copy: `/Users/svarnoy85/OpenClaw-config/skills/source-of-truth-fix/SKILL.md`

Related context references only:
- `/Users/svarnoy85/teodorArg/OpenClaw/templates/workspace-context/AGENTS.md`
- `/Users/svarnoy85/teodorArg/OpenClaw/templates/workspace-context/USER.md`

## Publication Metadata Baseline

- slug: `source-of-truth-fix`
- display name: `Source Of Truth Fix`
- owner: `TBD`
- version: `0.1.0`
- tags: `docs`, `verification`, `source-of-truth`
- license: `MIT-0`

## Package Contents

- `SKILL.md`
- `README.md`
- `LICENSE`

## Verification

- verify `SKILL.md` exists
- verify `LICENSE` exists and is `MIT-0`
- verify no `package.json` exists unless the package shape is explicitly revised later
- verify no `openclaw.plugin.json` or `src/` tree is introduced
