# Host Git Lane

Documentation-only lane package for the bounded host-backed git and GitHub execution path used by OpenClaw.

This package intentionally ships reference docs only. It does not imply a runtime plugin, package manifest, or executable source tree.

## What It Covers

- host git execution boundaries
- canonical host path and repo resolution rules
- GitHub auth and pull request flow expectations
- canonical references for the bounded host lane

## What It Does Not Do

- it does not ship `package.json`
- it does not ship `openclaw.plugin.json`
- it does not ship `src/` or runtime code
- it does not replace the publishable `openclaw-host-git-workflow` plugin package

## Package Contents

- `README.md`
- `HOST_GIT_BOUNDARY.md`
- `HOST_PATHS_AND_REPO_RESOLUTION.md`
- `GITHUB_AUTH_AND_PR_FLOW.md`
- `CANONICAL_REFS.md`
