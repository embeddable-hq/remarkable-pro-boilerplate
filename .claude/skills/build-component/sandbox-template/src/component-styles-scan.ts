/**
 * component-styles-scan.ts — Scans component source files at module load
 * and extracts every --em-* CSS custom property referenced in each component folder.
 *
 * Uses Vite's import.meta.glob with { query: '?raw' } to read raw source text,
 * then runs a regex to collect all token names per component folder.
 *
 * Export: tokensForComponent(name) returns sorted unique token names for a folder,
 * or [] when the folder isn't found.
 */

// Eagerly load all raw source files from the boilerplate component tree.
// Each key is the file path; value is the raw text content.
const raws = import.meta.glob(
  '../../src/embeddable.com/components/**/*.{tsx,ts,css}',
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

// TOKEN_RE matches every --em-<word> occurrence (no false negatives — may include
// partial matches in comments, but that's intentional for full discovery).
const TOKEN_RE = /--em-[A-Za-z0-9-]+/g;

// Build the map: folder name → sorted unique token array.
const tokenMap = new Map<string, string[]>();

for (const [filePath, source] of Object.entries(raws)) {
  if (typeof source !== 'string') continue;

  // Extract the component folder name from the path.
  // Path shape: ../../src/embeddable.com/components/<FolderName>/...
  const match = filePath.match(/\/components\/([^/]+)\//);
  if (!match) continue;
  const folder = match[1];

  // Collect all tokens mentioned in this file.
  const tokens = source.match(TOKEN_RE) ?? [];

  if (!tokenMap.has(folder)) {
    tokenMap.set(folder, []);
  }
  const existing = tokenMap.get(folder)!;
  for (const tok of tokens) {
    if (!existing.includes(tok)) {
      existing.push(tok);
    }
  }
}

// Sort each component's tokens alphabetically.
for (const [folder, tokens] of tokenMap.entries()) {
  tokenMap.set(folder, tokens.sort());
}

/**
 * Returns the sorted, unique list of --em-* tokens referenced by a component folder.
 * The folder name equals registry entry.name (e.g. "FunnelChart").
 */
export function tokensForComponent(name: string): string[] {
  return tokenMap.get(name) ?? [];
}

/** Expose the full map for debugging / iteration (e.g. for the panel). */
export { tokenMap };
