# Confirmed Plan Format

This document defines the canonical structured plan payload created by planning and accepted by execute.

## Purpose

Execution in the main workflow must not be reconstructed from free-form user text.
Execute should run only from a prepared and explicitly confirmed structured plan.

## Execution model

Fixed model:
- plan
- confirm
- execute

Internal execute under `send_to_git` may run only from a confirmed plan payload.

## Canonical shape

Confirmed plan is a JSON document.

```json
{
  "version": 1,
  "repoPath": "/abs/path/to/active-repo",
  "status": "confirmed",
  "sourceCommand": "send_to_git",
  "groups": [
    {
      "id": "group-1",
      "branch": "docs/update-bundled-workflow-skill",
      "files": ["plugin/skills/openclaw-git-workflow/SKILL.md"],
      "commit": {
        "title": "docs(workflow): update bundled workflow skill",
        "body": "Update the bundled workflow skill wording.\n- Keep the bundled skill path explicit.\n- Preserve the bounded plan-to-execute contract.\n- Avoid widening the main workflow scope.\n- Leave push and PR outside the main workflow."
      }
    }
  ]
}
```

## Required top-level fields

- `version`: integer, currently only `1`
- `repoPath`: absolute target repo path
- `status`: must be exactly `confirmed`
- `sourceCommand`: normalized planning source that produced the plan, typically a canonical intent id or normalized alias
- `groups`: non-empty array of execution groups

## Required group fields

Each group must contain:
- `id`: stable local group id
- `branch`: validated branch name in canonical `<type>/<scope>-<short-kebab>` form
- `files`: non-empty array of repo-relative file paths
- `commit.title`: canonical commit title in `<type>(<scope>): <short summary>` form
- `commit.body`: short intro line plus exactly 4 short bullet points

## Validation rules

Before execute, runtime must validate:
- JSON parses successfully
- `version === 1`
- `status === "confirmed"`
- `repoPath` matches the active target repo selected at runtime
- `groups.length >= 1`
- every group id is unique inside the plan
- every branch name is unique inside the plan
- every file path is repo-relative and stays inside repo root
- group file lists do not contain duplicates
- branch names contain only allowlisted characters and match the repo branch convention
- commit title matches allowed commit format
- commit body is present and follows the canonical short-body shape

## Rejections

Execution must fail closed when:
- the payload is free-form prose instead of structured JSON
- plan status is not `confirmed`
- fields are missing
- any branch name is unsafe or malformed
- any file escapes the repo root
- commit title/body is malformed
- requested action would imply push or PR behavior

## Storage and handoff

The planning step may render the plan for the user in a readable way, but execute must consume the structured payload, not the prose rendering.

For `send_to_git`, the planning output should already include a ready-to-confirm payload in this exact shape.
That lets the assistant or user review a readable plan and then confirm the same structured payload for internal execute without reconstructing it from prose.

## Boundary

This format exists only to support bounded branch + commit execution from a confirmed plan.
Push and PR handoff belong to separate bridge layers outside the main branch + commit execution surface.
