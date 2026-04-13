# Confirmed Plan Format

Этот документ задаёт канонический внутренний формат плана, который planning step создаёт, а execute step принимает.

## Purpose

Execution в v1 не должен строиться из свободного текста пользователя.
Execution должен работать только по заранее подготовленному и явно подтверждённому structured plan.

## Execution model

Фиксированная модель v1:
- plan
- confirm
- execute

`выполни git-группы с ветками` может выполняться только по confirmed plan payload.

## Canonical shape

Подтверждённый план хранится как JSON-документ.

```json
{
  "version": 1,
  "repoPath": "/home/node/repos/openclaw-git-workflow",
  "status": "confirmed",
  "sourceCommand": "разложи по git-группам с ветками",
  "groups": [
    {
      "id": "group-1",
      "branch": "docs/skills-add-openclaw-git-workflow-skill",
      "files": ["skills/openclaw-git-workflow/SKILL.md"],
      "commit": {
        "title": "feat(skills): add openclaw git workflow skill",
        "body": "Add the first bounded skill entry for the workflow.\n- Define the canonical slash-command surface.\n- Keep execution separate from free-form text.\n- Route command handling into a bounded tool contract.\n- Leave push and PR work out of v1."
      }
    }
  ]
}
```

## Required top-level fields

- `version`: integer, currently only `1`
- `repoPath`: absolute target repo path
- `status`: must be exactly `confirmed`
- `sourceCommand`: planning command that produced the plan
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
- `repoPath` matches the active target repo
- `groups.length >= 1`
- every file path is repo-relative and stays inside repo root
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

v1 does not require long-term persistence format beyond a structured JSON payload.
The planning step may render the plan for the user in a readable way, but execute must consume the structured payload, not the human prose rendering.

## First-slice boundary

This format is intentionally minimal.
It exists only to support bounded branch + commit execution from a confirmed plan.
Push and PR handoff are future separate layers.
