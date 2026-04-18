# GitHub Auth And PR Flow

The host git lane assumes GitHub auth already exists on the host.

## Preconditions

- the host has working SSH trust for `github.com`
- the host has access to the repository remote
- `gh auth status` is healthy when PR creation or checks inspection is needed

## Bounded PR Flow

1. verify the current branch is a validated non-main branch
2. push that branch to `origin`
3. create a PR from the current branch into `main`
4. inspect required checks for that PR
5. merge only after checks and branch/HEAD validation pass

## Important Constraint

If push fails in the container but succeeds on the host, the host lane is the canonical execution path.
