<p align="center">
  <img src="assets/refracted-banner.svg" alt="Refracted — one document, many readings" width="100%" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/refracted"><img src="https://img.shields.io/npm/v/refracted?color=7c5cff&label=npm" alt="npm version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-20b9c5" alt="MIT license" /></a>
  <img src="https://img.shields.io/badge/node-%E2%89%A518-3c873a" alt="Node.js 18 or later" />
  <img src="https://img.shields.io/badge/MCP-server-8d62ff" alt="MCP server" />
</p>

<p align="center"><strong>One document. Many readings.</strong></p>

**refracted** is an MCP server for role-aware Markdown. It gives each reader the right view of the same document using deterministic parsing—no LLM, no duplicated files, and no inference at read time.

> **Use it when a policy, runbook, or protocol needs tailored views for training, operations, audit, or any other role.**

## Why refracted?

| One source of truth | Role-aware reading | Document intelligence |
| :--- | :--- | :--- |
| Keep policies, runbooks, and protocols in one Markdown file. | Expose only the sections a requested role should see. | Explore facts, relations, entities, timelines, and document graphs. |

Your Markdown remains completely readable in GitHub and other standard renderers. refracted recognizes three unobtrusive conventions:

1. **YAML frontmatter** for metadata, facts, and the role table.
2. **HTML comments** for section-level visibility (`<!-- @role: X -->`).
3. **Link reference definitions** for semantic document relationships.

## At a glance

```text
one Markdown document
        │
        ├── training   → core procedures + training guidance
        ├── auditor    → core procedures + audit history
        └── operations → the context needed to run the work
```

## Quick start

Add refracted to your MCP client configuration:

```json
{
  "mcpServers": {
    "refracted": {
      "command": "npx",
      "args": ["-y", "refracted"]
    }
  }
}
```

Then let your MCP client inspect a refracted document. A practical workflow is:

1. `refracted_meta` — discover the document and roles.
2. `refracted_tree` — see the accessible structure for a role.
3. `refracted_section` — retrieve only the section you need.
4. `refracted_graph` or `refracted_crossdoc` — navigate related documents when context spans files.

## Document format

```markdown
---
type: protocol
version: "2.1"

facts:
  - id: temp-max
    value: 5
    unit: "C"

roles:
  training: [core, training]
  auditor: [core, audit]
---

<!-- @role: core -->
# Opening Protocol

Daily opening procedure.
<!-- @/role -->

<!-- @role: core training -->
## Temperature Checks

Check cold room temps every morning.
<!-- @/role -->

<!-- @role: audit -->
## Incident History

Cold room 2 failed. Cost: 340 EUR.
<!-- @/role -->

[rel:checklist_v1]: # "added compressor check that v1 didn't have"
```

`training` sees **Opening Protocol** and **Temperature Checks**. `auditor` sees **Opening Protocol** and **Incident History**. One file; deliberate, role-specific views.

Read the full [format specification](docs/format.md) for all rules and examples.

## MCP tools

| Tool | Purpose | Role-aware |
| :--- | :--- | :---: |
| `refracted_tree` | Heading tree with token estimates. | Yes |
| `refracted_section` | Fuzzy-matched section reader. | Yes |
| `refracted_facts` | Structured YAML fact extraction. | — |
| `refracted_relations` | Semantic relation extraction. | — |
| `refracted_meta` | Metadata and role table. | — |
| `refracted_graph` | Multi-file relation graph traversal. | — |
| `refracted_entities` | `[[wikilink]]` entities by section. | Yes |
| `refracted_timeline` | Chronological view from dates and facts. | — |
| `refracted_diff` | Structural-change detection using local snapshots. | — |
| `refracted_crossdoc` | Documents that reference a chosen target. | — |

See [the core tool reference](docs/tools.md) for reader parameters and output examples.

## Install from source

```bash
git clone https://github.com/JoseEstevez520/refracted.git
cd refracted
npm install
npm run build
```

Then point your MCP client at the built server:

```json
{
  "mcpServers": {
    "refracted": {
      "command": "node",
      "args": ["/absolute/path/to/refracted/dist/index.js"]
    }
  }
}
```

## What refracted is not

- **Not an LLM.** Zero inference at read time: pure parsing and YAML.
- **Not an access-control system.** Roles are advisory labels, not security boundaries. Anyone with the file can read the file.
- **Not a template engine.** It reads documents differently; it does not generate them.
- **Not a database.** Facts are simple YAML records, not a query engine.

## Development

```bash
npm install
npm run build      # compile TypeScript
npm test           # run tests
npm run dev        # watch mode
```

## Explore the project

- [Format specification](docs/format.md)
- [Tool reference](docs/tools.md)
- [Example documents](examples/)
- [Contributing guide](CONTRIBUTING.md)

## License

[MIT](LICENSE)
