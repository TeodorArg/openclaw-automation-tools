# Host Paths And Repo Resolution

Repo resolution in the host git lane must use canonical host paths.

## Resolution Rules

- resolve the repository from known host project locations or explicit canonical config
- prefer a real host checkout over installed plugin output or transient runtime directories
- validate that the resolved path is a git toplevel before any bounded action runs
- bind execution to the live host node that can actually access the resolved checkout

## Anti-Patterns

Do not treat these as canonical repo roots:

- generated build output
- installed extension or packaged output trees
- random current working directories
- container-only paths when the actual git remote credentials live on the host
