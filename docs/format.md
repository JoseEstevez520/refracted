# Refracted Format Specification

A markdown file using the refracted format embeds structured metadata through three
invisible mechanisms. Any standard markdown renderer displays the document normally —
the structure is invisible to human readers but fully accessible to tools.

---

## 1. Frontmatter YAML

Standard YAML frontmatter delimited by `---`. Contains document metadata, structured
facts, and the role visibility table.

### Document metadata

```yaml
---
type: protocol
version: "2.1"
created: 2025-09-01
modified: 2026-03-15
---
```

All fields are optional. `type`, `version`, `created`, and `modified` are recognized as
first-class fields. Any other keys are preserved as `extra` and returned by
`refracted_meta`.

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
  - id: capacity
    value: 42
    unit: seats
```

Each fact must have an `id`. All other fields are free-form. Numeric values are
preserved as numbers; everything else becomes a string.

### Role visibility table

Maps role names to arrays of section tags:

```yaml
roles:
  training:   [core, training]
  auditor:    [core, audit]
  operations: [core, training, audit]
```

Each role sees only content inside `<!-- @role: X -->` blocks where X is one of the
role's allowed tags. A role that is not listed sees nothing.

---

## 2. Role blocks (HTML comments)

Sections are wrapped in HTML comment markers:

```markdown
<!-- @role: core training -->
## Temperature Checks

Check cold room temps every morning. If any exceeds 5°C,
notify Maintenance before continuing.
<!-- @/role -->
```

**Rules:**

- Opening marker: `<!-- @role: tag1 tag2 ... -->`
- Closing marker: `<!-- @/role -->`
- Tags are space-separated within the opening marker
- A block is visible to a role if ANY of the block's tags appears in the role's allowed list
- Blocks do not nest — each block is independent
- If a block is never closed, it extends to end of file
- HTML comments are invisible in all standard markdown renderers

**Access logic:**

```
role "training" has allowed tags: [core, training]

block <!-- @role: core -->       → visible  (core ∈ allowed)
block <!-- @role: training -->   → visible  (training ∈ allowed)
block <!-- @role: core training -->  → visible  (core ∈ allowed)
block <!-- @role: audit -->      → hidden   (audit ∉ allowed)
```

---

## 3. Relation definitions (link references)

Semantic relationships between documents use markdown link reference definition syntax:

```markdown
[rel:checklist_v1]: # "added compressor check that v1 didn't have"
[rel:summer_protocol]: # "simplifies in summer because the base protocol is too slow"
[rel:incident_2025_11]: # "same failure pattern: overnight compressor"
```

**Format:** `[rel:TARGET]: # "DESCRIPTION"`

- `TARGET` — the related document name (no extension needed)
- `DESCRIPTION` — free-form natural language description of the relationship
- The `#` as URL means the link resolves to nothing — it is metadata only
- These lines are invisible in any standard renderer (link reference definitions that no
  inline link uses are simply ignored)

Relations are extracted globally — they are not inside role blocks and are visible to
any caller regardless of role.

---

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
  - id: incident-march
    date: 2026-03
    cost: 340
    cause: compressor

roles:
  training:   [core, training]
  auditor:    [core, audit]
  operations: [core, training, audit]
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

[rel:checklist_v1]: # "implements the base checklist"
[rel:summer_protocol]: # "simplified version for high season"
```

**What each role sees:**

| Section            | training | auditor | operations |
|--------------------|:--------:|:-------:|:----------:|
| Opening Protocol   | yes      | yes     | yes        |
| Temperature Checks | yes      | —       | yes        |
| Incident History   | —        | yes     | yes        |

---

## Design Decisions

### Why HTML comments for role blocks?

HTML comments (`<!-- -->`) are the only markdown construct that is:

1. **Universally invisible** — GitHub, Obsidian, VS Code Preview, and every other
   renderer simply omit them. The document looks clean to human readers.
2. **Not ambiguous** — unlike YAML frontmatter extensions or custom directives, HTML
   comments are part of the CommonMark spec and behave identically across parsers.
3. **Easy to grep** — `grep -n '@role:'` finds every block opening instantly. No
   special tooling required to navigate the raw file.
4. **Not writable by accident** — a human writing prose will never accidentally emit
   `<!-- @role: X -->`. The syntax is unambiguous.

Alternatives considered: YAML multi-doc (`---` separator blocks), custom fenced code
blocks (```role:X), and div-style attributes (`:::role{name=X}`). All are either
non-standard, renderer-visible, or parser-fragile.

### Why link reference definitions for relations?

`[rel:target]: # "description"` exploits a CommonMark edge case: link reference
definitions that are never referenced by inline links are silently discarded by
renderers. They exist in the AST but produce zero output.

This gives us:

- **Zero visual noise** — they simply disappear in rendered output
- **Standards compliance** — valid CommonMark, no parser extensions needed
- **Grep-friendly** — `grep '\[rel:'` extracts all relations from any file
- **Self-describing** — the description field is natural language, readable in raw form

The `rel:` prefix namespaces relations away from normal link references, preventing
collisions with legitimate `[id]: url` definitions in the same document.

### Why a role table in frontmatter rather than inline?

Keeping the role-to-tag mapping in frontmatter rather than scattered through the
document means:

- A single `refracted_meta` call reveals the complete permission model
- Role definitions are authoritative (one place to update)
- Tools can validate access without scanning the full document body

The separation of *role names* (in frontmatter) from *section tags* (in block markers)
allows flexible grouping: multiple roles can share a tag (`core`), and a single role
can hold multiple tags (`[core, training, audit]`).

---

## Compatibility

The format is designed to be invisible in all standard markdown environments.

| Renderer             | Role blocks | Relations | Frontmatter |
|----------------------|:-----------:|:---------:|:-----------:|
| GitHub               | hidden      | hidden    | rendered    |
| Obsidian             | hidden      | hidden    | rendered    |
| VS Code Preview      | hidden      | hidden    | visible*    |
| GitLab               | hidden      | hidden    | rendered    |
| Notion (import)      | hidden      | hidden    | stripped    |
| Jekyll / Hugo        | hidden      | hidden    | processed   |
| Pandoc               | hidden      | hidden    | processed   |
| CommonMark reference | hidden      | hidden    | visible*    |

\* Frontmatter is visible as raw text in renderers that do not natively process YAML
frontmatter. In those cases the `---` block appears as a horizontal rule followed by
text. This does not affect the refracted tools, which always read frontmatter directly.

**Role blocks** (`<!-- @role: X --> ... <!-- @/role -->`) are HTML comments. All
renderers listed above treat HTML comments as invisible.

**Relations** (`[rel:X]: # "..."`) are unused link reference definitions. All CommonMark-
compliant renderers discard them silently. Non-compliant renderers may show them as raw
text at the bottom of the document.
