# Plugin Style Canon

Date: 2026-04-18  
Status: active repo-level canon

## Scope

This document defines the local naming, function-shape, typing, module, and error-model canon for plugin packages in this repository.

## Rollout Status

This canon is active as repository policy.

Repo-wide machine enforcement is still partial.

Until a shared repo-level Biome configuration is materialized, enforcement remains split between existing package scripts, TypeScript strict mode, review, and follow-up canon rollout work.

The four live plugin packages already reflect the current domain-subdirectory runtime canon:
- `openclaw-host-git-workflow/`
- `openclaw-workflow-planner/`
- `openclaw-canon/`
- `openclaw-session-bloat-warning/`

Remaining convergence is primarily about broader repo-level machine enforcement rather than those packages' baseline layout.

## Naming Canon

Rules:
- file names use `kebab-case.ts`
- exported functions use `camelCase`
- exported functions use action-oriented verb prefixes
- boolean predicates use `is*`, `has*`, `can*`, or `should*`

Preferred prefixes:
- builders: `build*`, `create*`
- readers: `read*`
- resolvers: `resolve*`
- validators: `validate*`
- parsers: `parse*`
- normalizers: `normalize*`
- selectors: `select*`

Disallowed vague names without a narrow domain reason:
- `utils`
- `helpers`
- `common`
- `shared`
- `misc`
- `temp`
- `v2`
- `handleData`
- `processThing`
- `doStuff`
- `helper`

## Function Shape Canon

Rules:
- one function expresses one main action
- side effects and I/O must be visible from the function name
- pure computation should read like pure computation

Return types:
- exported functions that express runtime contracts should declare return types explicitly
- short local helpers may rely on inference when the result type is obvious

## Type Canon

Rules:
- `strict: true` is the required baseline
- `any` is disallowed by default
- use `unknown` for unknown inputs, then narrow or validate
- use discriminated unions for multi-variant state or result models

Preferences:
- prefer named domain types over anonymous inline contracts in exported APIs
- prefer precise object types over `Record<string, unknown>`, except for truly dynamic maps
- avoid `as` assertions when a guard, parser, or validator can express the same contract
- do not mix `null` and `undefined` without a clear reason
- do not combine optional fields with `| undefined` unless the contract requires it
- use `readonly` when it strengthens an immutability contract

Preferred domain-type style:
- `WorkflowIntent`
- `ConfirmedPlan`
- `RepoTarget`
- `HostNodeSelection`

## Module And Export Canon

Rules:
- one module expresses one responsibility
- do not export a mixed grab-bag surface
- do not create generic dump modules such as `types.ts`, `helpers.ts`, `utils.ts`, `common.ts`, or `shared.ts` without a narrow justified boundary
- export only real cross-module contracts
- do not export types or helpers speculatively

If several files belong to the same domain, prefer a domain subdirectory over a single dump file.

## Runtime Install Hygiene

Rules:
- generated or copied runtime-local artifacts are not source of truth
- do not rely on host-copied dev `node_modules` trees as stable runtime input for linked plugin installs into another environment
- when a separate runtime environment needs package dependencies for plugin discovery or execution, rebuild the minimal runtime dependency tree inside that environment instead of carrying over host-only ownership metadata

Preferred operational pattern:
- host machine builds canonical source outputs such as `dist/**`
- target runtime receives the package directory
- target runtime rebuilds runtime-only dependencies locally, for example with `pnpm install --prod --frozen-lockfile --ignore-scripts`
- final linked install runs after ownership and runtime-local dependency shape are clean

Avoid:
- treating container-local `node_modules` ownership drift as harmless if plugin safety scans or linked install checks consume that tree
- fixing repeated ownership failures by broad unsafe overrides when the real problem is a copied host dependency tree

## Skill Metadata Language

Rules:
- `SKILL.md` frontmatter `description:` is canonical operator-facing metadata and should default to English across shipped plugin packages
- do not rely on OpenClaw admin UI to auto-localize skill metadata by operator locale unless that support is explicitly implemented and documented
- localized guidance may exist in the skill body, examples, or runtime copy, but the default metadata line should stay stable and language-consistent across packages

## Error And Result Canon

Rules:
- do not throw strings
- do not use unstructured error paths
- expected runtime outcomes should prefer typed result models
- reserve exceptions for exceptional paths instead of using them as the default control flow

Shared error or result shapes:
- keep them local when they belong to one module only
- extract them when they are reused across modules or define a shared runtime contract
- do not create abstract dumping files like `errors.ts`, `results.ts`, `shared-errors.ts`, or `common-errors.ts`

Preferred result patterns:
- `{ ok: true, value: T } | { ok: false, reason: string }`
- discriminated unions with `kind` or `status`

Good module names:
- `plan-result.ts`
- `repo-resolution-result.ts`
- `node-binding-error.ts`
- `preflight-result.ts`

## Test Coverage Canon

Rules:
- tests cover both positive and negative contract paths
- coverage targets significant contract paths, not every imaginable branch in isolation

Minimum required categories per runtime module where applicable:
- happy path
- invalid input or validation failure
- expected negative branch
- boundary case
- regression case when a bug or drift was previously fixed

For typed results and discriminated unions:
- test both success and failure outcomes
- cover each significant variant
- preserve exhaustive behavior in practical scenarios, not only in types

## Enforcement

Style enforcement is documented now and is expected to become more fully machine-enforced as repo tooling converges.

Repository tooling should converge on a single Biome-based formatter and linter policy that expresses the active canon.
