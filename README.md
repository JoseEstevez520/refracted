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

**refracted** is an MCP server that gives every reader the right view of the same Markdown file. It applies deterministic role filters at read time—no LLM, no duplicated documents, and no inference.

> **Use it when one source document needs tailored views for different roles**: training, operations, audit, or any audience with distinct context needs.

## Why refracted?

| One source of truth | Role-aware reading | Predictable output |
| :--- | :--- | :--- |
| Keep policies, runbooks, and protocols in a single file. | Reveal only the sections a requested role should see. | A parser and YAML—not an LLM—produce the result. |

Your Markdown stays completely readable in GitHub and other standard renderers. refracted recognizes three unobtrusive conventions:

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

Then ask your MCP client to inspect a refracted Markdown document. A useful workflow is:

1. Call `refracted_meta` to discover the document and its roles.
2. Call `refracted_tree` with a role to see the accessible structure.
3. Call `refracted_section` only for the section you need.

## Document format

Here is a complete, small example:

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

`training` sees **Opening Protocol** and **Temperature Checks**. `auditor` sees **Opening Protocol** and **Incident History**. One file; different, intentional views.

For the full convention reference, see [the format specification](docs/format.md).

## MCP tools

| Tool | What it does | Role-aware |
| :--- | :--- | :---: |
| `refracted_tree` | Returns the heading tree with token estimates. | Yes |
| `refracted_section` | Returns a fuzzy-matched section. | Yes |
| `refracted_facts` | Extracts structured YAML facts. | — |
| `refracted_relations` | Extracts semantic link-reference relations. | — |
| `refracted_meta` | Returns metadata and the role visibility table. | — |

See [the tool reference](docs/tools.md) for request parameters and example responses.

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

- **Not an LLM.** Zero inference at read time. Pure regex and YAML parsing.
- **Not an access-control system.** Roles are advisory labels, not security boundaries. If someone has the file, they have the file.
- **Not a template engine.** It reads documents differently; it does not generate them.
- **Not a database.** Facts are simple key-value pairs in YAML, not a query engine.
- **Not a replacement for ordinary file reading.** Use it when Markdown has embedded structure.

## Development

```bash
npm install
npm run build      # compile TypeScript
npm test           # run tests
npm run dev        # watch mode
```

## Examples

Ready-to-use documents live in [`examples/`](examples/):

- [`protocolo_apertura.md`](examples/protocolo_apertura.md) — a role-aware opening protocol.
- [`checklist_v1.md`](examples/checklist_v1.md) — a related checklist with structured facts.
- [`protocolo_verano.md`](examples/protocolo_verano.md) — a seasonal variant linked to the base protocol.

## License

[MIT](LICENSE)
