# Plugin Package Canon

Date: 2026-04-18  
Status: active repo-level canon

## Scope

This document defines the local package-structure canon for plugin packages in this repository.

It is a repo-level policy, not a claim that every rule is mandated by upstream OpenClaw.

## Rollout Status

This canon is active as repository policy.

The live publishable plugin package list for this repository is defined here.

Current live publishable plugin packages:
- `openclaw-host-git-workflow/`
- `openclaw-workflow-planner/`
- `openclaw-canon/`
- `openclaw-session-bloat-warning/`

CI package matrices, publish/preflight docs, and local governance must stay in lockstep with this list.

These live publishable plugin packages now match the current package canon for domain-grouped `src/runtime/` code and flat default `src/test/` coverage.

In the live host-backed package, the current runtime domains are grouped under:
- `src/runtime/host/`
- `src/runtime/node/`
- `src/runtime/planning/`
- `src/runtime/repo/`

In the live planner package, the current runtime domains are grouped under:
- `src/runtime/planning/`
- `src/runtime/state/`

In the live canon package, the current runtime domains are grouped under:
- `src/runtime/doctor/`
- `src/runtime/fix/`
- `src/runtime/report/`
- `src/runtime/state/`
- `src/runtime/status/`

In the live session-bloat warning package, the current runtime domains are grouped under:
- `src/runtime/core/`
- `src/runtime/config/`
- `src/runtime/hooks/`
- `src/runtime/state/`
- `src/runtime/text/`

Future plugin packages in this repository should follow the same package-shape baseline unless a narrower canon update replaces it.

## Boundary Note

Upstream `openclaw/openclaw` shows colocated `*.test.ts` files in its own repo guidance.

This repository intentionally uses a different local canon:
- `src/runtime/` for production runtime code
- `src/test/` for test files

That divergence is deliberate and local to this repository.

## Required Package Shape

Plugin packages should use this baseline layout:

- `src/runtime/`
- `src/test/`
- `src/types/`
- `skills/`
- `README.md`
- `LICENSE`
- `.npmignore`
- `openclaw.plugin.json`
- `package.json`
- `tsconfig.json`
- `tsconfig.build.json`

`src/index.ts` and package entrypoints are allowed when they reflect the real shipped contract.

For publishable plugin packages in this repo, package-local `.npmignore` should explicitly allow the shipped `dist/**` output and other packed artifacts so repo-root ignores do not strip built files from npm or ClawHub tarballs.

For linked local installs into a separate runtime environment such as a Docker gateway:
- treat `dist/**`, `openclaw.plugin.json`, `package.json`, bundled `skills/**`, `README.md`, and `LICENSE` as the canonical shipped runtime surface
- do not treat a host-copied dev `node_modules` tree as part of the canonical shipped surface
- if a runtime-local linked install needs `node_modules`, rebuild the minimal runtime dependency tree inside that runtime environment so ownership matches the runtime user and safety scans do not trip on host-only uid/gid artifacts
- for this repo's current plugin packages, `pnpm install --prod --frozen-lockfile --ignore-scripts` is the preferred target-local repair path before the final linked install

For every live publishable plugin package in the canonical list above:
- CI must run the full plugin verification minimum, including `pnpm pack:smoke`
- repo-level publish/preflight docs must enumerate that package as a live publish surface
- if package canon, CI coverage, and publish docs drift apart, treat that as packaging drift rather than docs-only drift

## Test Layout Canon

Rules:
- `src/runtime/` contains only production runtime code
- `src/test/` contains only test files
- test files are flat in `src/test/` by default
- do not introduce `unit/` and `integration/` as default nesting unless a real need appears

Shared test directories:
- `src/test/fixtures/`
- `src/test/helpers/`
- `src/test/mocks/` only when shared mock or stub builders are actually needed

Shared-directory rules:
- each shared test directory must contain a `README.md`
- each `README.md` explains what belongs there, how to reuse existing assets, and when new files are justified
- default policy is `reuse first`

## Runtime Reuse Canon

Rules:
- repeated runtime logic must be extracted
- do not create generic dump files such as `helpers.ts`, `utils.ts`, `shared.ts`, or `common.ts`
- extract only into domain-named runtime modules

Extraction is required when at least one of these is true:
- logic already repeats
- logic is long enough to obscure the main scenario
- logic expresses a shared invariant
- logic is a reusable formatter, parser, validator, or resolver

Extraction is not required when all of these are true:
- logic is local to one module
- logic stays short and readable
- there is no confirmed second usage
- extraction would create an abstraction with no present need

Good module names:
- `git-binaries.ts`
- `node-browser-support.ts`
- `command-format.ts`
- `repo-paths.ts`
- `plan-summary.ts`

Bad module names:
- `helpers.ts`
- `utils.ts`
- `shared.ts`
- `common.ts`

## README Policy

Rules:
- package root `README.md` is required
- directory `README.md` is allowed only for a real directory-level boundary or shared policy surface
- do not create README files for decoration
- if a directory is already obvious from file names and carries no special policy, a directory README is unnecessary
