/**
 * Parse embeddable.theme.ts and extract the theme object as normalized JSON.
 *
 * Handles multiple common patterns:
 *   - Inline theme object inside defineTheme()
 *   - Named theme variable (const lightTheme = { ... })
 *   - Ternary theme selection (clientContext.theme === 'dark' ? darkTheme : lightTheme)
 *
 * Usage as CLI:
 *   npx tsx scripts/parse-theme.ts [path/to/embeddable.theme.ts]
 *
 * Usage as module:
 *   import { parseThemeFile } from './parse-theme';
 *   const theme = await parseThemeFile('embeddable.theme.ts');
 */

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

export interface ParsedTheme {
  charts: {
    backgroundColors?: string[];
    borderColors?: string[];
    [key: string]: unknown;
  };
  styles: Record<string, string>;
}

function stripComments(source: string): string {
  return source
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function extractObjectLiteral(source: string, startIndex: number): string {
  let depth = 0;
  let inString: string | null = null;
  let result = '';

  for (let i = startIndex; i < source.length; i++) {
    const char = source[i]!;
    const prev = i > 0 ? source[i - 1] : '';

    if (inString) {
      result += char;
      if (char === inString && prev !== '\\') inString = null;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      result += char;
      continue;
    }

    if (char === '{') depth++;
    if (char === '}') depth--;

    result += char;

    if (depth === 0) break;
  }

  return result;
}

function objectLiteralToJson(literal: string): string {
  let json = literal;

  // Remove trailing commas before } or ]
  json = json.replace(/,(\s*[}\]])/g, '$1');

  // Convert single-quoted strings to double-quoted
  json = json.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');

  // Quote unquoted keys (handles --em-style-keys and regular keys)
  // Match word-like keys or dashed keys that aren't already quoted
  json = json.replace(/(?<=[{,]\s*)([a-zA-Z_$][\w$-]*)\s*:/g, '"$1":');

  // Also handle keys starting with -- (CSS variables wrapped in quotes already from the source)
  // These should already be quoted in the source, but normalize them
  json = json.replace(/"'([^']+)'"/g, '"$1"');

  return json;
}

async function resolveImportedTheme(
  importPath: string,
  themeDir: string,
  exportName: string,
): Promise<string | null> {
  const candidates = [
    resolve(themeDir, `${importPath}.ts`),
    resolve(themeDir, importPath),
    resolve(themeDir, `${importPath}/index.ts`),
  ];

  for (const filePath of candidates) {
    try {
      const source = await readFile(filePath, 'utf-8');
      const cleaned = stripComments(source);

      const exportRegex = new RegExp(
        `export\\s+(?:const|let|var)\\s+${exportName}[^=]*=\\s*`,
      );
      const match = exportRegex.exec(cleaned);
      if (match) {
        const objStart = cleaned.indexOf('{', match.index + match[0].length);
        if (objStart >= 0) {
          return extractObjectLiteral(cleaned, objStart);
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

export async function parseThemeFile(filePath: string): Promise<ParsedTheme> {
  const absolutePath = resolve(filePath);
  const themeDir = dirname(absolutePath);
  const raw = await readFile(absolutePath, 'utf-8');
  const source = stripComments(raw);

  // Strategy 1: Find a named theme variable defined in this file
  // e.g. const lightTheme: DeepPartial<Theme> = { ... }
  const namedThemeRegex =
    /(?:const|let|var)\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*(?=\{)/g;
  const namedThemes: Record<string, string> = {};

  let namedMatch;
  while ((namedMatch = namedThemeRegex.exec(source)) !== null) {
    const varName = namedMatch[1]!;
    if (varName === 'themeProvider') continue;
    const objStart = source.indexOf('{', namedMatch.index + namedMatch[0].length - 1);
    if (objStart >= 0) {
      namedThemes[varName] = extractObjectLiteral(source, objStart);
    }
  }

  // Strategy 2: Find imports of theme files
  // e.g. import { darkTheme } from './dark-theme';
  const importRegex = /import\s*\{\s*(\w+)\s*\}\s*from\s*['"]([^'"]+)['"]/g;
  const imports: Record<string, string> = {};
  let importMatch;
  while ((importMatch = importRegex.exec(raw)) !== null) {
    imports[importMatch[1]!] = importMatch[2]!;
  }

  // Strategy 3: Find the "light" / non-dark theme
  // Look at the ternary in defineTheme or themeProvider
  // clientContext.theme === 'dark' ? darkTheme : lightTheme
  const ternaryRegex =
    /===\s*['"]dark['"]\s*\?\s*(\w+)\s*:\s*(\w+)/;
  const ternaryMatch = ternaryRegex.exec(source);

  let themeObjectLiteral: string | null = null;

  if (ternaryMatch) {
    const lightName = ternaryMatch[2]!;

    if (namedThemes[lightName]) {
      themeObjectLiteral = namedThemes[lightName]!;
    } else if (imports[lightName]) {
      themeObjectLiteral = await resolveImportedTheme(
        imports[lightName]!,
        themeDir,
        lightName,
      );
    }
  }

  // Fallback: pick the first named theme that isn't darkTheme
  if (!themeObjectLiteral) {
    for (const [name, literal] of Object.entries(namedThemes)) {
      if (!/dark/i.test(name)) {
        themeObjectLiteral = literal;
        break;
      }
    }
  }

  // Fallback: find inline object inside defineTheme(parentTheme, { ... })
  if (!themeObjectLiteral) {
    const defineThemeRegex = /defineTheme\s*\(\s*\w+\s*,\s*(?=\{)/;
    const dtMatch = defineThemeRegex.exec(source);
    if (dtMatch) {
      const objStart = source.indexOf('{', dtMatch.index + dtMatch[0].length - 1);
      if (objStart >= 0) {
        themeObjectLiteral = extractObjectLiteral(source, objStart);
      }
    }
  }

  if (!themeObjectLiteral) {
    throw new Error(
      'Could not find a theme object in the file. Expected a named variable like `const lightTheme = { ... }` or an inline object in `defineTheme(parentTheme, { ... })`.',
    );
  }

  const jsonStr = objectLiteralToJson(themeObjectLiteral);

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(
      `Failed to parse extracted theme object as JSON.\n\nExtracted literal:\n${themeObjectLiteral}\n\nConverted JSON:\n${jsonStr}\n\nError: ${e}`,
    );
  }

  return {
    charts: parsed.charts || {},
    styles: parsed.styles || {},
  };
}

// CLI entry point
if (process.argv[1] && /parse-theme/.test(process.argv[1])) {
  const filePath = process.argv[2] || 'embeddable.theme.ts';
  parseThemeFile(filePath)
    .then((theme) => {
      console.log(JSON.stringify(theme, null, 2));
    })
    .catch((err) => {
      console.error('Parse error:', err.message);
      process.exit(1);
    });
}
