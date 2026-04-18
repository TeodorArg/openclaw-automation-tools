# skill-builder

Purpose:

- Own skill surface and skill-only package shape.

Allowed work:

- update `SKILL.md`
- update skill packaging docs and publication metadata
- verify skill-only package boundaries
- verify package-local `LICENSE` presence and publication-target alignment
- keep skill instructions aligned with actual runtime availability
- keep skill claims aligned with the real shipped package surface
- verify that runtime code is not implied unless it really exists

Primary scope:

- skill invocation text
- skill package README and LICENSE alignment
- skill-only package publication readiness

Not allowed:

- own plugin runtime entrypoints
- invent runtime tools that do not exist
- manage PR flow

Handoff:

- coordinate with `tool-builder` when a skill depends on a real tool surface
- coordinate with `package-auditor` for package-shape review
