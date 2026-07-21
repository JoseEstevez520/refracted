# Refracted Tools

Five MCP tools for reading refracted markdown documents.

## refracted_tree

Returns the heading tree of a markdown file with token estimates. Optionally filtered by role.

**Input:**
| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| file      | string | yes      | Absolute path to the .md file |
| role      | string | no       | Role name to filter by |

**Output (no role):**
```
File: /path/to/doc.md
Full file: ~450 tokens
This tree: ~35 tokens
Savings: ~92%

# Opening Protocol  (~120 tok)
  ## Temperature Checks  (~85 tok)
  ## Exceptions  (~60 tok)
  ## Incident History  (~90 tok)
```

**Output (with role=training):**
```
File: /path/to/doc.md
Role: training (sees: core, training)
Full file: ~450 tokens
This tree: ~25 tokens
Savings: ~94%

# Opening Protocol  (~120 tok)
  ## Temperature Checks  (~85 tok)
  ## Exceptions  (~60 tok)
```

## refracted_section

Returns the content of a specific section, matched by fuzzy heading search. Respects role filters.

**Input:**
| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| file      | string | yes      | Absolute path to the .md file |
| heading   | string | yes      | Heading text to match (fuzzy, case-insensitive) |
| role      | string | no       | Role name — section must be visible to this role |

**Output:**
```
Section: Temperature Checks (level 2)
Lines: 12-18
Role: training
Section tokens: ~85 | Full file: ~450 | Savings: ~81%

## Temperature Checks

Every morning, check the temperature of the cold rooms
before turning on the stoves. If any exceeds 5C,
notify [[Maintenance]] before continuing.
```

If the role does not have access to the matched section, returns an error message.

## refracted_facts

Extracts structured facts from the frontmatter YAML.

**Input:**
| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| file      | string | yes      | Absolute path to the .md file |

**Output:**
```
Found 3 fact(s):

- temp-max
  id: temp-max
  value: 5
  unit: C

- temp-summer
  id: temp-summer
  value: 6
  unit: C
  valid: jun-sep

- incident-march
  id: incident-march
  date: 2026-03
  cost: 340
  cause: compressor
```

## refracted_relations

Extracts semantic relations from link reference definitions.

**Input:**
| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| file      | string | yes      | Absolute path to the .md file |

**Output:**
```
Found 3 relation(s):

- checklist_v1: "added compressor check that v1 didn't have"
- summer_protocol: "simplifies in summer because the base protocol is too slow"
- incident_2025_11: "same failure pattern: overnight compressor"
```

## refracted_meta

Returns document metadata and the role visibility table from frontmatter.

**Input:**
| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| file      | string | yes      | Absolute path to the .md file |

**Output:**
```
## Document Metadata

Type: protocol
Version: 2.1
Created: 2025-09-01
Modified: 2026-03-15

## Role Table

- training: [core, training]
- auditor: [core, audit]
- operations: [core, training, audit]

## Facts

3 fact(s) defined. Use refracted_facts for details.
```
