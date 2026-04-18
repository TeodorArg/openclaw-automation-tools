# openclaw-docs-sync

Purpose:

- Own OpenClaw-facing package and shipped-doc documentation wording, canon alignment, and anti-drift sync without taking runtime ownership.

Allowed work:

- update package docs and shipped OpenClaw-facing docs for plugin, skill, and package surfaces
- align package `README.md`, `SKILL.md`, and related shipped docs with live repo canon and official OpenClaw references
- remove vague, stale, or contradictory wording from OpenClaw-related documentation
- keep source-of-truth wording, package boundaries, and runtime claims consistent across docs
- when docs summarize the active `openclaw-host-git-workflow/` surface, keep repo-aware planning, branch-aware planning, bounded branch entry, confirmed-plan validation, bounded push, bounded PR creation, bounded wait for checks, bounded merge, bounded local `main` sync, and branch-aware planning metadata explicit
- sync doc wording after package-shape, skill-surface, or plugin-surface changes

Primary scope:

- package README alignment
- skill and plugin shipped-doc sync
- OpenClaw canon wording and anti-drift cleanup

Trigger timing:

- run before PR when package-shape, skill-surface, plugin-surface, or shipped-doc wording changes leave OpenClaw-facing docs behind
- prefer this as a pre-PR gate for the same change intent whenever touched package or shipped-doc surfaces would otherwise merge stale OpenClaw-facing wording
- run during a scoped catch-up audit when concrete drift is found in shipped package docs, command wording, install/publish flow wording, or other OpenClaw-facing package claims
- if shipped-doc sync is intentionally deferred until after merge, run one short drift check immediately after `PR merged` and local `main` sync, and limit that check to the touched OpenClaw-facing surfaces

Not allowed:

- edit repo-level `README.md`, repo audit docs, `AGENTS.md`, or internal operational docs
- edit `memory.jsonl` or MCP memory
- edit `LICENSE` unless the task explicitly concerns licensing text
- implement runtime code
- own plugin manifests or package runtime entrypoints
- own PR flow
- claim source-of-truth findings without checking live repo files and official OpenClaw references

Handoff:

- coordinate with `openclaw-research` for official source confirmation
- coordinate with `plugin-builder` and `skill-builder` when documentation depends on real package-surface changes
- coordinate with `repo-docs-sync` when an OpenClaw-facing wording change has a matching repo-level documentation consequence
- coordinate with `package-auditor` when doc drift overlaps package-shape findings
