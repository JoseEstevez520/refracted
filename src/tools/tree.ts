/**
 * refracted_tree — heading tree, optionally filtered by role.
 */

import type { ParsedDocument } from '../types.js';
import { renderTree, filterTreeByRole, estimateTokens } from '../parser.js';

export function handleTree(
  parsed: ParsedDocument,
  filePath: string,
  role?: string,
): string {
  let tree = parsed.tree;

  if (role) {
    const allowedTags = parsed.meta.roles[role];
    if (!allowedTags) {
      return `Role "${role}" is not defined in this document.\nAvailable roles: ${Object.keys(parsed.meta.roles).join(', ') || '(none)'}`;
    }
    tree = filterTreeByRole(parsed.tree, parsed.roleBlocks, role, parsed.meta.roles);
  }

  if (tree.length === 0) {
    if (role) {
      return `No sections visible for role "${role}".`;
    }
    return 'No headings found in this document.';
  }

  const treeText = renderTree(tree);
  const fullTokens = estimateTokens(parsed.fullText);
  const treeTokens = estimateTokens(treeText);

  const headerParts = [
    `File: ${filePath}`,
  ];

  if (role) {
    const allowedTags = parsed.meta.roles[role];
    headerParts.push(`Role: ${role} (sees: ${allowedTags.join(', ')})`);
  }

  headerParts.push(
    `Full file: ~${fullTokens} tokens`,
    `This tree: ~${treeTokens} tokens`,
    `Savings: ~${Math.round((1 - treeTokens / fullTokens) * 100)}%`,
    '',
  );

  return headerParts.join('\n') + treeText;
}
