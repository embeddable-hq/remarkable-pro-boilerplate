/**
 * Auto-generate .cursor/theming-tokens.md from installed packages.
 *
 * Extracts token definitions, Theme type structure, defineTheme API,
 * semantic role classifications, button mappings, and component-to-semantic
 * mappings from @embeddable.com/remarkable-ui, remarkable-pro, and core.
 *
 * Also validates hand-authored rule files against the current package surface.
 *
 * Usage:
 *   npx tsx scripts/generate-theming-tokens.ts
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const UI_DIST = join(ROOT, 'node_modules/@embeddable.com/remarkable-ui/dist');
const PRO_ROOT = join(ROOT, 'node_modules/@embeddable.com/remarkable-pro');
const CORE_LIB = join(ROOT, 'node_modules/@embeddable.com/core/lib');
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

interface TypeMember {
  name: string;
  type: string;
  optional: boolean;
}

interface ParsedType {
  name: string;
  members: TypeMember[];
}

interface SemanticGroup {
  label: string;
  tokens: TokenEntry[];
}

interface ValidationWarning {
  file: string;
  message: string;
}

function extractBalancedBraces(content: string, startIdx: number): string {
  let depth = 0;
  let i = startIdx;
  while (i < content.length) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) return content.slice(startIdx + 1, i);
    }
    i++;
  }
  return content.slice(startIdx + 1);
}

function parseTypeBody(body: string): TypeMember[] {
  const members: TypeMember[] = [];
  // Match top-level properties only: handle nested { } by counting braces
  let i = 0;
  while (i < body.length) {
    // Skip whitespace
    while (i < body.length && /\s/.test(body[i]!)) i++;
    if (i >= body.length) break;

    // Match property name
    const propMatch = body.slice(i).match(/^(\w+)(\??)\s*:\s*/);
    if (!propMatch) { i++; continue; }

    const name = propMatch[1]!;
    const optional = propMatch[2] === '?';
    i += propMatch[0].length;

    // Collect the type — could contain nested braces
    let typeStr = '';
    let depth = 0;
    while (i < body.length) {
      const ch = body[i]!;
      if (ch === '{') { depth++; typeStr += ch; }
      else if (ch === '}') {
        if (depth === 0) break;
        depth--; typeStr += ch;
      }
      else if (ch === ';' && depth === 0) { i++; break; }
      else { typeStr += ch; }
      i++;
    }

    members.push({ name, type: typeStr.trim(), optional });
  }
  return members;
}

async function parseThemeTypes(): Promise<{
  types: ParsedType[];
  rawContent: string;
}> {
  const typesPath = join(PRO_ROOT, 'dist/theme/theme.types.d.ts');
  const content = await readFile(typesPath, 'utf-8');
  const types: ParsedType[] = [];

  // Find each "export type X = {" and extract balanced body
  const typeHeaderRegex = /export\s+type\s+(\w+)\s*=\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = typeHeaderRegex.exec(content)) !== null) {
    const typeName = match[1]!;
    const openBrace = match.index + match[0].length - 1;
    const body = extractBalancedBraces(content, openBrace);
    const members = parseTypeBody(body);
    types.push({ name: typeName, members });
  }

  // Also parse union types like ThemeChartsLegendPosition
  const unionRegex = /export\s+type\s+(\w+)\s*=\s*([^;{]+);/g;
  while ((match = unionRegex.exec(content)) !== null) {
    const name = match[1]!;
    if (types.some((t) => t.name === name)) continue;
    types.push({
      name,
      members: [{ name: '_union', type: match[2]!.trim(), optional: false }],
    });
  }

  return { types, rawContent: content };
}

async function parseDefineThemeApi(): Promise<{
  signature: string;
  deepPartial: string;
  importPath: string;
}> {
  const dtsPath = join(CORE_LIB, 'defineTheme.d.ts');
  const content = await readFile(dtsPath, 'utf-8');

  const sigMatch = content.match(
    /export\s+declare\s+const\s+defineTheme[^;]+;/s,
  );
  const signature = sigMatch ? sigMatch[0] : 'defineTheme: unknown';

  const dpPath = join(PRO_ROOT, 'dist/types/deep-partial.d.ts');
  const dpContent = await readFile(dpPath, 'utf-8');
  const dpMatch = dpContent.match(/export\s+type\s+DeepPartial[^;]+;/s);
  const deepPartial = dpMatch ? dpMatch[0] : '';

  // Derive the import path from package.json main field
  const corePkg = JSON.parse(
    await readFile(join(ROOT, 'node_modules/@embeddable.com/core/package.json'), 'utf-8'),
  );
  const importPath = `@embeddable.com/core`;

  return { signature, deepPartial, importPath };
}

function classifySemanticTokens(tokens: TokenEntry[]): SemanticGroup[] {
  const groups: { prefix: string; label: string; tokens: TokenEntry[] }[] = [
    { prefix: '--em-sem-background', label: 'Background', tokens: [] },
    { prefix: '--em-sem-text', label: 'Text', tokens: [] },
    { prefix: '--em-sem-status-', label: 'Status', tokens: [] },
    { prefix: '--em-sem-chart-color--', label: 'Chart Color', tokens: [] },
  ];

  for (const t of tokens) {
    const group = groups.find((g) => t.name.startsWith(g.prefix));
    if (group) {
      group.tokens.push(t);
    }
  }

  return groups.map((g) => ({ label: g.label, tokens: g.tokens }));
}

function extractButtonMappings(componentTokens: TokenEntry[]): TokenEntry[] {
  return componentTokens.filter((t) => t.name.startsWith('--em-button-'));
}

async function validateHandAuthoredRules(
  allTokenNames: Set<string>,
  themeTypeKeys: string[],
): Promise<ValidationWarning[]> {
  const warnings: ValidationWarning[] = [];

  const filesToCheck = [
    join(ROOT, '.cursor/rules/theming-agent.mdc'),
    join(ROOT, '.cursor/theming-reference.md'),
    join(ROOT, 'DESIGN-UNIVERSAL-RULES.md'),
  ];

  const tokenRefRegex = /--em-[\w-]+/g;

  for (const filePath of filesToCheck) {
    let content: string;
    try {
      content = await readFile(filePath, 'utf-8');
    } catch {
      warnings.push({ file: filePath, message: 'File not found' });
      continue;
    }

    const shortName = filePath.replace(ROOT + '/', '');
    const refs = new Set(content.match(tokenRefRegex) || []);

    for (const ref of refs) {
      // Skip generic prefix patterns used in descriptions (e.g. --em-sem-*, --em-core-*)
      if (ref.endsWith('-')) continue;

      // Skip well-known pattern references that aren't specific tokens
      if (/^--em-(sem|core|button|card|actionicon|barchart|chart|filter|ghostbutton|ghostbuttonicon|kpichart|linechart|piechart|selectfield|switch|tablechart|textfield|tooltip|overlay|skeleton|markdown|divider|daterangepicker|field|buttonicon)-?$/.test(ref)) continue;

      if (!allTokenNames.has(ref)) {
        // Skip placeholder patterns like --em-sem-chart-color--N, --em-{component}-*
        if (/[A-Z]{1,3}$/.test(ref) || /\{/.test(ref)) continue;

        // Only warn for specific token names (have at least 3 dashes to be concrete)
        const dashes = (ref.match(/-/g) || []).length;
        if (dashes >= 3) {
          warnings.push({
            file: shortName,
            message: `Token "${ref}" not found in current packages`,
          });
        }
      }
    }
  }

  // Check semantic token count references
  const agentPath = join(ROOT, '.cursor/rules/theming-agent.mdc');
  try {
    const agentContent = await readFile(agentPath, 'utf-8');
    const countMatch = agentContent.match(/(\d+)\s+semantic\s+color\s+tokens/);
    if (countMatch) {
      const claimed = parseInt(countMatch[1]!);
      const semColorTokens = allTokenNames.size
        ? [...allTokenNames].filter(
            (t) =>
              t.startsWith('--em-sem-') && !t.includes('chart-color'),
          ).length
        : 0;
      if (semColorTokens > 0 && claimed !== semColorTokens) {
        warnings.push({
          file: '.cursor/rules/theming-agent.mdc',
          message: `Claims ${claimed} semantic color tokens but package has ${semColorTokens} (excluding chart colors)`,
        });
      }
    }
  } catch { /* skip if file missing */ }

  return warnings;
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

  lines.push('---');
  lines.push('');

  // --- NEW SECTION 1: Theme Type Structure ---
  console.log('Parsing Theme type structure...');
  const { types: parsedTypes } = await parseThemeTypes();

  lines.push('## Theme Type Structure');
  lines.push('');
  lines.push('Extracted from `@embeddable.com/remarkable-pro` type definitions. This is the shape of the `Theme` object the agent produces.');
  lines.push('');

  for (const t of parsedTypes) {
    lines.push(`### \`${t.name}\``);
    lines.push('');

    if (t.members.length === 1 && t.members[0]!.name === '_union') {
      lines.push(`Union type: \`${t.members[0]!.type}\``);
    } else {
      lines.push('| Property | Type | Required |');
      lines.push('|----------|------|----------|');
      for (const m of t.members) {
        // Collapse inline object types like { options: Partial<...> } into a readable form
        let typeDisplay = m.type
          .replace(/\s+/g, ' ')
          .replace(/\|/g, '\\|')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        lines.push(`| \`${m.name}\` | \`${typeDisplay}\` | ${m.optional ? 'No' : 'Yes'} |`);
      }
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // --- NEW SECTION 2: API and File Template ---
  console.log('Parsing defineTheme API...');
  const api = await parseDefineThemeApi();

  lines.push('## API and File Template');
  lines.push('');
  lines.push('### `defineTheme` (from `@embeddable.com/core`)');
  lines.push('');
  lines.push('```ts');
  lines.push(api.signature);
  lines.push('```');
  lines.push('');
  lines.push('Deep-merges `childTheme` overrides onto `parentTheme` defaults. Only override what you need.');
  lines.push('');
  lines.push('### `DeepPartial<T>` (from `@embeddable.com/remarkable-pro`)');
  lines.push('');
  lines.push('```ts');
  lines.push(api.deepPartial);
  lines.push('```');
  lines.push('');
  lines.push('### Canonical `embeddable.theme.ts` Template');
  lines.push('');
  lines.push('This is the expected file structure. Imports and type names are derived from the installed packages.');
  lines.push('');
  lines.push('```ts');
  lines.push(`import { defineTheme } from '${api.importPath}';`);
  lines.push("import { Theme, DeepPartial } from '@embeddable.com/remarkable-pro';");
  lines.push('');
  lines.push('const themeProvider = (clientContext: any, parentTheme: Theme): Theme => {');
  lines.push('  const newTheme: DeepPartial<Theme> = {');
  lines.push('    // theme overrides');
  lines.push('  };');
  lines.push('  return defineTheme(parentTheme, newTheme) as Theme;');
  lines.push('};');
  lines.push('');
  lines.push('export default themeProvider;');
  lines.push('```');
  lines.push('');
  lines.push('---');
  lines.push('');

  // --- NEW SECTION 3: Semantic Token Roles ---
  console.log('Classifying semantic token roles...');
  const semanticGroups = classifySemanticTokens(semanticTokens);

  lines.push('## Semantic Token Roles');
  lines.push('');
  lines.push('Auto-classified grouping of semantic tokens by role. These counts are the source of truth for how many tokens exist per category.');
  lines.push('');

  const totalSemanticColors = semanticGroups
    .filter((g) => g.label !== 'Chart Color')
    .reduce((sum, g) => sum + g.tokens.length, 0);
  lines.push(`**Semantic color tokens (excluding chart):** ${totalSemanticColors} (${semanticGroups.filter((g) => g.label !== 'Chart Color').map((g) => `${g.tokens.length} ${g.label.toLowerCase()}`).join(', ')})`);
  lines.push('');

  for (const group of semanticGroups) {
    lines.push(`### ${group.label} (${group.tokens.length} tokens)`);
    lines.push('');
    lines.push('| Token | Default |');
    lines.push('|-------|---------|');
    for (const t of group.tokens) {
      const escaped = t.defaultValue.replace(/\|/g, '\\|');
      lines.push(`| \`${t.name}\` | \`${escaped}\` |`);
    }
    lines.push('');
    if (group.label === 'Chart Color') {
      lines.push('**IMPORTANT:** These semantic chart tokens and `theme.charts.backgroundColors` are two independent code paths. `backgroundColors` drives bar/line/pie/donut charts; these semantic tokens drive heatmaps (via `--em-tablechart-heatmap-color`) and chart category indicators. There is NO automatic sync — you must always set both.');
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');

  // --- NEW SECTION 4: Button Default Mappings ---
  console.log('Extracting button default mappings...');
  const buttonTokens = extractButtonMappings(componentTokens);

  lines.push('## Button Default Mappings (Critical)');
  lines.push('');
  lines.push('The default Remarkable UI maps primary button backgrounds to **semantic text tokens**, not brand colors. This means buttons inherit gray tones from the text scale unless explicitly overridden with the brand/accent color.');
  lines.push('');

  if (buttonTokens.length > 0) {
    const semButtons = buttonTokens.filter((t) =>
      t.defaultValue.startsWith('var(--em-sem-'),
    );
    const coreButtons = buttonTokens.filter((t) =>
      t.defaultValue.startsWith('var(--em-core-'),
    );

    if (semButtons.length > 0) {
      lines.push('### Button → Semantic Mappings');
      lines.push('');
      lines.push('These are the critical defaults that need overriding for branded themes:');
      lines.push('');
      lines.push('| Button Token | Default Maps To |');
      lines.push('|-------------|----------------|');
      for (const t of semButtons) {
        const ref = t.defaultValue.replace(/^var\(/, '').replace(/\)$/, '');
        lines.push(`| \`${t.name}\` | \`${ref}\` |`);
      }
      lines.push('');
    }

    if (coreButtons.length > 0) {
      lines.push('### Button → Core Mappings');
      lines.push('');
      lines.push('| Button Token | Default Maps To |');
      lines.push('|-------------|----------------|');
      for (const t of coreButtons) {
        const ref = t.defaultValue.replace(/^var\(/, '').replace(/\)$/, '');
        lines.push(`| \`${t.name}\` | \`${ref}\` |`);
      }
      lines.push('');
    }

    lines.push(`**Total button tokens:** ${buttonTokens.length}`);
    lines.push('');
  } else {
    lines.push('No `--em-button-*` tokens found in this package version.');
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Write the output
  const output = lines.join('\n');
  await writeFile(OUTPUT, output, 'utf-8');

  console.log(`\nWritten to: ${OUTPUT}`);
  console.log(`  remarkable-ui: ${versions.remarkableUi}`);
  console.log(`  remarkable-pro: ${versions.remarkablePro}`);
  console.log(`  ${totalCount} tokens (${coreTokens.length} core, ${semanticTokens.length} semantic, ${componentTokens.length} component)`);
  console.log(`  ${componentNames.length} component prefixes`);
  console.log(`  ${semanticMappings.length} component→semantic mappings`);
  console.log(`  ${parsedTypes.length} Theme types extracted`);
  console.log(`  ${buttonTokens.length} button tokens`);
  console.log(`  ${semanticGroups.map((g) => `${g.tokens.length} ${g.label.toLowerCase()}`).join(', ')} semantic roles`);

  // --- VALIDATION ---
  console.log('\n--- Validation: checking hand-authored rules against packages ---');
  const allTokenNames = new Set([
    ...coreTokens.map((t) => t.name),
    ...semanticTokens.map((t) => t.name),
    ...componentTokens.map((t) => t.name),
  ]);
  const themeTypeKeys = parsedTypes
    .find((t) => t.name === 'Theme')
    ?.members.map((m) => m.name) || [];

  const warnings = await validateHandAuthoredRules(allTokenNames, themeTypeKeys);

  if (warnings.length === 0) {
    console.log('✓ All token references in hand-authored rules match current packages.');
  } else {
    console.log(`⚠ Found ${warnings.length} potential issue(s):\n`);
    for (const w of warnings) {
      console.log(`  [${w.file}] ${w.message}`);
    }
    console.log(
      '\nThese may be intentional (pattern references, future tokens) or indicate stale rules.',
    );
  }
}

main().catch((err) => {
  console.error('Generation failed:', err.message);
  process.exit(1);
});
