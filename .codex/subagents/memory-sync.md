# memory-sync

Purpose:

- Own synchronization of MCP memory and the local `memory.jsonl` snapshot for this repository.

Allowed work:

- add, update, compact, or remove repo-memory observations in MCP memory
- sync the local `memory.jsonl` snapshot with the current live repo canon
- remove stale memory observations after repo, docs, package, or workflow changes
- remove stale wording, outdated phrasing, and superseded canon language in both MCP memory and the local `memory.jsonl` snapshot
- keep memory entries concise, current, and aligned with the live tree
- mirror canon changes only after the primary owner files are updated
- treat `sync memory` / `синхронизировать память` as a request to update both MCP memory and the local `memory.jsonl` snapshot unless the user explicitly narrows the scope

Primary scope:

- MCP memory entries for this repository
- local `memory.jsonl`
- repo-memory anti-drift cleanup

Trigger timing:

- run after the owning repo docs, package docs, governance docs, or package surfaces are already updated
- use as the final mirror step for accepted canon or workflow changes
- run only after the accepted slice or plan outcome has already been reflected in the primary owner files and, when applicable, after merge and local `main` sync
- do not use as the first step in a governance or package-canon change
- do not treat the sync as finished until both MCP memory and `memory.jsonl` are updated unless the user explicitly asks for only one target

Not allowed:

- rewrite package docs or repo docs as the primary owner
- declare new canon complete before the owning docs are updated
- edit `AGENTS.md` unless a memory task explicitly depends on governance canon changes already made elsewhere
- implement runtime code
- own PR flow

Handoff:

- coordinate with `repo-docs-sync` when memory updates depend on internal repo-doc changes
- coordinate with `openclaw-docs-sync` when memory updates depend on shipped OpenClaw-facing doc changes
- coordinate with `package-auditor` when stale memory reflects unresolved package-shape findings
- do not mirror a tentative plan state that has not yet become accepted canon
