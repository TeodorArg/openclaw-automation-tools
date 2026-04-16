# Host Git Boundary

The host-backed git lane is outside the runtime/container surface of this repo.

## Canonical Boundary

- do not authenticate git inside the runtime/container
- do not authenticate GitHub inside the runtime/container
- do not describe push or PR creation as a runtime/container capability of the repo package units
- keep host-backed git and GitHub operations on the Mac host lane

## Practical Meaning

- package units may prepare branches, commits, readiness checks, or structured plans
- host-backed finish steps perform push and PR creation
- the host lane is explicit and separate, not an implied extension of the package runtime

## Forbidden Drift

- do not turn this folder into a plugin package
- do not move installed runtime output here and call it source
- do not claim that container-side helper wiring is the canonical finish path
