---
name: memory-hygiene
description: Compact and maintain workspace memory files when MEMORY.md grows too large, bootstrap shows truncation, context overflow just happened, or the user asks for memory cleanup, memory compaction, pointer rebuild, dedup, archive pruning, or a full memory sync pass.
---

# Memory Hygiene

Use this skill when the workspace memory layer needs compaction, cleanup, re-indexing, or sync.

## Goals

Keep the live workspace memory layer small, durable, and easy to resume from.
Do not let `MEMORY.md`, `TODO.md`, `HEARTBEAT.md`, or fragmented `memory/*.md` history drift into a noisy running log.

## Files in scope

Live canon files:
- `MEMORY.md`
- `TODO.md`
- `PROJECTS.md`
- `HEARTBEAT.md`

Historical notes:
- `memory/*.md`

Related instruction files when canon changed:
- `AGENTS.md`
- `USER.md`
- repo template copies when the same rule should persist for new/reset workspaces

## When to run

Run this skill if any of the following are true:
- bootstrap warns that `MEMORY.md` was truncated
- `MEMORY.md` is clearly bloated or past roughly 15k chars
- recent work caused context overflow, compaction trouble, or obvious session drag
- the user asks for memory hygiene, memory cleanup, pointer rebuild, dedup, compaction, retention cleanup, archive pruning, or full memory sync
- a broad doc-sync pass changed canon and the memory layer now needs to be resynchronized

## Core rules

- `MEMORY.md` is a compact durable index, not a running log.
- `TODO.md` contains open work only.
- `PROJECTS.md` is a compact current project index, not a history file.
- `HEARTBEAT.md` contains short-lived current state only.
- Long chronology belongs in `memory/*.md`.
- Memory notes use the lifecycle: `durable`, `working`, `ephemeral`.
- Prefer summary-first, delete-second cleanup.
- Do not delete notes solely because they are old.
- Delete only when the note is operationally stale and also duplicated, superseded, or fully covered by a newer summary or canon note.
- Architecture canon, stable operating rules, and source-of-truth notes should usually have no expiry.

## Default workflow

### Phase A, audit

1. Read `MEMORY.md`, `TODO.md`, `PROJECTS.md`, and `HEARTBEAT.md`.
2. Inventory recent or relevant `memory/*.md` notes.
3. Identify:
   - bloated canon files
   - duplicate or overlapping note clusters
   - closed handoff notes
   - notes that should be compacted into a summary
   - stale pointers in `MEMORY.md`

### Phase B, compact and sync

1. Rewrite `MEMORY.md` to keep only durable current canon and the strongest pointers.
2. Trim `TODO.md` to open work only.
3. Trim `PROJECTS.md` to active project summaries only.
4. Trim `HEARTBEAT.md` to short current-state only.
5. For fragmented history, create one short dated summary note instead of repeating many old details in bootstrap files.
6. Rebuild the `MEMORY.md` pointers section so it keeps only the strongest notes, usually about 8 to 12 links.

### Phase C, targeted cleanup

1. Keep durable canon and high-value decision records.
2. Mark or retain useful working handoffs that still serve a real resume purpose.
3. Delete only clearly safe duplicates or fully-covered stale notes.
4. When deleting clustered history, first ensure a summary note exists.

### Phase D, persistence

If this pass changes canon or reusable workflow rules, sync the same rule into:
- `AGENTS.md`
- `USER.md`
- relevant repo template files and repo `workspace/` seed copies when appropriate

## Pointer rebuild rule

When rebuilding `MEMORY.md` pointers:
- keep the baseline config/source-of-truth pointer if one exists
- keep retention policy and compaction summary pointers
- keep session-bloat and heavy-execution guardrails when those rules are active canon
- keep only the strongest durable summaries, current handoffs, and canonical decision notes
- remove minor verification notes, superseded checkpoint notes, and redundant narrow summaries from the pointer list

## Output style

After acting, return a short summary:
1. what changed
2. files touched
3. what was deleted or compacted, if any
4. how to verify

## Safety

- Do not do broad blind deletion.
- If deletion safety is unclear, keep the note and write a summary-first consolidation note instead.
- If more than one repo or workspace is plausibly in scope, state the assumed scope briefly after acting.
