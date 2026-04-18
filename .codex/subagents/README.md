# Local Codex Sub-Agent Profiles

Local-only role briefs for Codex sub-agents used in this repository.

These files support development, verification, and release workflows for OpenClaw plugins, tools, skills, and related package surfaces.
They are local workflow notes for Codex coordination, not OpenClaw runtime agents, not publishable packages, and not repo canon for shipped artifacts.

Custom Codex agent configs may also live under `.codex/agents/`.
Use `.codex/subagents/*.md` for repo-local role briefs and governance ownership, and `.codex/agents/*.toml` for executable custom agent definitions such as descriptions, runtime config, and display `nickname_candidates`.

Supported roles:

- `git-lane.md`
- `pr-lane.md`
- `openclaw-research.md`
- `tool-builder.md`
- `plugin-builder.md`
- `skill-builder.md`
- `openclaw-docs-sync.md`
- `repo-docs-sync.md`
- `memory-sync.md`
- `planning-reporting.md`
- `package-auditor.md`
- `structure-auditor.md`
- `style-governor.md`

Usage rules:

- The top-level Codex agent is the default direct executor and remains the planner and final integrator.
- The top-level Codex agent is also the only lane that decides whether a new idea should advance into planning or implementation at all.
- Assign sub-agents only to bounded tasks with explicit ownership.
- Do not give two editing sub-agents overlapping write scopes.
- Delegate only when ownership boundaries are explicit and the split materially helps; otherwise keep the work on the top-level agent.
- Prefer parallel sub-agent work only when ownership boundaries are explicit and write scopes do not overlap.
- After adding, updating, renaming, or removing a sub-agent profile under `.codex/subagents/`, add a short entry to `.codex/CHANGELOG.md`.
- After adding, updating, renaming, or removing an executable custom-agent config under `.codex/agents/`, add a short entry to `.codex/CHANGELOG.md`.
- Keep package boundaries and runtime-vs-local distinctions explicit.
- Treat commit grouping and branch boundaries as explicit ownership decisions, not cleanup to do later.
- Treat branch scopes, commit scopes, and merge-visible PR titles as ownership signals: they must identify the owning package slug or an explicit repo surface such as `repo`, `repo-docs`, or `.codex`, not only a generic change kind.
- After completing a task, do not expand scope by proposing optional next-step work unless the user explicitly asked for options or the workflow is blocked on a user decision.
- Do not append unsolicited caveats about excluded files or ignored local artifacts after a successful git or PR flow unless that omission blocks the request or the user explicitly asks about scope.
- Treat live repo files as canonical source when they exist; do not elevate installed copies above the live tree.
- Use OpenClaw source priority for product research: `https://github.com/openclaw/openclaw` first, `https://github.com/openclaw` second, and Context7 only after those official GitHub sources.
- Before any non-trivial plan or TODO artifact is opened, run an explicit `Idea Gate` on the top-level lane and classify the request as `accepted`, `rejected`, `deferred`, or `needs_research`.
- `Idea Gate` checks need, duplication, canon fit, ownership-boundary fit, complexity cost, and whether enough evidence exists to justify planning.
- Repo-local planning artifacts should default to one Markdown source-of-truth file under `.local-planning/<task>.md` with GitHub-style checkboxes.
- For ordinary work, keep one repo-local planning artifact as a single file.
- For larger accepted work with many checklist items or clearly separate slices, use one master plan file plus linked child checklist files under `.local-planning/`; the master plan stays the source of truth for the whole rollout.
- Each plan block in that file should carry `What`, `Why`, `Evidence`, `Checklist`, and `Done when`.
- Treat the active `openclaw-host-git-workflow/` surface as including repo-aware planning, branch-aware planning, bounded branch entry, confirmed-plan validation, bounded push, bounded PR creation, bounded wait for checks, bounded merge, bounded local `main` sync, and branch-aware planning metadata; when package, tool, or docs summaries enumerate current behavior, keep that surface explicit.
- `git-lane` owns local git state, branch prep, staging, commit prep, and diff grouping only.
- Default grouping rule for this repo: one branch/PR per single change intent, with repo docs, package-local shipped docs, runtime code, and `.codex` governance split unless they are the same bounded slice.
- `pr-lane` owns PR creation, check polling cadence with first check after 15 seconds and later polls every 10 seconds, merge follow-up without auto-deleting branches unless the user explicitly asks for deletion, and post-merge pull of updated `main` on the host-backed lane only.
- In this repo, a user request phrased as `отправь в гит` means the full flow should complete through branch, commit, push, PR, checks, merge, and `main` sync unless the user explicitly narrows the scope.
- Use `openclaw-research` as read-only source gathering.
- `tool-builder` owns tool runtime surfaces, bounded scripts, schemas, adapters, and runtime execution contracts.
- `plugin-builder` owns `openclaw.plugin.json`, plugin entrypoints, plugin packaging, and plugin verification.
- `skill-builder` owns `SKILL.md`, skill packaging, publication metadata, and skill-only package shape, and it must not imply runtime code unless that runtime really exists.
- Use `openclaw-docs-sync` only for OpenClaw-facing package and shipped-doc surfaces.
- Use `repo-docs-sync` for internal repo docs and operational project docs, including `AGENTS.md` when the task explicitly concerns repo governance or sub-agent canon, but local governance wording normalization belongs to `style-governor`.
- Use `memory-sync` for MCP memory and `memory.jsonl` synchronization after the canon is already updated in its primary owner files.
- Use `planning-reporting` for audit, plan, TODO, checklist, gap-analysis, and status-report artifacts without replacing `package-auditor` as the findings-only reviewer.
- Use `package-auditor` as read-only review for package-level canon drift, package shape issues, verification gaps, and package-doc alignment problems.
- Use `structure-auditor` as read-only review for repo topology, ownership boundaries, tracked-vs-local placement, and correct artifact placement.
- Use `style-governor` for wording, tone, and terminology consistency across local governance docs, not as the primary owner of non-governance repo docs.

Timing rules:

- Default timing is per completed change intent: implement first, then run only the matching auditors or doc-sync roles before opening a PR to `main`.
- For non-trivial accepted work, use the repo orchestration flow `Idea Gate -> research if needed -> planning artifact -> bounded slice -> matching audit/docs sync -> git/PR -> merge -> local main sync -> memory sync last`.
- Do not defer canon checks until the whole plugin is finished unless the task is explicitly a full-package catch-up audit.
- Use `package-auditor` before PR for package-shape, verification, and package-doc claim review.
- Use `structure-auditor` before PR for repo-topology, ownership-boundary, and tracked-vs-local placement review.
- Use `style-governor` after owner files are updated and before local governance wording is treated as complete.
- Use `repo-docs-sync` and `openclaw-docs-sync` before PR when implementation changes leave repo docs or shipped docs behind.
- Use `memory-sync` only after owner files and docs are already updated; it mirrors the accepted state into MCP memory and local `memory.jsonl`.
- For dependent work, do not advance to the next slice until the previous slice has completed verification, merge, and local `main` sync.
- When canon is introduced after a package is already substantially built, run one catch-up audit across the live package surface, then return to normal pre-PR slice checks.
- When concrete drift is discovered in a live package surface, commands, install/publish flow, node boundary, canon wording, or sync workflow, run a scoped catch-up audit across the affected ownership cluster instead of a blanket repo-wide recheck.
- The default scoped catch-up audit cluster is `package-auditor`, `structure-auditor`, `repo-docs-sync` and/or `openclaw-docs-sync`, `style-governor`, and `memory-sync` last.
