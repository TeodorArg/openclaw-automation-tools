---
name: source-of-truth-fix
description: Use when a bug or fix is first discovered in generated, bundled, copied, packaged, or restart/build-overwritten output such as /app/dist, compiled bundles, Docker image output, caches, or packaged assets. Record the problem in TODO, find official docs and the real source of truth, then make the durable fix in canonical source instead of normalizing a temporary build-output patch.
---

# Source of Truth Fix

Use this skill when the first visible problem shows up in an unstable path that is likely to be regenerated or overwritten.

## Workflow

1. Treat the discovered generated path as evidence, not as the source of truth.
2. Add or update a TODO item that captures:
   - the user-visible bug
   - the unstable/generated path where it first appeared
   - the expected durable fix target if already known
3. Find the official source of truth before editing:
   - local official docs first
   - then the real local source tree
   - then Context7 for the official library/product docs
   - then official upstream sites/repos if still needed
4. Confirm whether the file is generated from `src/`, copied during packaging, produced by Docker/build tooling, or is runtime-only output.
5. Make the durable fix in the canonical source location.
6. If you apply a temporary patch in generated output for diagnosis or urgent mitigation, label it clearly as temporary and say it will be lost on rebuild/restart.
7. Tell the user whether rebuild, restart, or redeploy is required for the durable fix to take effect.

## Preferred tool behavior

- Prefer local OpenClaw docs first for OpenClaw behavior.
- Prefer Context7 for current official framework/library docs.
- Prefer official upstream docs/repos over random blog posts.
- Prefer `sessions_spawn` with agentId `build-safe-fixer` if the task looks long, multi-step, or likely to mix docs research with code changes.

## Do not

- Do not present `/app/dist` edits as the real fix unless the user explicitly asked for a disposable hotpatch.
- Do not stop at "I found the buggy built file".
- Do not silently skip the TODO step when the first hit is generated output.

## Good progress updates

- "Нашёл generated surface, ищу source of truth."
- "Сначала фиксирую проблему в TODO, потом иду в оф доки и source."
- "Временный patch возможен, но основной фикс должен идти в canonical source."
