# Technical Docs Map

This directory holds the repo-level technical detail that does not belong on the public-facing landing page.

## Read This When You Need

- [Plugin package canon](./PLUGIN_PACKAGE_CANON.md)
  Use this for the live publishable package list, package-shape rules, and repo-level package policy.
- [Plugin style canon](./PLUGIN_STYLE_CANON.md)
  Use this for wording, structure, and repo-local style expectations.
- [Node install and identity contract](./OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md)
  Use this for host node setup, pairing, identity, and runtime boundaries.
- [ClawHub publish preflight](./CLAWHUB_PUBLISH_PREFLIGHT.md)
  Use this before package publication or release handoff.
- [Release records](./RELEASES.md)
  Use this to navigate tracked package release artifacts.

## Maintainer Verification

Run verification inside the package you changed:

```bash
cd <package>
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

Valid package directories:

- `openclaw-host-git-workflow`
- `openclaw-workflow-planner`
- `openclaw-canon`
- `openclaw-session-bloat-warning`
- `openclaw-url-tailwind-scaffold`

## Release Artifact Index

Versioned release notes and ClawHub handoff records live under `docs/releases/<package-slug>/`.
