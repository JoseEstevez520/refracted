/**
 * Tests for the refracted parser.
 * Run with: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument, filterTreeByRole, findSection, estimateTokens, renderTree, extractEntities, extractDates } from '../src/parser.js';

// ── Test document ─────────────────────────────────────────────────────

const SAMPLE_DOC = `---
type: protocol
version: "2.1"
created: 2025-09-01
modified: 2026-03-15

facts:
  - id: temp-max
    value: 5
    unit: "C"
  - id: temp-summer
    value: 6
    unit: "C"
    valid: jun-sep
  - id: incident-march
    date: 2026-03
    cost: 340
    cause: compressor

roles:
  training: [core, training]
  auditor: [core, audit]
  operations: [core, training, audit]
---

<!-- @role: core -->
# Opening Protocol

Daily opening procedure, Monday to Friday.
<!-- @/role -->

<!-- @role: training -->
## Temperature Checks

Every morning, check the temperature of the cold rooms
before turning on the stoves.

## Exceptions

In high season, only check the main cold room.
<!-- @/role -->

<!-- @role: audit -->
## Incident History

2026-03: Cold room 2 failed overnight. 12kg lost.
Cause: compressor. Cost: 340 EUR.
<!-- @/role -->

[rel:checklist_v1]: # "added compressor check that v1 didn't have"
[rel:summer_protocol]: # "simplifies in summer"
`;

const MINIMAL_DOC = `# Just a heading

Some content without frontmatter.

## Second heading

More content.
`;

const NO_ROLES_DOC = `---
type: note
---

# A note

No role blocks here. Just plain content.
`;

// ── Tests ─────────────────────────────────────────────────────────────

describe('parseDocument', () => {
  it('should extract frontmatter metadata', () => {
    const parsed = parseDocument(SAMPLE_DOC);
    assert.equal(parsed.meta.type, 'protocol');
    assert.equal(parsed.meta.version, '2.1');
    assert.equal(parsed.meta.created, '2025-09-01');
    assert.equal(parsed.meta.modified, '2026-03-15');
  });

  it('should extract facts', () => {
    const parsed = parseDocument(SAMPLE_DOC);
    assert.equal(parsed.meta.facts.length, 3);

    const tempMax = parsed.meta.facts.find(f => f.id === 'temp-max');
    assert.ok(tempMax);
    assert.equal(tempMax.value, 5);
    assert.equal(tempMax.unit, 'C');

    const incident = parsed.meta.facts.find(f => f.id === 'incident-march');
    assert.ok(incident);
    assert.equal(incident.cost, 340);
    assert.equal(incident.cause, 'compressor');
  });

  it('should extract roles table', () => {
    const parsed = parseDocument(SAMPLE_DOC);
    assert.deepEqual(parsed.meta.roles.training, ['core', 'training']);
    assert.deepEqual(parsed.meta.roles.auditor, ['core', 'audit']);
    assert.deepEqual(parsed.meta.roles.operations, ['core', 'training', 'audit']);
  });

  it('should detect role blocks', () => {
    const parsed = parseDocument(SAMPLE_DOC);
    assert.equal(parsed.roleBlocks.length, 3);

    assert.deepEqual(parsed.roleBlocks[0].roles, ['core']);
    assert.deepEqual(parsed.roleBlocks[1].roles, ['training']);
    assert.deepEqual(parsed.roleBlocks[2].roles, ['audit']);
  });

  it('should extract relations', () => {
    const parsed = parseDocument(SAMPLE_DOC);
    assert.equal(parsed.relations.length, 2);
    assert.equal(parsed.relations[0].target, 'checklist_v1');
    assert.equal(parsed.relations[0].description, "added compressor check that v1 didn't have");
    assert.equal(parsed.relations[1].target, 'summer_protocol');
  });

  it('should build heading tree', () => {
    const parsed = parseDocument(SAMPLE_DOC);
    assert.equal(parsed.tree.length, 1); // One root heading (#)
    assert.equal(parsed.tree[0].title, 'Opening Protocol');
    assert.equal(parsed.tree[0].children.length, 3); // Three ## headings
  });

  it('should handle document without frontmatter', () => {
    const parsed = parseDocument(MINIMAL_DOC);
    assert.equal(parsed.frontmatterRaw, null);
    assert.equal(parsed.meta.facts.length, 0);
    assert.deepEqual(parsed.meta.roles, {});
    assert.equal(parsed.tree.length, 1);
    assert.equal(parsed.tree[0].title, 'Just a heading');
  });

  it('should handle document without role blocks', () => {
    const parsed = parseDocument(NO_ROLES_DOC);
    assert.equal(parsed.roleBlocks.length, 0);
    assert.equal(parsed.tree.length, 1);
    assert.equal(parsed.meta.type, 'note');
  });
});

describe('filterTreeByRole', () => {
  it('should filter tree for training role', () => {
    const parsed = parseDocument(SAMPLE_DOC);
    const filtered = filterTreeByRole(
      parsed.tree,
      parsed.roleBlocks,
      'training',
      parsed.meta.roles,
    );

    // Training sees core + training blocks
    // Should see: Opening Protocol, Temperature Checks, Exceptions
    // Should NOT see: Incident History (audit only)
    const titles = flattenTitles(filtered);
    assert.ok(titles.includes('Opening Protocol'));
    assert.ok(titles.includes('Temperature Checks'));
    assert.ok(titles.includes('Exceptions'));
    assert.ok(!titles.includes('Incident History'));
  });

  it('should filter tree for auditor role', () => {
    const parsed = parseDocument(SAMPLE_DOC);
    const filtered = filterTreeByRole(
      parsed.tree,
      parsed.roleBlocks,
      'auditor',
      parsed.meta.roles,
    );

    // Auditor sees core + audit blocks
    const titles = flattenTitles(filtered);
    assert.ok(titles.includes('Opening Protocol'));
    assert.ok(titles.includes('Incident History'));
    assert.ok(!titles.includes('Temperature Checks'));
    assert.ok(!titles.includes('Exceptions'));
  });

  it('should show all for operations role', () => {
    const parsed = parseDocument(SAMPLE_DOC);
    const filtered = filterTreeByRole(
      parsed.tree,
      parsed.roleBlocks,
      'operations',
      parsed.meta.roles,
    );

    // Operations sees core + training + audit = everything
    const titles = flattenTitles(filtered);
    assert.ok(titles.includes('Opening Protocol'));
    assert.ok(titles.includes('Temperature Checks'));
    assert.ok(titles.includes('Exceptions'));
    assert.ok(titles.includes('Incident History'));
  });

  it('should return empty for unknown role', () => {
    const parsed = parseDocument(SAMPLE_DOC);
    const filtered = filterTreeByRole(
      parsed.tree,
      parsed.roleBlocks,
      'unknown_role',
      parsed.meta.roles,
    );
    assert.equal(filtered.length, 0);
  });
});

describe('findSection', () => {
  it('should find section by exact heading', () => {
    const parsed = parseDocument(SAMPLE_DOC);
    const result = findSection(parsed, 'Temperature Checks');
    assert.ok(result);
    assert.equal(result.node.title, 'Temperature Checks');
    assert.ok(result.content.includes('cold rooms'));
  });

  it('should find section by fuzzy match', () => {
    const parsed = parseDocument(SAMPLE_DOC);
    const result = findSection(parsed, 'temperature');
    assert.ok(result);
    assert.equal(result.node.title, 'Temperature Checks');
  });

  it('should respect role filter', () => {
    const parsed = parseDocument(SAMPLE_DOC);

    // Auditor should NOT be able to find Temperature Checks
    const result = findSection(parsed, 'Temperature Checks', 'auditor');
    assert.equal(result, null);

    // But training should
    const result2 = findSection(parsed, 'Temperature Checks', 'training');
    assert.ok(result2);
    assert.equal(result2.node.title, 'Temperature Checks');
  });

  it('should return null for non-matching heading', () => {
    const parsed = parseDocument(SAMPLE_DOC);
    const result = findSection(parsed, 'nonexistent section xyz');
    assert.equal(result, null);
  });
});

describe('estimateTokens', () => {
  it('should estimate roughly chars/4', () => {
    const text = 'a'.repeat(100);
    assert.equal(estimateTokens(text), 25);
  });

  it('should round up', () => {
    assert.equal(estimateTokens('abc'), 1);
  });
});

describe('renderTree', () => {
  it('should render tree with token counts', () => {
    const parsed = parseDocument(SAMPLE_DOC);
    const output = renderTree(parsed.tree);
    assert.ok(output.includes('# Opening Protocol'));
    assert.ok(output.includes('## Temperature Checks'));
    assert.ok(output.includes('tok)'));
  });
});

describe('edge cases', () => {
  it('should handle empty string', () => {
    const parsed = parseDocument('');
    assert.equal(parsed.tree.length, 0);
    assert.equal(parsed.meta.facts.length, 0);
    assert.equal(parsed.relations.length, 0);
    assert.equal(parsed.roleBlocks.length, 0);
  });

  it('should handle frontmatter-only document', () => {
    const doc = `---
type: empty
---
`;
    const parsed = parseDocument(doc);
    assert.equal(parsed.meta.type, 'empty');
    assert.equal(parsed.tree.length, 0);
  });

  it('should handle headings inside code blocks', () => {
    const doc = `# Real Heading

\`\`\`markdown
# This is inside a code block
## So is this
\`\`\`

## Another Real Heading

Content here.
`;
    const parsed = parseDocument(doc);
    const titles = flattenTitles(parsed.tree);
    assert.ok(titles.includes('Real Heading'));
    assert.ok(titles.includes('Another Real Heading'));
    assert.ok(!titles.includes('This is inside a code block'));
    assert.ok(!titles.includes('So is this'));
  });

  it('should handle unclosed role blocks', () => {
    const doc = `<!-- @role: core -->
# Heading

Content without closing tag.
`;
    const parsed = parseDocument(doc);
    assert.equal(parsed.roleBlocks.length, 1);
    assert.deepEqual(parsed.roleBlocks[0].roles, ['core']);
    // Should close at EOF
    assert.equal(parsed.roleBlocks[0].lineEnd, parsed.lines.length - 1);
  });

  it('should support hechos as alias for facts', () => {
    const doc = `---
hechos:
  - id: dato-1
    value: 42
---

# Test
`;
    const parsed = parseDocument(doc);
    assert.equal(parsed.meta.facts.length, 1);
    assert.equal(parsed.meta.facts[0].id, 'dato-1');
    assert.equal(parsed.meta.facts[0].value, 42);
  });
});

// ── extractEntities ───────────────────────────────────────────────────

const ENTITIES_DOC = `---
type: protocol
roles:
  training: [core, training]
  auditor: [core, audit]
---

<!-- @role: core -->
# Opening Protocol

See [[Maintenance]] for details.
<!-- @/role -->

<!-- @role: training -->
## Temperature Checks

Check [[Cold Room 1]] and [[Cold Room 2]] every morning.
Also see [[Summer Protocol]] for exceptions.

## Exceptions

In [[Summer Protocol]], rules are different.
<!-- @/role -->

<!-- @role: audit -->
## Incident History

Referenced in [[incident_2025_11]] report.
<!-- @/role -->
`;

describe('extractEntities', () => {
  it('should extract all wikilinks without role filter', () => {
    const parsed = parseDocument(ENTITIES_DOC);
    const entities = extractEntities(parsed);
    const names = entities.map(e => e.name);
    assert.ok(names.includes('Maintenance'));
    assert.ok(names.includes('Cold Room 1'));
    assert.ok(names.includes('Cold Room 2'));
    assert.ok(names.includes('Summer Protocol'));
    assert.ok(names.includes('incident_2025_11'));
  });

  it('should deduplicate entities', () => {
    const parsed = parseDocument(ENTITIES_DOC);
    const entities = extractEntities(parsed);
    const names = entities.map(e => e.name.toLowerCase());
    // "Summer Protocol" appears in two sections but should only appear once
    const count = names.filter(n => n === 'summer protocol').length;
    assert.equal(count, 1);
  });

  it('should include section name for each entity', () => {
    const parsed = parseDocument(ENTITIES_DOC);
    const entities = extractEntities(parsed);
    const maintenance = entities.find(e => e.name === 'Maintenance');
    assert.ok(maintenance);
    assert.equal(maintenance.section, 'Opening Protocol');
  });

  it('should respect role filter', () => {
    const parsed = parseDocument(ENTITIES_DOC);
    const entities = extractEntities(parsed, 'auditor');
    const names = entities.map(e => e.name);
    // Auditor sees core + audit — should see Maintenance and incident_2025_11
    assert.ok(names.includes('Maintenance'));
    assert.ok(names.includes('incident_2025_11'));
    // Should NOT see training-only entities
    assert.ok(!names.includes('Cold Room 1'));
    assert.ok(!names.includes('Cold Room 2'));
  });

  it('should return empty for unknown role', () => {
    const parsed = parseDocument(ENTITIES_DOC);
    const entities = extractEntities(parsed, 'unknown_role');
    assert.equal(entities.length, 0);
  });

  it('should skip wikilinks in code blocks', () => {
    const doc = `# Heading\n\n\`\`\`\n[[NotAnEntity]]\n\`\`\`\n\n[[RealEntity]]\n`;
    const parsed = parseDocument(doc);
    const entities = extractEntities(parsed);
    const names = entities.map(e => e.name);
    assert.ok(names.includes('RealEntity'));
    assert.ok(!names.includes('NotAnEntity'));
  });

  it('should handle document with no wikilinks', () => {
    const parsed = parseDocument(MINIMAL_DOC);
    const entities = extractEntities(parsed);
    assert.equal(entities.length, 0);
  });
});

// ── extractDates ──────────────────────────────────────────────────────

const DATES_DOC = `---
type: log
---

# Events

On 2025-09-01 we started the protocol.
In 2026-03 the compressor failed.
The incident on 2026-03-15 was resolved.
No date here.
Another 2025-12-31 entry.
`;

describe('extractDates', () => {
  it('should extract full YYYY-MM-DD dates', () => {
    const parsed = parseDocument(DATES_DOC);
    const dates = extractDates(parsed);
    const dateValues = dates.map(d => d.date);
    assert.ok(dateValues.includes('2025-09-01'));
    assert.ok(dateValues.includes('2026-03-15'));
    assert.ok(dateValues.includes('2025-12-31'));
  });

  it('should extract YYYY-MM dates', () => {
    const parsed = parseDocument(DATES_DOC);
    const dates = extractDates(parsed);
    const dateValues = dates.map(d => d.date);
    assert.ok(dateValues.includes('2026-03'));
  });

  it('should not double-count YYYY-MM when YYYY-MM-DD is present on the same line', () => {
    const parsed = parseDocument(DATES_DOC);
    const dates = extractDates(parsed);
    // "2026-03-15" line should produce one entry for the full date, not also "2026-03"
    const march15 = dates.filter(d => d.date === '2026-03-15');
    assert.equal(march15.length, 1);
    // 2026-03 comes from its own line ("In 2026-03 the compressor failed")
    // so it should still be present once
    const march = dates.filter(d => d.date === '2026-03');
    assert.equal(march.length, 1);
  });

  it('should include context (the line text)', () => {
    const parsed = parseDocument(DATES_DOC);
    const dates = extractDates(parsed);
    const sept = dates.find(d => d.date === '2025-09-01');
    assert.ok(sept);
    assert.ok(sept.context.includes('started the protocol'));
  });

  it('should return empty for document with no dates in body', () => {
    const parsed = parseDocument(MINIMAL_DOC);
    const dates = extractDates(parsed);
    assert.equal(dates.length, 0);
  });
});

// ── Helpers ───────────────────────────────────────────────────────────

function flattenTitles(nodes: { title: string; children: typeof nodes }[]): string[] {
  const result: string[] = [];
  for (const n of nodes) {
    result.push(n.title);
    result.push(...flattenTitles(n.children));
  }
  return result;
}
