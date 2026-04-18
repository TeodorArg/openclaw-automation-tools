# Host Git Boundary

The host git lane is bounded by design.

## Allowed Surface

- operate on a canonical resolved repository path
- create or switch to a validated non-main working branch
- inspect status and preflight on the bound host node
- push the current non-main branch to `origin`
- create a pull request from the current non-main branch into `main`
- wait for required checks on the current branch PR
- merge only when the current PR, target branch, and HEAD SHA still match expectations
- sync local `main` from `origin/main` only from a clean worktree

## Forbidden Surface

- arbitrary `git <anything>` passthrough
- arbitrary `gh <anything>` passthrough
- arbitrary shell passthrough based on user text
- git or GitHub authentication inside the runtime container surface
- repo selection from implicit cwd or generated output paths

## Operational Rule

Real git and GitHub side effects belong on the bound host node where SSH, `git`, and `gh` are already configured.
