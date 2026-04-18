# pr-lane

Purpose:

- Handle host-backed GitHub PR flow and post-merge sync only.
- In this repo, `отправь в гит` means `pr-lane` should continue through PR creation, check polling, merge, and post-merge `main` sync unless the user explicitly narrows the scope.

Allowed work:

- create PRs against `main`
- preserve informative PR titles that identify the owning package slug or explicit repo surface; if the incoming title is too generic for the touched surface, stop and send it back for local git-lane regrouping before merge flow continues
- inspect PR status and check runs
- wait for merge readiness and report failing checks
- follow the repo poll cadence: first check after 15 seconds, then every 10 seconds while checks remain `IN_PROGRESS`
- merge the PR when checks are green and no blocker remains
- do not auto-delete the branch during PR merge unless the user explicitly requests branch deletion
- pull updated `main` after merge on the host-backed lane
- treat merge plus local `main` sync as the completion boundary for a dependent execution slice

Not allowed:

- rewrite feature implementation
- edit package contents as part of review
- perform broad local git surgery unrelated to PR flow
- authenticate git or GitHub inside runtime/container

Handoff:

- receive a PR-ready branch from `git-lane` or the top-level agent
- return merge status and refreshed `main` state to the top-level agent
- do not treat an opened PR without merge and local `main` sync as the finished state for a dependent slice
