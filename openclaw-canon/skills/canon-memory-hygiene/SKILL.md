---
name: canon-memory-hygiene
description: Use when canon work needs `canon_status`, `canon_doctor scope=memory`, or preview-first `canon_fix scope=memory` to compact or repair the memory layer without unsafe semantic rewrites.
user-invocable: true
command-dispatch: tool
command-tool: canon_doctor
command-arg-mode: raw
---

# Memory Hygiene

Use this bundled skill when the memory layer needs bounded canon diagnosis or
safe-only cleanup.

## Preferred tool mapping

- `canon_status` for the latest known memory-related summary
- `canon_doctor` with `scope = "memory"` for diagnosis
- `canon_fix` with `scope = "memory"` and `mode = "preview"` before any apply

## Core memory rules

- `MEMORY.md` is a compact durable index, not a running log.
- `TODO.md` contains open work only.
- `PROJECTS.md` is a compact current project index.
- `HEARTBEAT.md` is short-lived current state only.
- Long chronology belongs in `memory/*.md`.
- Prefer summary-first cleanup over broad deletion.
- Do not delete notes only because they are old.

## Safe-only boundary

Safe apply is limited to bounded memory-owned fixes such as:
- malformed memory records with a clear invalid shape
- byte-identical duplicate records with unambiguous ownership

Proposal-only boundary:
- semantic merges
- guessed rewrites
- deletes with weak evidence
- any rewrite that invents new canonical wording

## Output expectations

After acting, return:
1. findings summary
2. preview or applied changes
3. files touched
4. verification path
