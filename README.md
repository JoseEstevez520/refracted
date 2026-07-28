# refracted

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/refracted.svg)](https://www.npmjs.com/package/refracted)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

**One document. Many readings.**

An MCP server that extracts multiple deterministic views from a single markdown file.
No LLM at read time — just a parser that knows where to look.

---

## The idea

A single markdown file can serve a trainee, an auditor, and an operator — showing each
exactly what they need — without maintaining separate copies or a database.

The document embeds role visibility through three invisible mechanisms that any standard
markdown renderer ignores silently:

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1 — Frontmatter YAML                             │
│  ─────────────────────────────────────────────────────  │
│  type, version, created, modified                       │
│  facts:  [ { id, value, unit, ... } ]                   │
│  roles:  { training: [core, training], auditor: [...] } │
└─────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 2 — Role Blocks (HTML comments)                  │
│  ─────────────────────────────────────────────────────  │
│  <!-- @role: core training -->                          │
│  ## Temperature Checks                                  │
│  ...content...                                          │
│  <!-- @/role -->                                        │
└─────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 3 — Relations (link reference definitions)       │
│  ─────────────────────────────────────────────────────  │
│  [rel:checklist_v1]: # "supersedes v1 after incident"   │
│  [rel:summer_protocol]: # "simplifies in summer"        │
└─────────────────────────────────────────────────────────┘
```

A deterministic parser extracts a different view depending on who's asking.

---

## How it works

```
 markdown file on disk
        │
        ▼
  ┌──────────────┐
  │    parser    │  reads frontmatter → role table
  │              │  scans role blocks → visible ranges
  │              │  extracts relations → semantic graph
  └──────┬───────┘
         │
    role: "training"
         │
         ▼
  ┌──────────────┐
  │  role filter │  keeps only blocks where tag ∈ role's allowed list
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  MCP tool    │  returns tree / section / facts / relations / meta
  └──────────────┘
```

No generation. No inference. Every read is pure, fast, and reproducible.

---

## Format at a glance

```markdown
---
type: protocol
version: "2.1"
created: 2025-09-01
modified: 2026-03-15

facts:
  - id: temp-max       # structured data point
    value: 5
    unit: "C"
  - id: incident-march
    date: 2026-03
    cost: 340
    cause: compressor

roles:
  training: [core, training]   # trainee sees "core" and "training" blocks
  auditor:  [core, audit]      # auditor sees "core" and "audit" blocks
---

<!-- @role: core -->
# Opening Protocol

Daily opening procedure.
<!-- @/role -->

<!-- @role: core training -->
## Temperature Checks

Check cold room temps every morning. Max: 5°C.
<!-- @/role -->

<!-- @role: audit -->
## Incident History

2026-03: Cold room 2 failed overnight. Cost: 340 EUR.
<!-- @/role -->

[rel:checklist_v1]: # "added compressor check that v1 didn't have"
[rel:summer_protocol]: # "simplifies in summer"
```

---

## What each role sees

| Section             | training | auditor | operations |
|---------------------|:--------:|:-------:|:----------:|
| Opening Protocol    | yes      | yes     | yes        |
| Temperature Checks  | yes      | —       | yes        |
| Incident History    | —        | yes     | yes        |
| Facts & Relations   | yes      | yes     | yes        |

Same file. Different views. Zero duplication.

---

## Tools

### `refracted_tree`

Returns the heading structure of a file, filtered by role, with token estimates.

```
Input:  { file: "/path/doc.md", role: "training" }

Output:
  File: /path/doc.md
  Role: training (sees: core, training)
  Full file: ~450 tokens
  This tree: ~25 tokens
  Savings: ~94%

  # Opening Protocol  (~120 tok)
    ## Temperature Checks  (~85 tok)
```

### `refracted_section`

Reads a specific section. Fuzzy heading match. Role filter determines access.

```
Input:  { file: "/path/doc.md", heading: "temperature", role: "training" }
Output: full section content

Input:  { file: "/path/doc.md", heading: "incident history", role: "training" }
Output: No section matching "incident history" found for role "training".
```

### `refracted_facts`

Extracts structured key-value facts from frontmatter.

```
Input:  { file: "/path/doc.md" }

Output:
  Found 2 fact(s):

  - temp-max
    id: temp-max
    value: 5
    unit: C

  - incident-march
    id: incident-march
    date: 2026-03
    cost: 340
    cause: compressor
```

### `refracted_relations`

Extracts semantic links to other documents.

```
Input:  { file: "/path/doc.md" }

Output:
  Found 2 relation(s):

  - checklist_v1: "added compressor check that v1 didn't have"
  - summer_protocol: "simplifies in summer"
```

### `refracted_meta`

Returns document metadata and the role visibility table.

```
Input:  { file: "/path/doc.md" }

Output:
  ## Document Metadata
  Type: protocol
  Version: 2.1
  Created: 2025-09-01

  ## Role Table
  - training: [core, training]
  - auditor:  [core, audit]
```

---

## Installation

### From npm (MCP client config)

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

Then point your MCP client to `dist/index.js`:

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

---

## Recommended workflow

```
1. refracted_meta    → understand the document: what type, what roles exist
2. refracted_tree    → see the structure (with role= to filter)
3. refracted_section → read only what you need
4. refracted_facts   → extract structured data points
5. refracted_relations → traverse the document graph
```

---

## Philosophy

Memory is not a place to store things — it's a way of reading what already exists.

A single document encodes different perspectives simultaneously. The reader brings a
role; the parser brings a lens. Neither the file nor the tool holds the complete picture
alone. They converge on read.

This is why refracted does no generation and holds no state between reads. The document
is the source. The role is the argument. The view is the output.

---

## What it is NOT

- **Not an LLM.** Zero inference at read time. Pure regex + YAML.
- **Not an access control system.** Roles are advisory labels, not security. Anyone with the file has the file.
- **Not a template engine.** It reads documents differently; it doesn't generate them.
- **Not a database.** Facts are structured YAML, not a query engine.

---

## Development

```bash
npm install
npm run build   # compile TypeScript → dist/
npm test        # run parser tests
npm run dev     # watch mode
```

## Documentation

- [`docs/format.md`](docs/format.md) — full format specification
- [`docs/tools.md`](docs/tools.md) — tool reference
- [`examples/`](examples/) — annotated example documents

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

[MIT](LICENSE)
