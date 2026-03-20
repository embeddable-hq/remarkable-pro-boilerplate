/**
 * Score a generated theme against a golden standard.
 *
 * Usage:
 *   npx tsx scripts/score-theme.ts <golden.json> [embeddable.theme.ts] [--figma-tokens <path>] [--json]
 *
 * When --figma-tokens is provided, only tokens that have extraction candidates
 * are scored. Derived/invented tokens are skipped. This isolates extraction
 * accuracy from harmony-derivation quality.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseThemeFile, type ParsedTheme } from './parse-theme.js';

// ─── Types ───────────────────────────────────────────────────────────

interface GoldenStandard {
  meta: { name: string; figmaUrl: string; description: string };
  expected: {
    chartColors?: {
      _description?: string;
      backgroundColors?: string[];
      borderColors?: string[];
    };
    backgrounds?: Record<string, { value: string; label: string } | string>;
    textColors?: Record<string, { value: string; label: string } | string>;
    statusColors?: Record<string, { value: string; label: string } | string>;
    shadows?: Record<string, { value: string; label: string } | string>;
  };
  scoring: {
    weights: Record<string, number>;
    colorTolerance: number;
  };
}

interface FigmaTokens {
  chartColorCandidates?: string[];
  backgroundCandidates?: Record<string, string>;
  textColorCandidates?: Record<string, string>;
  statusColorCandidates?: Record<string, string>;
  effects?: unknown[];
  [key: string]: unknown;
}

interface TokenResult {
  token: string;
  expected: string;
  actual: string | null;
  score: number;
  detail: string;
}

interface CategoryResult {
  name: string;
  weight: number;
  score: number;
  tokenResults: TokenResult[];
  skippedTokens?: string[];
  summary: string;
}

interface SkippedCategory {
  name: string;
  weight: number;
  reason: string;
}

interface ScoreReport {
  testName: string;
  extractionOnly: boolean;
  categories: CategoryResult[];
  skippedCategories: SkippedCategory[];
  structuralChecks: { name: string; passed: boolean; detail: string }[];
  weightedScore: number;
}

// ─── Color Utilities ─────────────────────────────────────────────────

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface Lab {
  L: number;
  a: number;
  b: number;
}

function parseColor(value: string): RGB | null {
  value = value.trim().toLowerCase();

  // Hex: #fff, #ffffff
  const hexMatch = value.match(/^#([0-9a-f]{3,8})$/);
  if (hexMatch) {
    let hex = hexMatch[1]!;
    if (hex.length === 3) hex = hex[0]! + hex[0]! + hex[1]! + hex[1]! + hex[2]! + hex[2]!;
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  // rgb(R G B) or rgb(R G B / A%)
  const rgbMatch = value.match(/rgb\(\s*(\d+)\s+(\d+)\s+(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]!, 10),
      g: parseInt(rgbMatch[2]!, 10),
      b: parseInt(rgbMatch[3]!, 10),
    };
  }

  // rgb(R, G, B)
  const rgbCommaMatch = value.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbCommaMatch) {
    return {
      r: parseInt(rgbCommaMatch[1]!, 10),
      g: parseInt(rgbCommaMatch[2]!, 10),
      b: parseInt(rgbCommaMatch[3]!, 10),
    };
  }

  return null;
}

function rgbToLab(rgb: RGB): Lab {
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  let x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  let y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) / 1.00000;
  let z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;

  const f = (t: number) =>
    t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116;

  x = f(x);
  y = f(y);
  z = f(z);

  return {
    L: 116 * y - 16,
    a: 500 * (x - y),
    b: 200 * (y - z),
  };
}

/**
 * CIEDE2000 color difference.
 * Returns 0 for identical colors; higher values = more different.
 * Roughly: <1 imperceptible, <5 barely noticeable, <15 same ballpark, >30 very different.
 */
function deltaE(c1: RGB, c2: RGB): number {
  const lab1 = rgbToLab(c1);
  const lab2 = rgbToLab(c2);

  const L1 = lab1.L, a1 = lab1.a, b1 = lab1.b;
  const L2 = lab2.L, a2 = lab2.a, b2 = lab2.b;

  const avgL = (L1 + L2) / 2;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const avgC = (C1 + C2) / 2;

  const G =
    0.5 *
    (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));

  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  let h1p = Math.atan2(b1, a1p) * (180 / Math.PI);
  if (h1p < 0) h1p += 360;
  let h2p = Math.atan2(b2, a2p) * (180 / Math.PI);
  if (h2p < 0) h2p += 360;

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp: number;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else if (Math.abs(h2p - h1p) <= 180) {
    dhp = h2p - h1p;
  } else if (h2p - h1p > 180) {
    dhp = h2p - h1p - 360;
  } else {
    dhp = h2p - h1p + 360;
  }

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI) / 360);

  const avgLp = (L1 + L2) / 2;
  const avgCp = (C1p + C2p) / 2;

  let avgHp: number;
  if (C1p * C2p === 0) {
    avgHp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    avgHp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    avgHp = (h1p + h2p + 360) / 2;
  } else {
    avgHp = (h1p + h2p - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(((avgHp - 30) * Math.PI) / 180) +
    0.24 * Math.cos(((2 * avgHp) * Math.PI) / 180) +
    0.32 * Math.cos(((3 * avgHp + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * avgHp - 63) * Math.PI) / 180);

  const SL =
    1 +
    (0.015 * Math.pow(avgLp - 50, 2)) /
      Math.sqrt(20 + Math.pow(avgLp - 50, 2));
  const SC = 1 + 0.045 * avgCp;
  const SH = 1 + 0.015 * avgCp * T;

  const RT =
    -2 *
    Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7))) *
    Math.sin(
      ((60 * Math.exp(-Math.pow((avgHp - 275) / 25, 2))) * Math.PI) / 180,
    );

  return Math.sqrt(
    Math.pow(dLp / SL, 2) +
      Math.pow(dCp / SC, 2) +
      Math.pow(dHp / SH, 2) +
      RT * (dCp / SC) * (dHp / SH),
  );
}

// ─── Scoring Logic ───────────────────────────────────────────────────

function scoreColorMatch(
  expected: string,
  actual: string,
  tolerance: number,
): { score: number; detail: string } {
  const expLower = expected.toLowerCase().trim();
  const actLower = actual.toLowerCase().trim();

  if (expLower === actLower) return { score: 100, detail: 'exact' };

  const expRgb = parseColor(expected);
  const actRgb = parseColor(actual);

  if (!expRgb || !actRgb) {
    return expLower === actLower
      ? { score: 100, detail: 'exact (string)' }
      : { score: 0, detail: 'unparseable color' };
  }

  if (expRgb.r === actRgb.r && expRgb.g === actRgb.g && expRgb.b === actRgb.b) {
    return { score: 100, detail: 'exact (different format)' };
  }

  const dE = deltaE(expRgb, actRgb);

  if (dE <= 1) return { score: 95, detail: `imperceptible (dE=${dE.toFixed(1)})` };
  if (dE <= 5) return { score: 80, detail: `barely noticeable (dE=${dE.toFixed(1)})` };
  if (dE <= tolerance) {
    const pct = Math.round(60 * (1 - dE / tolerance) + 20);
    return { score: pct, detail: `close (dE=${dE.toFixed(1)})` };
  }

  return { score: 0, detail: `wrong (dE=${dE.toFixed(1)})` };
}

function scoreNonColorMatch(
  expected: string,
  actual: string,
): { score: number; detail: string } {
  const expNorm = expected.trim().toLowerCase().replace(/\s+/g, ' ');
  const actNorm = actual.trim().toLowerCase().replace(/\s+/g, ' ');
  if (expNorm === actNorm) return { score: 100, detail: 'exact' };
  return { score: 0, detail: `expected "${expected}", got "${actual}"` };
}

function isColorValue(value: string): boolean {
  return /^#|^rgb|^hsl|^var\(--em-/.test(value.trim());
}

function getTokenValue(
  entry: { value: string; label: string } | string,
): string {
  if (typeof entry === 'string') return entry;
  return entry.value;
}

function scoreStyleCategory(
  categoryName: string,
  golden: Record<string, { value: string; label: string } | string>,
  actual: Record<string, string>,
  tolerance: number,
  weight: number,
): CategoryResult {
  const tokenResults: TokenResult[] = [];

  for (const [token, entry] of Object.entries(golden)) {
    if (token === '_description') continue;
    const expected = getTokenValue(entry);
    if (!expected) continue;

    const actualValue = actual[token] ?? null;

    if (!actualValue) {
      tokenResults.push({
        token,
        expected,
        actual: null,
        score: 0,
        detail: 'missing',
      });
      continue;
    }

    const match = isColorValue(expected)
      ? scoreColorMatch(expected, actualValue, tolerance)
      : scoreNonColorMatch(expected, actualValue);

    tokenResults.push({
      token,
      expected,
      actual: actualValue,
      score: match.score,
      detail: match.detail,
    });
  }

  const totalTokens = tokenResults.length;
  const avgScore =
    totalTokens > 0
      ? tokenResults.reduce((sum, r) => sum + r.score, 0) / totalTokens
      : 100;

  const exact = tokenResults.filter((r) => r.score === 100).length;
  const close = tokenResults.filter((r) => r.score > 0 && r.score < 100).length;
  const missing = tokenResults.filter((r) => r.score === 0).length;

  let summary = `${exact}/${totalTokens} exact`;
  if (close > 0) summary += `, ${close} close`;
  if (missing > 0) summary += `, ${missing} wrong/missing`;

  return {
    name: categoryName,
    weight,
    score: Math.round(avgScore * 10) / 10,
    tokenResults,
    summary,
  };
}

function scoreChartColors(
  golden: { backgroundColors?: string[]; borderColors?: string[] },
  actual: { backgroundColors?: string[]; borderColors?: string[] },
  tolerance: number,
  weight: number,
): CategoryResult {
  const tokenResults: TokenResult[] = [];

  const expectedBg = golden.backgroundColors || [];
  const actualBg = actual.backgroundColors || [];

  for (let i = 0; i < expectedBg.length; i++) {
    const expected = expectedBg[i]!;
    const atPosition = actualBg[i];

    // Check exact position first
    if (atPosition) {
      const posMatch = scoreColorMatch(expected, atPosition, tolerance);
      if (posMatch.score >= 80) {
        tokenResults.push({
          token: `backgroundColors[${i}]`,
          expected,
          actual: atPosition,
          score: posMatch.score,
          detail: posMatch.detail,
        });
        continue;
      }
    }

    // Check if the color exists anywhere in the array
    let bestScore = 0;
    let bestActual: string | null = null;
    let bestDetail = 'missing';

    for (const ac of actualBg) {
      const match = scoreColorMatch(expected, ac, tolerance);
      const adjustedScore = match.score === 100 ? 80 : Math.round(match.score * 0.75);
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestActual = ac;
        bestDetail =
          match.score === 100
            ? `exact but at wrong position`
            : `${match.detail} at wrong position`;
      }
    }

    tokenResults.push({
      token: `backgroundColors[${i}]`,
      expected,
      actual: bestActual,
      score: bestScore,
      detail: bestDetail,
    });
  }

  // Score border colors if present in golden
  const expectedBorder = golden.borderColors || [];
  const actualBorder = actual.borderColors || [];

  if (expectedBorder.length > 0) {
    for (let i = 0; i < expectedBorder.length; i++) {
      const expected = expectedBorder[i]!;
      const atPosition = actualBorder[i];

      if (atPosition) {
        const posMatch = scoreColorMatch(expected, atPosition, tolerance);
        if (posMatch.score >= 80) {
          tokenResults.push({
            token: `borderColors[${i}]`,
            expected,
            actual: atPosition,
            score: posMatch.score,
            detail: posMatch.detail,
          });
          continue;
        }
      }

      let bestScore = 0;
      let bestActual: string | null = null;
      let bestDetail = 'missing';

      for (const ac of actualBorder) {
        const match = scoreColorMatch(expected, ac, tolerance);
        const adjustedScore = match.score === 100 ? 80 : Math.round(match.score * 0.75);
        if (adjustedScore > bestScore) {
          bestScore = adjustedScore;
          bestActual = ac;
          bestDetail =
            match.score === 100
              ? `exact but at wrong position`
              : `${match.detail} at wrong position`;
        }
      }

      tokenResults.push({
        token: `borderColors[${i}]`,
        expected,
        actual: bestActual,
        score: bestScore,
        detail: bestDetail,
      });
    }
  }

  const totalTokens = tokenResults.length;
  const avgScore =
    totalTokens > 0
      ? tokenResults.reduce((sum, r) => sum + r.score, 0) / totalTokens
      : 100;

  const exact = tokenResults.filter((r) => r.score === 100).length;
  const close = tokenResults.filter((r) => r.score > 0 && r.score < 100).length;
  const missing = tokenResults.filter((r) => r.score === 0).length;

  let summary = `${exact}/${totalTokens} exact`;
  if (close > 0) summary += `, ${close} close`;
  if (missing > 0) summary += `, ${missing} wrong/missing`;

  return {
    name: 'Chart Colors',
    weight,
    score: Math.round(avgScore * 10) / 10,
    tokenResults,
    summary,
  };
}

function runStructuralChecks(
  theme: ParsedTheme,
): { name: string; passed: boolean; detail: string }[] {
  const checks: { name: string; passed: boolean; detail: string }[] = [];

  // Check: uses semantic tokens
  const semTokens = Object.keys(theme.styles).filter((k) =>
    k.startsWith('--em-sem-'),
  );
  checks.push({
    name: 'Uses semantic tokens',
    passed: semTokens.length > 0,
    detail:
      semTokens.length > 0
        ? `${semTokens.length} semantic tokens found`
        : 'No --em-sem-* tokens found',
  });

  // Check: no gray scale overrides
  const grayTokens = Object.keys(theme.styles).filter((k) =>
    k.startsWith('--em-core-color-gray'),
  );
  checks.push({
    name: 'No gray scale overrides',
    passed: grayTokens.length === 0,
    detail:
      grayTokens.length === 0
        ? 'Clean — no --em-core-color-gray-* tokens'
        : `BAD: ${grayTokens.length} gray scale tokens overridden: ${grayTokens.join(', ')}`,
  });

  // Check: no font tokens
  const fontTokens = Object.keys(theme.styles).filter(
    (k) => k.includes('font-family'),
  );
  checks.push({
    name: 'No font tokens',
    passed: fontTokens.length === 0,
    detail:
      fontTokens.length === 0
        ? 'Clean — no font-family tokens'
        : `BAD: ${fontTokens.length} font tokens set: ${fontTokens.join(', ')}`,
  });

  // Check: has chart colors
  const bgColors = theme.charts?.backgroundColors || [];
  checks.push({
    name: 'Chart colors provided',
    passed: bgColors.length >= 6,
    detail:
      bgColors.length >= 6
        ? `${bgColors.length} chart colors (good coverage)`
        : `Only ${bgColors.length} chart colors (recommend 6+)`,
  });

  return checks;
}

// ─── Report Formatting ───────────────────────────────────────────────

function formatReport(report: ScoreReport): string {
  const lines: string[] = [];
  const divider = '─'.repeat(50);

  lines.push(`Test: ${report.testName}`);
  if (report.extractionOnly) {
    lines.push('Mode: EXTRACTION-ONLY (derived tokens skipped)');
  }
  lines.push('═'.repeat(50));
  lines.push('');

  for (const cat of report.categories) {
    const pct = `${cat.score}%`.padStart(6);
    lines.push(`${cat.name.padEnd(20)}${pct}  (${cat.summary})`);

    for (const tr of cat.tokenResults) {
      if (tr.score < 100) {
        const status = tr.score === 0 ? 'MISS' : 'CLOSE';
        lines.push(
          `  ${status.padEnd(6)} ${tr.token}: ${tr.detail}`,
        );
      }
    }

    if (cat.skippedTokens && cat.skippedTokens.length > 0) {
      lines.push(`  SKIP  ${cat.skippedTokens.length} derived token(s): ${cat.skippedTokens.join(', ')}`);
    }
  }

  if (report.skippedCategories.length > 0) {
    lines.push('');
    for (const sc of report.skippedCategories) {
      lines.push(`${sc.name.padEnd(20)}  SKIP  (${sc.reason})`);
    }
  }

  lines.push(divider);

  const allPassed = report.structuralChecks.every((c) => c.passed);
  lines.push(
    `Structural:         ${allPassed ? 'PASS' : 'FAIL'}`,
  );
  for (const check of report.structuralChecks) {
    const icon = check.passed ? 'OK' : 'FAIL';
    lines.push(`  ${icon.padEnd(6)} ${check.name}: ${check.detail}`);
  }

  lines.push(divider);
  lines.push(`Weighted Score:     ${report.weightedScore}%`);
  lines.push('');

  return lines.join('\n');
}

function formatJson(report: ScoreReport): string {
  return JSON.stringify(
    {
      testName: report.testName,
      extractionOnly: report.extractionOnly,
      weightedScore: report.weightedScore,
      categories: report.categories.map((c) => ({
        name: c.name,
        weight: c.weight,
        score: c.score,
        summary: c.summary,
        tokens: c.tokenResults,
        skippedTokens: c.skippedTokens,
      })),
      skippedCategories: report.skippedCategories,
      structural: report.structuralChecks,
    },
    null,
    2,
  );
}

// ─── Figma Token Filtering ────────────────────────────────────────────

function filterGoldenByExtraction(
  golden: GoldenStandard,
  figma: FigmaTokens,
): {
  filtered: GoldenStandard['expected'];
  skippedCategories: SkippedCategory[];
  skippedTokensPerCategory: Record<string, string[]>;
  chartLimit: number | null;
} {
  const weights = golden.scoring.weights;
  const expected = golden.expected;
  const skippedCategories: SkippedCategory[] = [];
  const skippedTokensPerCategory: Record<string, string[]> = {};
  const filtered: GoldenStandard['expected'] = {};

  const chartCandidateCount = figma.chartColorCandidates?.length ?? 0;
  let chartLimit: number | null = null;

  if (expected.chartColors) {
    if (chartCandidateCount > 0) {
      chartLimit = chartCandidateCount;
      const bgColors = expected.chartColors.backgroundColors ?? [];
      const borderColors = expected.chartColors.borderColors ?? [];
      filtered.chartColors = {
        backgroundColors: bgColors.slice(0, chartCandidateCount),
        borderColors: borderColors.length > 0
          ? borderColors.slice(0, chartCandidateCount)
          : [],
      };
      if (bgColors.length > chartCandidateCount) {
        skippedTokensPerCategory['Chart Colors'] = bgColors
          .slice(chartCandidateCount)
          .map((_, i) => `backgroundColors[${chartCandidateCount + i}]`);
      }
    } else {
      skippedCategories.push({
        name: 'Chart Colors',
        weight: weights.chartColors ?? 30,
        reason: 'no chart color candidates in extraction',
      });
    }
  }

  const candidateMap: [string, string, Record<string, string> | undefined][] = [
    ['backgrounds', 'Backgrounds', figma.backgroundCandidates],
    ['textColors', 'Text Colors', figma.textColorCandidates],
    ['statusColors', 'Status Colors', figma.statusColorCandidates],
  ];

  for (const [key, displayName, candidates] of candidateMap) {
    const goldenCat = expected[key as keyof typeof expected] as
      | Record<string, any>
      | undefined;
    if (!goldenCat) continue;

    const candidateKeys = candidates ? Object.keys(candidates) : [];

    if (candidateKeys.length === 0) {
      skippedCategories.push({
        name: displayName,
        weight: weights[key] ?? 10,
        reason: 'no candidates in extraction',
      });
      continue;
    }

    const filteredCat: Record<string, any> = {};
    const skipped: string[] = [];

    for (const [token, entry] of Object.entries(goldenCat)) {
      if (token.startsWith('_')) {
        filteredCat[token] = entry;
        continue;
      }
      if (candidateKeys.includes(token)) {
        filteredCat[token] = entry;
      } else {
        skipped.push(token);
      }
    }

    (filtered as any)[key] = filteredCat;
    if (skipped.length > 0) {
      skippedTokensPerCategory[displayName] = skipped;
    }
  }

  const effectCount = figma.effects?.length ?? 0;
  if (expected.shadows) {
    if (effectCount > 0) {
      filtered.shadows = expected.shadows;
    } else {
      skippedCategories.push({
        name: 'Shadows',
        weight: weights.shadows ?? 10,
        reason: 'no effects in extraction',
      });
    }
  }

  return { filtered, skippedCategories, skippedTokensPerCategory, chartLimit };
}

// ─── Main ────────────────────────────────────────────────────────────

async function scoreTheme(
  goldenPath: string,
  themePath: string,
  figmaTokensPath?: string,
): Promise<ScoreReport> {
  const goldenRaw = await readFile(resolve(goldenPath), 'utf-8');
  const golden: GoldenStandard = JSON.parse(goldenRaw);
  const theme = await parseThemeFile(themePath);

  const tolerance = golden.scoring.colorTolerance ?? 15;
  const weights = golden.scoring.weights;
  const extractionOnly = !!figmaTokensPath;

  let figma: FigmaTokens | null = null;
  let expected = golden.expected;
  let allSkippedCategories: SkippedCategory[] = [];
  let skippedTokensPerCategory: Record<string, string[]> = {};

  if (figmaTokensPath) {
    const figmaRaw = await readFile(resolve(figmaTokensPath), 'utf-8');
    figma = JSON.parse(figmaRaw);
    const result = filterGoldenByExtraction(golden, figma!);
    expected = result.filtered;
    allSkippedCategories = result.skippedCategories;
    skippedTokensPerCategory = result.skippedTokensPerCategory;
  }

  const categories: CategoryResult[] = [];

  if (expected.chartColors) {
    const result = scoreChartColors(
      expected.chartColors,
      theme.charts,
      tolerance,
      weights.chartColors ?? 30,
    );
    result.skippedTokens = skippedTokensPerCategory['Chart Colors'];
    categories.push(result);
  }

  const styleCategories: [string, string, Record<string, any> | undefined][] = [
    ['Backgrounds', 'backgrounds', expected.backgrounds],
    ['Text Colors', 'textColors', expected.textColors],
    ['Status Colors', 'statusColors', expected.statusColors],
    ['Shadows', 'shadows', expected.shadows],
  ];

  for (const [displayName, weightKey, goldenCat] of styleCategories) {
    if (!goldenCat) continue;
    const result = scoreStyleCategory(
      displayName,
      goldenCat,
      theme.styles,
      tolerance,
      weights[weightKey] ?? 10,
    );
    result.skippedTokens = skippedTokensPerCategory[displayName];
    categories.push(result);
  }

  const structuralChecks = runStructuralChecks(theme);

  const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
  const weightedSum = categories.reduce(
    (s, c) => s + c.score * c.weight,
    0,
  );
  const weightedScore =
    totalWeight > 0
      ? Math.round((weightedSum / totalWeight) * 10) / 10
      : 0;

  return {
    testName: golden.meta.name,
    extractionOnly,
    categories,
    skippedCategories: allSkippedCategories,
    structuralChecks,
    weightedScore,
  };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(
      'Usage: npx tsx scripts/score-theme.ts <golden.json> [embeddable.theme.ts] [--figma-tokens <path>] [--json]',
    );
    process.exit(1);
  }

  const goldenPath = args[0]!;
  const themePath = args.find((a) => a.endsWith('.ts')) || 'embeddable.theme.ts';
  const jsonOutput = args.includes('--json');

  let figmaTokensPath: string | undefined;
  const ftIdx = args.indexOf('--figma-tokens');
  if (ftIdx !== -1 && args[ftIdx + 1]) {
    figmaTokensPath = args[ftIdx + 1];
  }

  try {
    const report = await scoreTheme(goldenPath, themePath, figmaTokensPath);

    if (jsonOutput) {
      console.log(formatJson(report));
    } else {
      console.log(formatReport(report));
    }

    process.exit(report.weightedScore >= 70 ? 0 : 1);
  } catch (err: any) {
    console.error('Scoring failed:', err.message);
    process.exit(1);
  }
}

main();
