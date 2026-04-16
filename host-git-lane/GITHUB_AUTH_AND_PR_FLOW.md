# GitHub Auth And PR Flow

This file captures the durable host-backed GitHub and PR flow used by this repo family.

## Auth Canon

- preferred forge: GitHub
- preferred PR CLI: `gh`
- preferred git auth on host: SSH

## Host-Side Flow

1. create a dedicated branch
2. commit the unit slice with canonical title and body
3. push the branch on the host-backed lane
4. open the PR into `main`
5. poll PR checks until green or a fix cycle is needed
6. merge into `main`
7. update local `main`

## SSH Guidance

- use a host-side SSH key for GitHub auth
- verify auth with `ssh -T git@github.com`
- prefer SSH remotes over HTTPS for the repo

## PR Guidance

- PR target is `main`
- keep each PR scoped to one coherent change
- include verification results and any package/publication caveats
