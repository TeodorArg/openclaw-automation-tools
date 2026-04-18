# Repository Guidelines

## Scope

This repo is a multi-package OpenClaw workspace containing separate publishable packages plus repo-level documentation.

Current repo canon:
- `openclaw-host-git-workflow/` is the active publishable plugin-plus-skill package in this repo.
- the active `openclaw-host-git-workflow/` shipped surface includes setup doctor, repo-aware planning, branch-aware planning, explicit commit prep, bounded branch entry, confirmed-plan validation, bounded push, bounded PR creation, bounded wait for checks, bounded merge, and bounded local `main` sync
- branch-aware planning metadata for the active package must identify the owning package slug or explicit repo surface in suggested branch names, commit titles, and resulting PR titles
- `memory-hygiene/` is a skill-only package.
- `source-of-truth-fix/` is a skill-only package.
- legacy `openclaw-git-workflow/` and `openclaw-host-git-pr/` were removed after migration closure.
- legacy `plugin-host-git-push` is historical source input only.

## Source of Truth

- Use current files in this repo as canonical source when they exist in the live tree.
- Do not treat installed extension output, `/home/node/repos/...` archive metadata, or sibling worktrees as canonical source code.
- Do not treat sibling `openclaw-host-git-push` paths as source; they are non-canonical historical input.
- For OpenClaw product research, use this source priority: `https://github.com/openclaw/openclaw` first, `https://github.com/openclaw` second, and Context7 only after those official GitHub sources.

## Agent Topology

- This section governs local Codex sub-agents, not OpenClaw runtime agents.
- Local Codex sub-agents in this repo exist primarily to support development, verification, and release workflows for OpenClaw plugins, tools, skills, and related package surfaces.
- Treat the top-level agent as the default direct executor plus the planner, coordinator, and final integrator.
- Treat the top-level agent as the only lane that decides whether a new idea, proposal, refactor, or question should advance into planning or implementation at all.
- Local Codex sub-agent role files live under `.codex/subagents/` and are local workflow notes, not shipped artifacts or publishable package surfaces.
- Custom local Codex agent configs may live under `.codex/agents/`; these are the executable Codex custom-agent definitions that can attach display nicknames, while `.codex/subagents/` remains the repo-local role-brief layer.
- Changes to local Codex sub-agent profiles under `.codex/subagents/` must be recorded with a short note in `.codex/CHANGELOG.md`.
- Changes to local Codex custom-agent configs under `.codex/agents/` must also be recorded with a short note in `.codex/CHANGELOG.md`.
- Supported local Codex sub-agent roles in this repo are `git-lane`, `pr-lane`, `openclaw-research`, `tool-builder`, `plugin-builder`, `skill-builder`, `openclaw-docs-sync`, `repo-docs-sync`, `memory-sync`, `planning-reporting`, `package-auditor`, `structure-auditor`, and `style-governor`.
- `git-lane` handles local git state, branch prep, staging, commit prep, and diff grouping; it does not open PRs, poll CI, or pull `main`.
- `pr-lane` handles PR creation, check polling, merge follow-up, and post-merge pull of updated `main` on the host-backed lane.
- `openclaw-research` is read-only and uses OpenClaw source priority from this file.
- `tool-builder` owns tool runtime surfaces, bounded scripts, schemas, and adapters.
- `plugin-builder` owns `openclaw.plugin.json`, plugin entrypoints, plugin packaging, and plugin verification.
- `skill-builder` owns `SKILL.md`, skill packaging, publication metadata, and skill-only package shape; it keeps skill claims aligned with the real shipped package surface and does not imply runtime code unless it exists.
- `openclaw-docs-sync` owns OpenClaw-facing package and product-surface documentation wording for plugin docs, skill docs, package docs, and other shipped OpenClaw-facing documentation.
- `repo-docs-sync` owns internal project documentation such as repo-level `README.md`, audit docs, project-level docs under `docs/`, and similar operational documentation for this repository; it may edit `AGENTS.md` when the task explicitly concerns repo governance or sub-agent canon, but local governance wording normalization belongs to `style-governor`.
- `memory-sync` owns synchronization of MCP memory plus the local `memory.jsonl` snapshot for this repository; it does not author canon changes and does not rewrite OpenClaw-facing package docs unless a memory task explicitly requires a supporting reference edit after the canon is already updated elsewhere.
- In this repository, a user request to `sync memory` or `синхронизировать память` means both MCP memory and the local `memory.jsonl` snapshot unless the user explicitly narrows scope.
- Memory synchronization in this repository includes removing stale wording, outdated phrasing, and superseded canon language from both MCP memory and the local `memory.jsonl` snapshot.
- `planning-reporting` owns structured audit, plan, TODO, checklist, gap-analysis, status, and migration-report artifacts for this repository; it does not replace `package-auditor` as the primary findings-only reviewer or `repo-docs-sync` as the primary owner of general repo-doc wording sync.
- Repo-local audits, plans, TODOs, checklists, migration notes, and similar diagnostic or planning artifacts must be written only under ignored `.local-planning/`.
- Do not place those planning/reporting artifacts in tracked repo locations such as the repo root, `docs/`, package directories, or other shipped documentation surfaces unless the task explicitly requires a tracked document as the final artifact.
- Before any repo-local plan, TODO, checklist, or execution artifact is opened, the top-level agent must first run an explicit `Idea Gate` and decide whether the work is `accepted`, `rejected`, `deferred`, or `needs_research`.
- `Idea Gate` must check whether the proposed work is actually needed, whether it duplicates an existing surface, whether it conflicts with current canon or ownership boundaries, whether it introduces unjustified complexity, and whether enough evidence exists to justify planning.
- `planning-reporting` may record `Idea Gate` outcomes, but it does not own the gate decision itself and must not act as the planner-of-record for whether work should begin.
- Repo-local planning artifacts should default to a single Markdown file under `.local-planning/<task>.md`, edited as the source of truth in the local editor.
- For ordinary work, keep one repo-local planning artifact as a single file.
- When the accepted work needs a larger rollout, many checklists, or clearly separate ownership slices, use one master plan file plus bounded child checklist files under `.local-planning/` instead of overloading one flat document.
- In a large-rollout layout, the master plan remains the source of truth for the whole idea, scope map, dependencies, and status, while each child checklist tracks one bounded slice and must be linked from the master plan.
- Repo-local planning artifacts should use simple GitHub-style task-list checkboxes as the default execution UX.
- Each repo-local plan block must carry `What`, `Why`, `Evidence`, `Checklist`, and `Done when` fields so the TODO state stays attached to its rationale and acceptance criteria.
- When a repo-local planning or reporting artifact under `.local-planning/` reaches a closed state, first sync its accepted outcome into the relevant owner docs, governance files, MCP memory, and the local `memory.jsonl` snapshot, then mark it closed and move it into `.local-planning/archive/` in the same completion slice; do not leave closed artifacts at the top level.
- `package-auditor` is read-only and reports package-level canon drift, package shape issues, verification gaps, and package-doc alignment problems; it does not replace `structure-auditor` for repo-topology placement review.
- `structure-auditor` is read-only and reports repo-topology drift, ownership-boundary leaks, misplaced artifacts, and tracked-vs-local placement problems with exact file references; it does not replace `package-auditor` for package-shape or verification review.
- `style-governor` owns wording, tone, and terminology consistency across repo-local governance docs such as `AGENTS.md`, `.codex/CHANGELOG.md`, and `.codex/subagents/**`; it does not replace `repo-docs-sync` as the primary owner of non-governance repo docs and must not invent new policy without an explicit canon task.
- Delegate only when ownership boundaries are explicit and the split materially helps; otherwise the top-level agent should execute directly.
- Prefer parallel sub-agent work only when ownership boundaries are explicit and write scopes do not overlap.

## Orchestration Flow

- Use a gated flow for non-trivial work: `Idea Gate -> research if needed -> evidence-backed planning -> bounded implementation slice -> matching audits/docs sync -> git/PR flow -> merge -> local main sync -> memory sync last`.
- The top-level agent owns orchestration decisions, slice boundaries, and transitions between these phases.
- `openclaw-research` gathers sources and evidence in read-only mode; it does not decide whether the work should begin and it does not own the plan.
- `planning-reporting` records plan/todo/checklist/state artifacts after the top-level agent accepts the work; it does not replace implementation ownership, git ownership, or canon acceptance.
- Auditors and docs-sync lanes run as bounded review and sync gates around a completed slice; they do not decide whether a new idea should exist.
- `memory-sync` mirrors only the accepted final state after the owner docs, governance, and package surfaces already reflect that state.
- For dependent work, do not begin the next slice until the previous slice has completed the intended verification, PR merge, and local `main` sync.
- Independent slices may proceed separately only when the top-level agent can justify that they do not depend on the not-yet-merged state of another slice.

## Git Workflow

- branch format: `<type>/<scope>-<short-kebab>`
- commit format: `<type>(<scope>): <short summary>`
- branch scope, commit scope, and the resulting PR title must identify the owning package or explicit repo surface, not only the change kind
- for package-owned slices, use the concrete package slug in branch scope and commit scope; for this repo prefer names like `feat/openclaw-host-git-workflow-...` and `feat(openclaw-host-git-workflow): ...`
- for repo-owned slices, use explicit repo surfaces such as `repo`, `repo-docs`, or `.codex` governance instead of package-generic wording like `workflow`
- prefer commit body with one short intro line plus exactly 4 short bullets
- treat branch and commit grouping as a hard repo policy, not a soft preference
- default rule: one branch and one PR must carry exactly one change intent
- package runtime/code changes may share a branch with that same package's shipped docs (`README.md`, `SKILL.md`, `openclaw.plugin.json`, package metadata) when those docs only describe the same shipped slice
- repo-level docs (`README.md`, `docs/**`) are separate by default from package runtime or package-local doc changes, even when they describe the same package
- `.codex/**` and other repo-governance workflow notes are separate by default from package or docs changes unless the task itself is repo workflow governance
- memory synchronization never justifies tracked git changes outside the files that actually store memory snapshots or memory governance
- only mix repo-level docs into a package branch when the user explicitly asks for a single combined sync or when leaving them behind would make the branch materially misleading at merge time
- if a diff touches multiple ownership lanes, split by ownership first: `tool-builder`/`plugin-builder`, `skill-builder`/`openclaw-docs-sync`, `repo-docs-sync`, `.codex` governance
- if a diff can be reviewed, reverted, or merged independently, it must be split into a separate branch/commit group
- before committing, inspect staged paths against this repo topology: package-local shipped surface, repo docs, skill-only package, local `.codex` governance
- when in doubt, split more aggressively and leave a narrower PR
- in this repo, when the user says `отправь в гит`, treat it as the full git flow: create a separate branch, commit, push, open a PR to `main`, wait for checks, merge the PR, and sync local `main`
- do not stop at PR creation for `отправь в гит` requests unless the user explicitly narrows the scope
- do not auto-delete the branch during PR merge unless the user explicitly requests branch deletion
- do not authenticate git or GitHub inside runtime/container
- push and PR actions happen on the host-backed lane only
- after opening a PR against `main`, check status once after 15 seconds; if checks are still `IN_PROGRESS`, poll every 10 seconds until they are green or a failing check needs a fix
- before any `git push` for a migration slice, verify the resulting skill or plugin package shape against official OpenClaw docs and the current live repo canon

Commit grouping examples for this repo:
- `openclaw-host-git-workflow/src/**` plus `openclaw-host-git-workflow/README.md` and that package's `SKILL.md` can live in one branch when they describe the same shipped runtime slice
- root `README.md` or `docs/**` should normally be a separate branch from `openclaw-host-git-workflow/src/**`
- `.codex/subagents/**` updates should normally be a separate branch from runtime or package-doc work

## Verification Minimum

For plugin packages:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `pnpm pack:smoke`

For skill-only packages:
- verify `SKILL.md` exists
- verify package-local `LICENSE` exists and matches publication target
- verify required publish metadata is present in docs/checklists
- verify no runtime code is implied unless it really exists

## Sub-Agent Timing

- Use sub-agents as pre-PR review and sync gates for each completed change intent; do not wait until the whole plugin is finished before checking canon drift.
- Run the owning implementation lane first, then run only the bounded auditors or sync roles that match the actual change surface before opening a PR to `main`.
- For package-runtime or package-shape changes, use `package-auditor` before PR creation to review package shape, verification coverage, and package-doc claims.
- For repo-topology, ownership-boundary, tracked-vs-local placement, artifact-location changes, or structural refactor slices that may alter package surface layout or file placement, use `structure-auditor` before PR creation.
- Treat a user refactor request for a package or repo area as structure-relevant by default when the slice may reorganize directories, move files, or redraw ownership boundaries; do not treat that slice as finished until `structure-auditor` has reviewed it.
- For repo-governance wording or sub-agent canon changes, use `style-governor` after the policy content is updated in owner files and before treating the governance wording as finished.
- When a structural refactor also changes repo-local governance naming, wording, or topology terminology across `AGENTS.md` or `.codex/**`, run `style-governor` as a bounded follow-up audit before treating that governance wording as finished.
- Use `repo-docs-sync` or `openclaw-docs-sync` before PR creation when the implementation changes leave internal repo docs or shipped package docs out of sync.
- Use `memory-sync` only after the owning files are already updated and the canon outcome is settled; memory sync mirrors the accepted state and is not the step that declares canon complete.
- Do not treat memory synchronization as complete in this repository until both MCP memory and the local `memory.jsonl` snapshot reflect the accepted state, unless the user explicitly asks for only one of them.
- When a new canon is adopted after a package already exists, run one catch-up audit across the live package surface before resuming normal per-slice pre-PR checks.
- A catch-up audit should use the narrowest needed combination of `package-auditor`, `structure-auditor`, `style-governor`, `repo-docs-sync`, `openclaw-docs-sync`, and `planning-reporting`, then split fixes into reviewable change intents rather than landing one giant cleanup branch.
- When concrete drift is discovered in a live package surface, commands, install/publish flow, node boundary, canon wording, or sync workflow, treat it as a scoped catch-up audit trigger for the affected ownership cluster rather than as a blanket full-repo recheck.
- Prefer closing documentation truth changes as a pre-PR gate for the same change intent instead of waiting for a merged follow-up whenever the touched surface already makes the docs stale.
- The default scoped catch-up audit cluster is `package-auditor` for package surface and verification contracts, `structure-auditor` for topology and placement, `repo-docs-sync` and/or `openclaw-docs-sync` for documentation truth, `style-governor` for governance wording, and `memory-sync` only as the final mirror step.
- After a scoped catch-up audit, either close the discovered drift in the same bounded slice or leave an explicit follow-up slice; do not leave the ownership cluster implicitly half-synced.
- If documentation sync is intentionally deferred into a post-merge follow-up, run a short drift check immediately after `PR merged` plus local `main` sync and limit that check to the touched surfaces instead of reopening a blanket repo-wide audit.

## Communication

- keep user-facing replies short and high-signal
- do not send a pre-action "I am about to do X" message when the action can be taken immediately
- avoid pseudo-clarifying or intention-only messages unless a real blocker or safety risk requires user input
- default to doing the work first and then reporting the result briefly
- use intermediate updates sparingly and only when the work is long-running or the user needs a concrete status change
- do not append unsolicited caveats about files, folders, or local artifacts that were not included in a git/PR flow when the requested flow completed successfully
- mention excluded or ignored files only when they block the requested outcome, create a material mismatch in what was requested, or the user explicitly asks for scope details
- after reporting a completed result, do not propose optional follow-up work, git actions, or next steps unless the user explicitly asked for options, asked what to do next, or the workflow is blocked on a user decision
- do not append default offers such as `if you want, I can ...` after task completion
- if the task is complete and not blocked, end with the result only
