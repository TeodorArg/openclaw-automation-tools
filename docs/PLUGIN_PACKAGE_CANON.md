# Plugin Package Canon

Date: 2026-04-17  
Status: active repo-level canon

## Scope

This document defines the local package-structure canon for plugin packages in this repository.

It is a repo-level policy, not a claim that every rule is mandated by upstream OpenClaw.

## Rollout Status

This canon is active as repository policy.

Implementation rollout across live package surfaces can lag behind the canon temporarily.

At the moment, the active `openclaw-host-git-workflow/` package still contains pre-canon colocated test files under `src/runtime/`.

That current layout is an implementation backlog item, not the target package canon.

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
- `openclaw.plugin.json`
- `package.json`
- `tsconfig.json`
- `tsconfig.build.json`

`src/index.ts` and package entrypoints are allowed when they reflect the real shipped contract.

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
