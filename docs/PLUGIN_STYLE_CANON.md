# Plugin Style Canon

Date: 2026-04-17  
Status: active repo-level canon

## Scope

This document defines the local naming, function-shape, typing, module, and error-model canon for plugin packages in this repository.

## Rollout Status

This canon is active as repository policy.

Machine enforcement is still being converged.

Until a shared repo-level Biome configuration is materialized, enforcement remains split between existing package scripts, TypeScript strict mode, review, and follow-up canon rollout work.

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
