# Codex Local Changelog

Local-only notes for `.codex/` updates in this repository.
This file is meant for short operational entries, not shipped docs.

## 2026-04-17

- Added repo-local orchestration canon for `Idea Gate`, evidence-backed `.local-planning/<task>.md` artifacts with GitHub-style checkboxes, and dependent-slice progression only after verification, PR merge, and local `main` sync.
- Synced `AGENTS.md`, `.codex/subagents/README.md`, `planning-reporting`, `openclaw-research`, `git-lane`, `pr-lane`, `memory-sync`, and the matching executable agent configs so top-level orchestration ownership, research boundaries, and final memory timing now match the new orchestration model.
- Synced `.codex` governance wording and executable agent configs so the active `openclaw-host-git-workflow` surface and planning-archive policy match current repo canon.
- Synced `AGENTS.md`, `.codex/subagents/README.md`, `plugin-builder`, `tool-builder`, `openclaw-docs-sync`, `repo-docs-sync`, and their executable agent configs so local governance now treats bounded branch entry and package-aware planning metadata as explicit parts of the active `openclaw-host-git-workflow` surface.
- Synced `.codex/subagents/README.md`, `git-lane.md`, `pr-lane.md`, and the executable `git-lane`/`pr-lane` agent configs so sub-agents now enforce package-aware branch, commit, and PR naming instead of generic scopes like `workflow`.
- Added package-aware git naming canon in `AGENTS.md` so branch scopes, commit scopes, and merge-visible PR titles must identify the owning package or explicit repo surface instead of generic labels like `workflow`.
- Synced `AGENTS.md`, `.codex/subagents/pr-lane.md`, `.codex/subagents/README.md`, and `.codex/agents/pr-lane.toml` so PR merge flow now explicitly forbids auto-deleting branches unless the user asks for branch deletion.
- Added executable custom-agent configs under `.codex/agents/` for the repo-local lanes and auditors, with functional `Agent X` nickname candidates aligned to each role.
- Tightened doc-sync timing canon so relevant docs should be closed as a pre-PR gate by default, and any intentionally deferred post-merge docs follow-up must run a short drift check only across the touched surfaces after merge and local `main` sync.
- Added a hard scoped catch-up audit rule so concrete drift in live package surfaces, commands, install/publish flows, node boundaries, canon wording, or sync workflows now triggers the affected ownership cluster instead of a blanket repo-wide recheck.
- Added a hard planning-reporting rule that closed `.local-planning/` artifacts must be marked closed and moved into `.local-planning/archive/` once their outcome is already synced into owner docs, governance, and memory.
- Tightened the planning-reporting archive rule so closure now explicitly requires syncing the accepted outcome into owner docs, governance, MCP memory, and local `memory.jsonl` before the artifact is archived.
- Clarified `memory-sync` wording so memory synchronization explicitly includes removing stale wording, outdated phrasing, and superseded canon language from both MCP memory and local `memory.jsonl`.
- Added a hard memory-sync rule that `sync memory` / `синхронизировать память` means both MCP memory and local `memory.jsonl` unless the user explicitly narrows scope, and that the sync is not complete until both are updated.
- Clarified structural-refactor governance so package or repo refactor requests now explicitly trigger `structure-auditor`, with `style-governor` as a bounded follow-up when governance naming or terminology shifts, and synced the trigger plus handoff wording into `AGENTS.md` and `structure-auditor.md`.
- Added a hard communication rule to stop appending unsolicited caveats about excluded files or ignored local artifacts after successful git or PR flows.
- Added explicit sub-agent timing canon for pre-PR slice checks, one-time catch-up audits on already-built package surfaces, and post-update memory mirroring.
- Tightened the governance boundary between `repo-docs-sync` and `style-governor` so `AGENTS.md` canon content and local governance wording normalization no longer overlap ambiguously.
- Tightened the boundary between `package-auditor` and `structure-auditor` so package-shape review and repo-topology placement review are explicitly separate lanes.
- Clarified that `memory-sync` mirrors canon changes only after owner files are updated and does not declare canon complete on its own.
- Synced `planning-reporting.md`, `.codex/subagents/README.md`, and `AGENTS.md` to the stricter governance wording.
- Added `structure-auditor.md` and `style-governor.md` under `.codex/subagents/` and defined their local governance ownership boundaries.
- Synced the supported-role list and role summaries in `.codex/subagents/README.md` and `AGENTS.md` to include the new sub-agent profiles.
- Synced repo docs, local agent/sub-agent docs, package docs, package metadata descriptions, and `memory.jsonl` to the closed post-migration canon and the single primary `send_to_git` / `отправь в гит` workflow entrypoint.
- Added repo-local canon that user wording `отправь в гит` means the full flow: branch, commit, push, PR to `main`, checks polling, merge, and `main` sync.
- Synced that rule into `AGENTS.md`, `.codex/subagents/git-lane.md`, `.codex/subagents/pr-lane.md`, and `.codex/subagents/README.md`.
- Updated `pr-lane` polling cadence to first check after 15 seconds and later polls every 10 seconds, and added a rule to log sub-agent add/update/remove changes in `.codex/CHANGELOG.md`.
- Added explicit commit-grouping canon: one branch/PR per single change intent, with package runtime, package-local shipped docs, repo docs, companion docs, and `.codex` governance split by default unless the user explicitly wants a combined sync.
- Added explicit communication canon that completion messages must not include unsolicited optional next-step offers or git proposals unless the user asked for options or the workflow is blocked on a user decision.
- Synced `plugin-builder.md` and local governance wording to the post-migration repo canon so sub-agent docs no longer treat removed legacy packages as live reference surfaces.

## 2026-04-18

- Extended repo-local planning canon from a single-file default into a two-scale model: ordinary work stays in one task file, while larger accepted work now uses one master plan plus linked child checklist files under `.local-planning/`.
- Added local planning templates `TEMPLATE_LOCAL_TASK_PLAN_RU.md`, `TEMPLATE_LOCAL_MASTER_PLAN_RU.md`, and `TEMPLATE_LOCAL_CHILD_CHECKLIST_RU.md`, and synced `AGENTS.md`, `.codex/subagents/README.md`, `planning-reporting.md`, `planning-reporting.toml`, `README.md`, MCP memory, and local `memory.jsonl` to that wording.
- Added local host-shell safety canon so repo governance now avoids double-quoted shell commands with Markdown backticks or other shell-significant body text, and prefers fast-forward-safe local `main` refresh instead of bare `git pull` with unset strategy.
