# File Role Map

This file defines what the new repo should contain and what each area is responsible for.

## Design basis

This repo structure should stay aligned with:
- OpenClaw Skills docs (`/app/docs/tools/skills.md`)
- OpenClaw Slash Commands docs (`/app/docs/tools/slash-commands.md`)
- GitHub CLI reality in this environment
- Docker split-layer reality from the current OpenClaw setup
- SSH-agent forwarding constraints already validated for operator-side push

## Top-level layout

### `README.md`
Purpose:
- short project overview
- current status
- fixed decisions
- links to the deeper spec docs

### `docs/SKILL_SPEC.md`
Purpose:
- canonical description of what the skill must do
- plan-only vs execute behavior
- non-goals and security constraints

### `docs/REFERENCE_NOTES.md`
Purpose:
- record which old repos/docs are reference-only
- explain what can be reused conceptually and what should not be copied blindly

### `docs/FILE_ROLE_MAP.md`
Purpose:
- define the file responsibilities for the repo
- reduce future drift when implementation begins

### `docs/IMPLEMENTATION_SHAPE.md`
Purpose:
- define how skill, plugin, and scripts fit together
- record the minimal tool contract
- keep the fixed v1 execution model explicit

### `docs/CONFIRMED_PLAN_FORMAT.md`
Purpose:
- define the canonical structured plan payload for execute
- keep the `plan -> confirm -> execute` contract explicit
- prevent execution from being reconstructed from free-form user text

### `skills/`
Purpose:
- hold the actual OpenClaw skill directory or directories
- include `SKILL.md` files with valid frontmatter
- expose user-invocable skill commands

Expected content for the first slice:
- `skills/openclaw-git-workflow/SKILL.md`
- optional `references/` under that skill for repo-specific workflow details

### `plugin/`
Purpose:
- optional home for a small supporting plugin if a dedicated tool surface is needed
- should exist only if the skill needs custom tools or bounded runtime helpers for execute

Expected content for the first slice:
- `plugin/EXECUTE_SURFACE.md`
- later, if needed: tool definitions
- later, if needed: minimal runtime wiring
- later, if needed: plugin manifest/config

### `scripts/`
Purpose:
- bounded helper scripts only
- no generic shell trampoline
- scripts should correspond to explicit allowlisted actions

Expected content for the first slice:
- create-branch helper
- commit helper
- prefer several narrow scripts over one large dispatcher
- later: push-current-branch helper

## Rules for implementation

- Prefer workflow-level commands over raw git passthrough
- Keep skill UX separate from runtime implementation details
- Keep PR creation separate from the first slice
- Keep Docker, SSH-agent, and auth boundaries explicit in docs and code
- Do not introduce always-on macOS helper binaries, launch agents, or autoloaded node wrappers as part of the target architecture

## Notes on external realities

### OpenClaw skills
OpenClaw skills can be user-invocable and can declare `command-dispatch: tool`, which routes the slash command directly into the tool pipeline.

### OpenClaw skill commands
User-invocable skills are exposed as slash commands and may also be used via `/skill <name> [input]`.

### Docker and git execution
The current environment already has a validated operator-side git push path through the optional git layer and SSH-agent forwarding. That should be treated as a factual constraint when designing future bounded actions.

### GitHub CLI
The container runtime currently lacks working `gh` auth state, so PR-related flows should not be assumed to work in the first implementation slice.
