/**
 * Auto-generate .cursor/theming-tokens.md from installed packages.
 *
 * Parses CSS variable definitions and component-to-semantic mappings from
 * @embeddable.com/remarkable-ui and @embeddable.com/remarkable-pro.
 *
 * Usage:
 *   npx tsx scripts/generate-theming-tokens.ts
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const UI_DIST = join(ROOT, 'node_modules/@embeddable.com/remarkable-ui/dist');
const PRO_ROOT = join(ROOT, 'node_modules/@embeddable.com/remarkable-pro');
const OUTPUT = join(ROOT, '.cursor/theming-tokens.md');

interface TokenEntry {
  name: string;
  defaultValue: string;
}

interface PackageVersions {
  remarkableUi: string;
  remarkablePro: string;
}

async function getPackageVersions(): Promise<PackageVersions> {
  const uiPkg = JSON.parse(
    await readFile(join(ROOT, 'node_modules/@embeddable.com/remarkable-ui/package.json'), 'utf-8'),
  );
  const proPkg = JSON.parse(
    await readFile(join(PRO_ROOT, 'package.json'), 'utf-8'),
  );
  return {
    remarkableUi: uiPkg.version,
    remarkablePro: proPkg.version,
  };
}

async function findChunkFile(): Promise<string> {
  const files = await readdir(UI_DIST);
  const chunk = files.find((f) => f.startsWith('chunk-') && f.endsWith('.js'));
  if (!chunk) {
    throw new Error(
      `No chunk-*.js found in ${UI_DIST}. Run npm install first.`,
    );
  }
  return join(UI_DIST, chunk);
}

function parseJsObjectBlock(content: string, varName: string): TokenEntry[] {
  const pattern = new RegExp(
    `var\\s+${varName}\\s*=\\s*\\{([^}]+)\\}`,
    's',
  );
  const match = content.match(pattern);
  if (!match) return [];

  const entries: TokenEntry[] = [];
  const pairRegex = /"(--em-[^"]+)":\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;

  while ((m = pairRegex.exec(match[1]!)) !== null) {
    entries.push({ name: m[1]!, defaultValue: m[2]! });
  }

  return entries;
}

function extractComponentPrefix(tokenName: string): string {
  const withoutEm = tokenName.replace(/^--em-/, '');
  const dash = withoutEm.indexOf('-');
  return dash === -1 ? withoutEm : withoutEm.slice(0, dash);
}

function groupByComponent(
  tokens: TokenEntry[],
): Map<string, TokenEntry[]> {
  const grouped = new Map<string, TokenEntry[]>();
  for (const t of tokens) {
    const prefix = extractComponentPrefix(t.name);
    if (!grouped.has(prefix)) grouped.set(prefix, []);
    grouped.get(prefix)!.push(t);
  }
  return grouped;
}

function formatTokenTable(tokens: TokenEntry[]): string {
  const lines = ['| Token | Default |', '|-------|---------|'];
  for (const t of tokens) {
    const escaped = t.defaultValue.replace(/\|/g, '\\|');
    lines.push(`| \`${t.name}\` | \`${escaped}\` |`);
  }
  return lines.join('\n');
}

function formatComponentMappingTable(tokens: TokenEntry[]): string {
  const semanticRefs = tokens.filter((t) =>
    t.defaultValue.startsWith('var(--em-sem-'),
  );
  if (semanticRefs.length === 0) return '';

  const lines = [
    '| Component Token | Maps To (semantic/core) |',
    '|----------------|------------------------|',
  ];
  for (const t of semanticRefs) {
    const ref = t.defaultValue.replace(/^var\(/, '').replace(/\)$/, '');
    lines.push(`| \`${t.name}\` | \`${ref}\` |`);
  }
  return lines.join('\n');
}

async function main() {
  console.log('Generating theming tokens reference...');

  const versions = await getPackageVersions();
  const chunkPath = await findChunkFile();
  const chunkContent = await readFile(chunkPath, 'utf-8');

  const coreTokens = parseJsObjectBlock(chunkContent, 'stylesTokensCore');
  const semanticTokens = parseJsObjectBlock(chunkContent, 'stylesTokensSemantic');
  const componentTokens = parseJsObjectBlock(chunkContent, 'stylesTokensComponents');

  const totalCount = coreTokens.length + semanticTokens.length + componentTokens.length;
  const componentGroups = groupByComponent(componentTokens);
  const componentNames = [...componentGroups.keys()].sort();

  const semanticMappings = componentTokens.filter(
    (t) => t.defaultValue.startsWith('var(--em-sem-'),
  );

  const lines: string[] = [];

  lines.push('<!-- AUTO-GENERATED — do not edit manually -->');
  lines.push(`<!-- Run: npx tsx scripts/generate-theming-tokens.ts -->`);
  lines.push(`<!-- Generated: ${new Date().toISOString()} -->`);
  lines.push(`<!-- remarkable-ui: ${versions.remarkableUi}, remarkable-pro: ${versions.remarkablePro} -->`);
  lines.push('');
  lines.push('# Embeddable Theming Tokens Reference');
  lines.push('');
  lines.push(`This file is auto-generated from the installed \`@embeddable.com/remarkable-ui@${versions.remarkableUi}\` and \`@embeddable.com/remarkable-pro@${versions.remarkablePro}\` packages. **Do not edit manually** — run \`npx tsx scripts/generate-theming-tokens.ts\` to regenerate.`);
  lines.push('');
  lines.push(`**Total tokens:** ${totalCount} (${coreTokens.length} core, ${semanticTokens.length} semantic, ${componentTokens.length} component)`);
  lines.push('');
  lines.push('For design guidelines, derivation formulas, and quality rules, see `.cursor/theming-reference.md` and `DESIGN-UNIVERSAL-RULES.md`.');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Core tokens
  lines.push('## Core Tokens (`--em-core-*`)');
  lines.push('');
  lines.push('Raw CSS primitives. Override only when redefining foundations (spacing scale, shadow). **Do not set font tokens** — custom fonts are not supported through theming.');
  lines.push('');
  lines.push(formatTokenTable(coreTokens));
  lines.push('');
  lines.push('---');
  lines.push('');

  // Semantic tokens
  lines.push('## Semantic Tokens (`--em-sem-*`)');
  lines.push('');
  lines.push('Primary tool for theming. These control global visual appearance — backgrounds, text colors, status indicators, and chart palette.');
  lines.push('');
  lines.push(formatTokenTable(semanticTokens));
  lines.push('');
  lines.push('---');
  lines.push('');

  // Component tokens — summary
  lines.push('## Component Tokens (`--em-{component}-*`)');
  lines.push('');
  lines.push('Per-component overrides. Only use for isolated tweaks — most theming should happen at the semantic level.');
  lines.push('');
  lines.push(`**${componentTokens.length} tokens** across **${componentNames.length} components**: ${componentNames.map((n) => `\`${n}\``).join(', ')}`);
  lines.push('');

  // Component-to-semantic mapping table (the critical knowledge)
  lines.push('### Key Component → Semantic Mappings');
  lines.push('');
  lines.push('These are the default mappings from component tokens to semantic tokens. Understanding these is critical for predicting how semantic changes cascade to components.');
  lines.push('');

  for (const compName of componentNames) {
    const tokens = componentGroups.get(compName)!;
    const semRefs = tokens.filter((t) => t.defaultValue.startsWith('var(--em-sem-'));
    if (semRefs.length === 0) continue;

    lines.push(`#### \`${compName}\``);
    lines.push('');
    lines.push(formatComponentMappingTable(tokens));
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Full component token tables (collapsed for reference)
  lines.push('## Full Component Token Reference');
  lines.push('');
  lines.push('Complete listing of all component tokens and their defaults.');
  lines.push('');

  for (const compName of componentNames) {
    const tokens = componentGroups.get(compName)!;
    lines.push(`### \`${compName}\` (${tokens.length} tokens)`);
    lines.push('');
    lines.push(formatTokenTable(tokens));
    lines.push('');
  }

  const output = lines.join('\n');
  await writeFile(OUTPUT, output, 'utf-8');

  console.log(`Written to: ${OUTPUT}`);
  console.log(`  remarkable-ui: ${versions.remarkableUi}`);
  console.log(`  remarkable-pro: ${versions.remarkablePro}`);
  console.log(`  ${totalCount} tokens (${coreTokens.length} core, ${semanticTokens.length} semantic, ${componentTokens.length} component)`);
  console.log(`  ${componentNames.length} component prefixes`);
  console.log(`  ${semanticMappings.length} component→semantic mappings`);
}

main().catch((err) => {
  console.error('Generation failed:', err.message);
  process.exit(1);
});
