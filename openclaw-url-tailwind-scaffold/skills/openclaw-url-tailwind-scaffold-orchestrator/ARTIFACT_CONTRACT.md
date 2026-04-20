# Artifact Contract

This contract belongs to the orchestration layer above `url_tailwind_scaffold_action`.

The plugin returns analyzer output. The top-level agent or skill may persist artifacts when the host runtime exposes writable files. If file writing is unavailable, return the same payloads inline.

## Directory Shape

```text
artifacts/
  <host>/
    <page-slug>/
      page-summary.md
      page-contract.json
      orchestration-plan.md
      islands/
        <island-id>.md
      tailwind/
        tokens.json
        components.json
        scaffold-plan.md
```

## File Roles

`page-summary.md`
- source URL and final URL
- fetch status and acquisition mode
- page type and shell composition
- matched vs inferred islands
- token synthesis summary

`page-contract.json`
- raw machine-readable `page_contract`
- keep `schemaVersion`
- do not rewrite field names

`orchestration-plan.md`
- which islands were split into separate lanes
- ownership map for each island lane
- whether execution stayed single-lane or used spawned subagents
- unresolved constraints such as missing session tools or no writable files

`islands/<island-id>.md`
- island purpose
- selectors and anchors
- key nodes
- token refs
- Tailwind utility candidates for the island
- ambiguities and confidence

`tailwind/tokens.json`
- synthesized token groups from `page_contract.tokens`
- keep group names stable: `colors`, `spacing`, `typography`, `radius`, `shadows`

`tailwind/components.json`
- one object per island
- include `islandId`, `regionType`, `tokenRefs`, `container`, `surface`, `spacing`, `typography`, `keyNodes`

`tailwind/scaffold-plan.md`
- page-level Tailwind assembly notes
- shared shell token usage
- which islands can become reusable partials
- what still remains inferred

## JSON Shape Guidance

Use object properties and arrays with stable keys instead of prose-only blobs.
Keep `schemaVersion` at top level for machine-readable files.
Prefer bounded enums or fixed string values where the contract is stable.

Example `tailwind/components.json` shape:

```json
{
  "schemaVersion": 1,
  "components": [
    {
      "islandId": "island-content-1",
      "regionType": "content",
      "tokenRefs": ["color-panel-surface", "type-shell-title"],
      "container": ["flex-1", "space-y-6", "p-6"],
      "surface": ["bg-slate-900/60", "rounded-xl", "shadow-sm"],
      "spacing": ["space-y-6", "p-6"],
      "typography": ["text-base", "leading-7"],
      "keyNodes": [
        {
          "keyNodeId": "key-node-1",
          "role": "h1",
          "utilities": ["text-3xl", "font-semibold", "tracking-tight"]
        }
      ]
    }
  ]
}
```

## Ownership Rules

- parent lane owns page-level and tailwind-level files
- each worker lane owns only its own `islands/<island-id>.md`
- do not let workers overwrite `page-contract.json`
- do not widen one island lane into another island unless the parent explicitly reassigns ownership
