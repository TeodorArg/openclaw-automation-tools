# openclaw-workflow-planner direct-main recovery

Date: 2026-04-21

## Context

The `openclaw-workflow-planner` canon-state refactor landed directly in `main`
as commit `e7b7005`.

That bypassed the normal branch -> PR -> merge flow for this repo.

## Recovery intent

This recovery note exists to restore an explicit review trail after the already
landed planner slice.

It does not reopen the planner implementation slice, and it does not rewrite
shared `main` history.

## Recovery record

- landed commit already in `main`: `e7b7005`
- recovery type: repo-docs-only procedural follow-up
- no code revert
- no history rewrite
- no new planner product scope

## Forward rule

Follow-up work for `openclaw-workflow-planner` must continue through the normal
branch -> PR -> merge flow.
