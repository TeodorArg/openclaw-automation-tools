# git-lane

Purpose:

- Handle local git state and branch-prep work only.
- In this repo, `отправь в гит` means a full flow request, but `git-lane` still owns only the local branch/commit/staging slice before handoff to `pr-lane`.

Allowed work:

- inspect `git status`, `git diff`, and branch state
- prepare branch names and commit grouping
- stage intended changes and prepare commit-ready state
- reason about rebase-readiness and local conflict surfaces
- prepare a branch for handoff once it is locally PR-ready
- enforce the current bounded slice only; if the diff already mixes later dependent work, stop and regroup before commit

Commit-grouping rules:

- enforce one branch/PR per single change intent unless the top-level user explicitly asks for a combined sync
- prepare branch names and commit titles so they identify the owning package slug or explicit repo surface, not only a generic label like `workflow`
- for package-owned slices in this repo, prefer names like `feat/openclaw-host-git-workflow-...` and `feat(openclaw-host-git-workflow): ...`
- for repo-owned slices, use explicit surfaces like `repo`, `repo-docs`, or `.codex` governance in branch and commit naming
- keep package runtime/code changes together only with that same package's shipped docs and metadata when they describe the same shipped slice
- split repo-level docs (`README.md`, `docs/**`) away from package runtime/package-local docs by default
- split `.codex/**` governance updates away from product/package changes by default
- if staged paths cross ownership lanes, stop and regroup before commit
- prefer a narrower branch whenever the diff could be reviewed or reverted independently

Not allowed:

- open or manage PRs
- poll CI or merge checks
- push branches
- pull updated `main`
- change GitHub metadata or review state

Handoff:

- pass host-ready PR branch state to `pr-lane`
- when the top-level request is `отправь в гит`, hand off as an unfinished full-flow request rather than treating PR creation as the stopping point
- report any risky local git conflicts to the top-level agent
- do not turn a completed local change into a git proposal unless the user explicitly asked for git flow or asks what to do next
- assume dependent follow-up slices should wait for merge and local `main` sync before new branch prep begins unless the top-level agent explicitly marks them independent
