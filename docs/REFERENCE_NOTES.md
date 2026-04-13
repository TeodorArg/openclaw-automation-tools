# Reference Notes

## Reference-only repo

Use `/Users/svarnoy85/teodorArg/openclaw-host-git-push` as a reference source only.

It is useful for:
- prior bounded runtime ideas
- existing adapter flow patterns
- repo state checks
- historical experiments around tool path vs command path

It should not be treated as the implementation base for the new repo.

## Why it is reference-only

- the user chose to stop building on the blocked plugin-command path
- the new repo is intended to be skill-first
- old code may still contain transitional assumptions from the older runtime/plugin direction

## What may be reused conceptually

- bounded action patterns
- repo-state inspection logic
- remote-selection logic if still valid
- Plan A push concepts that do not rely on the blocked command-path bridge

## What should not be carried forward blindly

- plugin command-path assumptions
- host-helper/autoload patterns
- any design that requires an always-on macOS helper app/node installed in autoload/bin style
- any assumption that container `gh` auth is already solved
