# Refracted Format Specification

A markdown file using the refracted format embeds structured metadata through three invisible mechanisms. Any standard markdown renderer will display the document normally — the structure is invisible to readers but accessible to tools.

## 1. Frontmatter YAML

Standard YAML frontmatter delimited by `---`. Contains:

### Document metadata

```yaml
---
type: protocol
version: "2.1"
created: 2025-09-01
modified: 2026-03-15
---
```

All fields are optional. `type`, `version`, `created`, and `modified` are recognized as first-class fields. Any other keys are preserved as `extra`.

### Facts

Structured data points embedded in the document. Use `facts` (or the alias `hechos`):

```yaml
facts:
  - id: temp-max
    value: 5
    unit: "C"
  - id: incident-march
    date: 2026-03
    cost: 340
    cause: compressor
```

Each fact must have an `id`. All other fields are free-form.

### Role visibility table

Maps role names to arrays of section tags:

```yaml
roles:
  training: [core, training]
  auditor: [core, audit]
  operations: [core, training, audit]
```

Each role sees only the content inside `<!-- @role: X -->` blocks where X is one of their allowed tags.

## 2. Role blocks (HTML comments)

Sections of the document are wrapped in HTML comment markers:

```markdown
<!-- @role: core training -->
## Temperature Checks

Content visible to roles that include "core" or "training" in their tag list.
<!-- @/role -->
```

**Rules:**
- Opening marker: `<!-- @role: tag1 tag2 ... -->`
- Closing marker: `<!-- @/role -->`
- Tags are space-separated
- A block is visible to a role if ANY of the block's tags is in the role's allowed list
- Blocks do not nest (each block is independent)
- If a block is never closed, it extends to EOF
- These comments are invisible in standard markdown renderers

## 3. Relation definitions (link references)

Semantic relationships between documents use the link reference definition syntax:

```markdown
[rel:checklist_v1]: # "added compressor check that v1 didn't have"
[rel:summer_protocol]: # "simplifies in summer because the base protocol is too slow"
```

**Format:** `[rel:TARGET]: # "DESCRIPTION"`

- `TARGET` is the related document name (no extension needed)
- `DESCRIPTION` is a free-form natural language description of the relationship
- The `#` as URL means the link resolves to nothing — it's metadata only
- These are invisible in any standard markdown renderer (they're link reference definitions that no inline link uses)

## Complete example

```markdown
---
type: protocol
version: "2.1"
created: 2025-09-01
modified: 2026-03-15

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

2026-03: Cold room failure. Cost: 340 EUR.
<!-- @/role -->

[rel:checklist_v1]: # "implements the base checklist"
```

In this example:
- A **training** role sees: Opening Protocol + Temperature Checks
- An **auditor** sees: Opening Protocol + Incident History
- The facts and relations are accessible to any tool regardless of role
