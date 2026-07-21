# refracted

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/refracted.svg)](https://www.npmjs.com/package/refracted)

**One document. Many readings.**

An MCP server that enables multiple deterministic views of the same markdown file. No LLM at read time — just a parser that knows where to look.

## The idea

A single markdown file can serve different readers — a trainee, an auditor, an operator — without maintaining separate copies. The document embeds role visibility through three invisible mechanisms that any standard renderer ignores:

1. **Frontmatter YAML** — structured facts, role table, metadata
2. **HTML comments** — section-level visibility markers (`<!-- @role: X -->`)
3. **Link reference definitions** — semantic relations between documents

A deterministic parser extracts a different view depending on who's asking.

## The format

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

**Training** sees: Opening Protocol + Temperature Checks.
**Auditor** sees: Opening Protocol + Incident History.
Same file. Different views.

## Tools

### `refracted_tree`

Heading structure filtered by role, with token counts.

```
Input:  { file: "/path/doc.md", role: "training" }

Output:
  # Opening Protocol  (~120 tok)
    ## Temperature Checks  (~85 tok)
```

### `refracted_section`

Read a section's content. Role filter determines access.

```
Input:  { file: "/path/doc.md", heading: "temperature", role: "training" }
Output: Full section content (fuzzy heading match)

Input:  { file: "/path/doc.md", heading: "temperature", role: "auditor" }
Output: Access denied — section not visible to this role
```

### `refracted_facts`

Structured data from frontmatter.

```
Input:  { file: "/path/doc.md" }
Output:
  - temp-max: 5 C
  - incident-march: cost 340, cause compressor
```

### `refracted_relations`

Semantic links between documents.

```
Input:  { file: "/path/doc.md" }
Output:
  - checklist_v1: "added compressor check that v1 didn't have"
  - summer_protocol: "simplifies in summer"
```

### `refracted_meta`

Document metadata and the role visibility table.

```
Input:  { file: "/path/doc.md" }
Output:
  Type: protocol, Version: 2.1
  Roles: training [core, training], auditor [core, audit]
```

## Installation

### As an MCP server

Add to your MCP client configuration:

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

### From source

```bash
git clone https://github.com/JoseEstevez520/refracted.git
cd refracted
npm install
npm run build
```

Then configure your MCP client to use:

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

## What it's NOT

- **Not an LLM.** Zero inference at read time. Pure regex + YAML parsing.
- **Not an access control system.** Roles are advisory labels, not security boundaries. If someone has the file, they have the file.
- **Not a template engine.** It doesn't generate documents. It reads them differently.
- **Not a database.** Facts are simple key-value pairs in YAML, not a query engine.
- **Not a replacement for file-reading tools.** Use it when documents have embedded structure. For plain markdown, use your regular tools.

## Format specification

See [`docs/format.md`](docs/format.md) for the complete specification of frontmatter schema, role block syntax, and relation definitions.

## Development

```bash
npm install
npm run build      # compile TypeScript
npm test           # run tests
npm run dev        # watch mode
```

## License

[MIT](LICENSE)
