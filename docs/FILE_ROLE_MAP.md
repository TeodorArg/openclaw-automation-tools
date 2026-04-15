# File Role Map

This file defines what the repo currently contains and what each area is responsible for.

## Design basis

This repo canon should describe the active container-visible repo and runtime shape without depending on one operator-specific absolute path example.
When host-backed actions matter, keep host paths as explicit examples or operator inputs rather than as the main repo identity.

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
- reduce future drift as the implemented baseline evolves

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

Current content in the implemented baseline:
- `skills/openclaw-git-workflow/SKILL.md`
- optional `references/` under that skill for repo-specific workflow details when a narrow repo-specific note is useful

### `plugin/`
Purpose:
- home for the small supporting plugin that carries the execute-mode tool surface
- should stay minimal and exist only as bounded runtime support for execute
- plugin manifest must include `configSchema`, even when empty, so live OpenClaw install/load succeeds
- generated `dist/` output from this package is not the canonical fix target when a bug is first discovered there; durable fixes belong in source plus package/build definitions

Current content in the implemented baseline:
- `plugin/EXECUTE_SURFACE.md`
- `plugin/openclaw.plugin.json`
- `plugin/package.json`
- `plugin/index.ts`
- `plugin/api.ts`
- `plugin/tsconfig.json`
- `plugin/tsconfig.build.json`
- `plugin/.gitignore`
- `plugin/src/index.ts`
- `plugin/src/git-workflow-tool.ts`
- `plugin/src/runtime/validate-confirmed-plan.ts`
- `plugin/src/types/openclaw-plugin-sdk.d.ts`

### `scripts/`
Purpose:
- bounded helper scripts only
- no generic shell trampoline
- scripts should correspond to explicit allowlisted actions
- if behavior appears wrong first in copied/generated script output, trace back to the canonical script or source generator instead of normalizing the artifact patch

Current baseline content and rules:
- `scripts/git-create-branch.sh`
- `scripts/git-create-commit.sh`
- prefer several narrow scripts over one large dispatcher
- do not treat any push helper as part of the main public v1 branch+commit execute surface; if retained, it belongs to the separate optional bounded bridge track that already covers the proven host-backed finish path

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
The current environment already has a proven separate optional host-backed finish path for grouping -> branches -> push -> PR into `main`, with PR approval/review still remaining as the manual GitHub step. That should be treated as a factual constraint when describing future bounded actions.

### GitHub CLI
The container runtime should still not be treated as the baseline place for PR creation in the first implementation slice. Any working `gh`-backed push/PR flow belongs to the optional internal `plugin-host-git-push/` bridge track, not to the main public v1 workflow surface.

### Workspace bootstrap memory hygiene
For the surrounding assistant workspace used to build this repo, `MEMORY.md` should stay a compact durable index, while long logs and detailed history belong in `memory/*.md`. This reduces bootstrap truncation and keeps continuation turns more stable.
