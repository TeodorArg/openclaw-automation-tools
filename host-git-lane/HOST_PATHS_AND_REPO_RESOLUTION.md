# Host Paths And Repo Resolution

This companion layer documents the host and container path model used by the host-backed lane.

## Canonical Host Paths

- config root: `/Users/svarnoy85/OpenClaw-config`
- workspace root: `/Users/svarnoy85/OpenClaw-workspace`
- product repo: `/Users/svarnoy85/teodorArg/OpenClaw`

## Canonical Container Paths

- config root in container: `/home/node/.openclaw`
- workspace root in container: `/home/node/workspace`
- project root in container: `/home/node/project`

## Repo Resolution Rule

When a workflow depends on host-backed execution:
- resolve the canonical repo from the configured host/project path first
- do not treat generated install metadata as canonical source
- do not treat `process.cwd()` as repo truth by default

## Non-Source Paths

- installed extension output under config directories is runtime evidence, not canonical source
- archive source paths recorded by plugin inspect are install metadata, not sufficient proof of live source
