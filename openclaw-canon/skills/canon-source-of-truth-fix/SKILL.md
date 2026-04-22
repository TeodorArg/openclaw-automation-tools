---
name: canon-source-of-truth-fix
description: Use when canon work needs `canon_doctor scope=source` to diagnose source-of-truth or template drift and review proposal data without implying auto-apply.
user-invocable: true
command-dispatch: tool
command-tool: canon_doctor
command-arg-mode: raw
---

# Source Of Truth Fix

Use this bundled skill when the first visible problem shows up in an unstable,
generated, copied, or drifted surface and the durable source of truth must be
identified before any fix claim is made.

## Preferred tool mapping

- `canon_doctor` with `scope = "source"` for diagnosis-first source tracing
- `canon_status` for the latest known summary state after diagnosis

## Core rules

- Generated or copied output is evidence, not source of truth.
- The tool may identify candidate canonical targets and proposal data.
- It must not claim a durable fix until the owning canonical source is named.
- Initial shipped behavior is diagnosis-first and proposal-only for source drift.
- Installed plugin copies, active skill copies, and workspace canon notes are
  not automatic source-of-truth replacements for repo-owned canon files such as
  `docs/PLUGIN_PACKAGE_CANON.md`.
- If expected canon files are missing, `canon_doctor scope=source` reports
  typed manual-only findings with recommended path or restore actions; it does
  not auto-restore files.

## Source lookup order

1. local canon docs and manifests
2. real local source tree
3. official docs or upstream source when local files are insufficient

## Reporting contract

After acting, return:
1. unstable or drifted surface
2. confirmed or candidate source of truth
3. durable files that likely own the behavior
4. rebuild, restart, or redeploy follow-up when relevant
