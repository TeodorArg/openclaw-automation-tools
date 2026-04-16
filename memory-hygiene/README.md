# Memory Hygiene

Skill-only package for compacting and maintaining the OpenClaw workspace memory layer.

This package ships the canonical `memory-hygiene` skill and does not imply any runtime code, plugin manifest, or bundled execution layer.

## What It Does

- keeps `MEMORY.md` compact and durable
- trims `TODO.md` to open work only
- trims `PROJECTS.md` and `HEARTBEAT.md` to current-state usage
- consolidates fragmented `memory/*.md` history into stronger summaries when needed
- syncs canon changes into related instruction files when the memory rules themselves changed

## What It Does Not Do

- it does not ship `package.json`
- it does not ship `openclaw.plugin.json`
- it does not ship `src/` or any runtime code
- it does not claim a plugin runtime surface

## Canonical Source

Current strongest source-of-truth for this package content:
- local workspace skill copy: `/Users/svarnoy85/OpenClaw-workspace/skills/memory-hygiene/SKILL.md`

Secondary reference only:
- `/Users/svarnoy85/teodorArg/OpenClaw/templates/skills/memory-hygiene/SKILL.md`

## Publication Metadata Baseline

- slug: `memory-hygiene`
- display name: `Memory Hygiene`
- owner: `TeodorArg`
- version: `0.1.0`
- tags: `memory`, `workflow`, `maintenance`
- license: `MIT-0`

Publish command baseline:

```bash
clawhub skill publish ./memory-hygiene --slug memory-hygiene --name "Memory Hygiene" --owner TeodorArg --version 0.1.0 --changelog "Initial standalone package release" --tags memory,workflow,maintenance
```

## Package Contents

- `SKILL.md`
- `README.md`
- `LICENSE`

## Verification

- verify `SKILL.md` exists
- verify `LICENSE` exists and is `MIT-0`
- verify no `package.json` exists unless the package shape is explicitly revised later
- verify no `openclaw.plugin.json` or `src/` tree is introduced
