# openclaw-automation-tools

Multi-package OpenClaw repository for plugins, skills, tools, and companion documentation.

This repository is not a single-package install surface. The repo root is a coordination layer for a package set that will evolve over time. The sections below describe the current live tree, not a permanently fixed package taxonomy.

## Current Repository Map

| Path | Current shape | Purpose |
| --- | --- | --- |
| [openclaw-git-workflow/README.md](openclaw-git-workflow/README.md) | publishable plugin-plus-skill package | Bounded git workflow plugin with bundled `openclaw-git-workflow` skill and runtime/tool surface |
| [memory-hygiene/README.md](memory-hygiene/README.md) | skill-only package | Memory maintenance and compaction skill package |
| [source-of-truth-fix/README.md](source-of-truth-fix/README.md) | skill-only package | Source-of-truth repair skill package for generated-output bugs |
| [openclaw-host-git-pr/README.md](openclaw-host-git-pr/README.md) | skill-only package | Host-backed PR readiness and PR creation skill package |
| [host-git-lane/README.md](host-git-lane/README.md) | companion docs only | Canonical docs for the external host-backed git/GitHub lane |

Current mix in the live tree today:

- one publishable plugin-plus-skill package
- three skill-only packages
- one companion docs layer

This mix is expected to change as new plugin, skill, tool, and docs surfaces are added, removed, split, or reshaped.

## Root-Level Facts

- The repo root does not ship a `package.json`, `pnpm-workspace.yaml`, or `openclaw.plugin.json`.
- Package management, builds, tests, and publishable manifests live inside the package directories, not at the repo root.
- Local development is pinned to Node `24.13.0` via the repo-root `.nvmrc`.
- The root [LICENSE](LICENSE) is `MIT`, while the three skill-only packages each ship their own `MIT-0` license file.
- [AGENTS.md](AGENTS.md) is a local repo-governance file used for workflow instructions in this repository.
- Repo-local planning and audit scratch files belong only under ignored `.local-planning/`.

## Current Install And Package Surfaces

### Plugin package

The only current publishable plugin package is `openclaw-git-workflow/`.

Install from ClawHub:

```bash
openclaw plugins install clawhub:@openclaw/openclaw-git-workflow
```

Install from a local checkout:

```bash
nvm use || nvm install
cd openclaw-git-workflow
pnpm install
pnpm build
cd ..
openclaw plugins install -l ./openclaw-git-workflow
```

The plugin manifest lives at [openclaw-git-workflow/openclaw.plugin.json](openclaw-git-workflow/openclaw.plugin.json). Its runtime entry is `./dist/index.js`, and it bundles the skill directory `./skills`.

### Skill-only packages

`memory-hygiene/`, `source-of-truth-fix/`, and `openclaw-host-git-pr/` are skill-only packages in the current tree.

They currently ship:

- `SKILL.md`
- `README.md`
- `LICENSE`

They do not currently ship:

- `package.json`
- `openclaw.plugin.json`
- `src/`
- any package-owned runtime implementation

### Companion docs layer

`host-git-lane/` is documentation only in the current tree. It is neither a plugin package nor a skill package, and it must not be reshaped into a fake publishable unit.

## Verification Baseline

The live CI at [.github/workflows/ci.yml](.github/workflows/ci.yml) verifies the current package shapes and boundaries.

For `openclaw-git-workflow/`:

```bash
cd openclaw-git-workflow
pnpm install
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

CI also checks:

- `bash -n openclaw-git-workflow/scripts/git-create-branch.sh`
- `bash -n openclaw-git-workflow/scripts/git-create-commit.sh`

For each skill-only package, CI verifies:

- `SKILL.md`, `README.md`, and `LICENSE` exist
- the license text is `MIT No Attribution`
- README metadata includes `slug`, `display name`, `owner`, `version`, and `tags`
- no `package.json`, `openclaw.plugin.json`, or `src/` tree exists

For `host-git-lane/`, CI verifies:

- all required docs files exist
- no `package.json`
- no `openclaw.plugin.json`

## Canonical Docs In This Repo

- [docs/CLAWHUB_PUBLISH_PREFLIGHT.md](docs/CLAWHUB_PUBLISH_PREFLIGHT.md): current first-publication preflight, ClawHub CLI notes, and package-specific publish checks
- [docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md](docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md): repo-local consolidation of the product-level `openclaw node` install and identity contract
- [host-git-lane/README.md](host-git-lane/README.md): overview of the companion host-backed lane

## Boundaries That Must Stay True

- The repo should be documented as an evolving collection repo, not as a permanently fixed package lineup.
- `openclaw-git-workflow/` is one package inside this repo, not the meaning of the whole repo.
- `openclaw-git-workflow/` remains bounded to planning plus confirmed branch-and-commit execution; push and PR flow stay outside its runtime contract.
- `openclaw-host-git-pr/` remains a skill-only package with an external host-backed runtime boundary.
- `host-git-lane/` remains companion documentation for that external lane and is not publishable.
- OpenClaw product-level behavior such as `openclaw node` installation belongs to official product docs and the companion docs in this repo, not to an invented local package surface.
