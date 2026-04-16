# Host Paths And Repo Resolution

This companion layer documents the host and container path model used by the host-backed lane.

## Placeholders

- `<OPENCLAW_CONFIG_ROOT>`: host config root
- `<OPENCLAW_WORKSPACE_ROOT>`: host workspace root
- `<OPENCLAW_PROJECT_ROOT>`: host product repo root
- `<CONTAINER_OPENCLAW_CONFIG_ROOT>`: container config root
- `<CONTAINER_OPENCLAW_WORKSPACE_ROOT>`: container workspace root
- `<CONTAINER_OPENCLAW_PROJECT_ROOT>`: container product repo root

## Canonical Host Paths

- config root: `<OPENCLAW_CONFIG_ROOT>`
- workspace root: `<OPENCLAW_WORKSPACE_ROOT>`
- product repo: `<OPENCLAW_PROJECT_ROOT>`

## Canonical Container Paths

- config root in container: `<CONTAINER_OPENCLAW_CONFIG_ROOT>`
- workspace root in container: `<CONTAINER_OPENCLAW_WORKSPACE_ROOT>`
- project root in container: `<CONTAINER_OPENCLAW_PROJECT_ROOT>`

## Repo Resolution Rule

When a workflow depends on host-backed execution:
- resolve the canonical repo from the configured host/project path first
- do not treat generated install metadata as canonical source
- do not treat `process.cwd()` as repo truth by default

## Non-Source Paths

- installed extension output under config directories is runtime evidence, not canonical source
- archive source paths recorded by plugin inspect are install metadata, not sufficient proof of live source
