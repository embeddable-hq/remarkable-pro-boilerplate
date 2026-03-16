/**
 * Figma Token Extraction Script
 *
 * Extracts design tokens (colors, text styles, effects) from a Figma file
 * by traversing the document tree AND checking local/published styles.
 *
 * Usage:
 *   npx tsx scripts/extract-figma-tokens.ts <FIGMA_FILE_URL_OR_KEY> [--output figma-tokens.json]
 *
 * Prerequisites:
 *   - Set FIGMA_ACCESS_TOKEN env var (get from https://www.figma.com/developers/api#access-tokens)
 *   - Install tsx: npm i -D tsx
 */

const FIGMA_API_BASE = 'https://api.figma.com/v1';

// ─── Types ───────────────────────────────────────────────────────────

interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface ExtractedColor {
  name: string;
  hex: string;
  rgb: string;
  opacity: number;
  source: 'style' | 'node-fill' | 'node-stroke';
  nodePath: string;
}

interface ExtractedTextStyle {
  name: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: string;
  letterSpacing: string;
  source: 'style' | 'node';
}

interface ExtractedEffect {
  name: string;
  type: string;
  color: string;
  offset: { x: number; y: number };
  blur: number;
  spread: number;
}

interface ExtractedTokens {
  meta: {
    fileName: string;
    fileKey: string;
    extractedAt: string;
    nodeId?: string;
    totalNodesScanned: number;
  };
  colors: ExtractedColor[];
  textStyles: ExtractedTextStyle[];
  effects: ExtractedEffect[];
  chartColorCandidates: string[];
  backgroundCandidates: Record<string, string>;
  textColorCandidates: Record<string, string>;
  statusColorCandidates: Record<string, string>;
  fontFamilyCandidates: string[];
  summary: string;
}

// ─── Color Utilities ─────────────────────────────────────────────────

function figmaColorToHex(color: FigmaColor): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function figmaColorToRgb(color: FigmaColor): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgb(${r} ${g} ${b})`;
}

function figmaColorToRgba(color: FigmaColor): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = Math.round(color.a * 100) / 100;
  return `rgb(${r} ${g} ${b} / ${a * 100}%)`;
}

function hexToLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function isNearWhite(hex: string): boolean {
  return hexToLuminance(hex) > 0.9;
}

function isNearBlack(hex: string): boolean {
  return hexToLuminance(hex) < 0.05;
}

function isGrayish(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max - min) < 30;
}

// ─── Figma API ───────────────────────────────────────────────────────

function parseFileKey(input: string): { fileKey: string; nodeId: string | null } {
  const urlMatch = input.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  const nodeMatch = input.match(/node-id=([^&]+)/);
  const fileKey = urlMatch ? urlMatch[1]! : input.replace(/[^a-zA-Z0-9]/g, '');
  const nodeId = nodeMatch ? decodeURIComponent(nodeMatch[1]!) : null;
  return { fileKey, nodeId };
}

async function figmaFetch<T>(endpoint: string, token: string): Promise<T> {
  const res = await fetch(`${FIGMA_API_BASE}${endpoint}`, {
    headers: { 'X-Figma-Token': token },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Figma API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ─── Node Traversal ──────────────────────────────────────────────────

interface TraversalState {
  colors: Map<string, ExtractedColor>;
  textStyles: Map<string, ExtractedTextStyle>;
  effects: Map<string, ExtractedEffect>;
  nodeCount: number;
}

function getNodePath(node: any, parentPath: string): string {
  const name = node.name || node.type || 'unnamed';
  return parentPath ? `${parentPath} > ${name}` : name;
}

function traverseNode(node: any, state: TraversalState, path: string): void {
  state.nodeCount++;
  const nodePath = getNodePath(node, path);

  // Extract fills
  if (node.fills && Array.isArray(node.fills)) {
    for (const fill of node.fills) {
      if (fill.type === 'SOLID' && fill.visible !== false && fill.color) {
        const opacity = fill.opacity ?? fill.color.a ?? 1;
        if (opacity < 0.01) continue;
        const hex = figmaColorToHex(fill.color);
        const key = `fill:${hex}`;
        if (!state.colors.has(key)) {
          state.colors.set(key, {
            name: node.name || 'unnamed',
            hex,
            rgb: figmaColorToRgb(fill.color),
            opacity,
            source: 'node-fill',
            nodePath,
          });
        }
      }
    }
  }

  // Extract strokes
  if (node.strokes && Array.isArray(node.strokes)) {
    for (const stroke of node.strokes) {
      if (stroke.type === 'SOLID' && stroke.visible !== false && stroke.color) {
        const hex = figmaColorToHex(stroke.color);
        const key = `stroke:${hex}`;
        if (!state.colors.has(key)) {
          state.colors.set(key, {
            name: `${node.name || 'unnamed'} (stroke)`,
            hex,
            rgb: figmaColorToRgb(stroke.color),
            opacity: stroke.opacity ?? stroke.color.a ?? 1,
            source: 'node-stroke',
            nodePath,
          });
        }
      }
    }
  }

  // Extract text styles
  if (node.type === 'TEXT' && node.style) {
    const ts = node.style;
    const fontFamily = ts.fontFamily || 'unknown';
    const fontSize = ts.fontSize || 16;
    const fontWeight = ts.fontWeight || 400;

    let lineHeight = 'normal';
    if (ts.lineHeightUnit === 'PIXELS') {
      lineHeight = `${Math.round(ts.lineHeightPx)}px`;
    } else if (ts.lineHeightUnit === 'PERCENT') {
      lineHeight = `${Math.round(ts.lineHeightPercent)}%`;
    } else if (ts.lineHeightPx) {
      lineHeight = `${Math.round(ts.lineHeightPx)}px`;
    }

    const key = `${fontFamily}:${fontWeight}:${fontSize}`;
    if (!state.textStyles.has(key)) {
      state.textStyles.set(key, {
        name: node.name || 'unnamed',
        fontFamily,
        fontWeight,
        fontSize,
        lineHeight,
        letterSpacing: ts.letterSpacing ? `${ts.letterSpacing}px` : '0px',
        source: 'node',
      });
    }
  }

  // Extract effects
  if (node.effects && Array.isArray(node.effects)) {
    for (const effect of node.effects) {
      if ((effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') && effect.visible !== false) {
        const key = `${effect.type}:${effect.radius}:${effect.offset?.x}:${effect.offset?.y}`;
        if (!state.effects.has(key)) {
          state.effects.set(key, {
            name: node.name || 'unnamed',
            type: effect.type,
            color: effect.color ? figmaColorToRgba(effect.color) : 'rgb(0 0 0 / 25%)',
            offset: { x: effect.offset?.x || 0, y: effect.offset?.y || 0 },
            blur: effect.radius || 0,
            spread: effect.spread || 0,
          });
        }
      }
    }
  }

  // Recurse into children
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      traverseNode(child, state, nodePath);
    }
  }
}

// ─── Classification ──────────────────────────────────────────────────

function classifyColorByName(name: string): {
  category: 'chart' | 'background' | 'text' | 'status' | 'unknown';
  semanticKey: string | null;
} {
  const lower = name.toLowerCase();

  if (/error|danger|red|destructive|negative/i.test(lower)) {
    if (/background|bg|surface|fill/i.test(lower))
      return { category: 'status', semanticKey: '--em-sem-status-error-background' };
    return { category: 'status', semanticKey: '--em-sem-status-error-text' };
  }
  if (/success|green|positive/i.test(lower)) {
    if (/background|bg|surface|fill/i.test(lower))
      return { category: 'status', semanticKey: '--em-sem-status-success-background' };
    return { category: 'status', semanticKey: '--em-sem-status-success-text' };
  }

  if (/chart|series|data[-\s]?vi|palette|accent|color[-\s]?\d/i.test(lower)) {
    return { category: 'chart', semanticKey: null };
  }

  if (/background|surface|bg|canvas|base|container|card|panel|page/i.test(lower)) {
    if (/inverted|dark|tooltip/i.test(lower))
      return { category: 'background', semanticKey: '--em-sem-background--inverted' };
    if (/light|secondary/i.test(lower))
      return { category: 'background', semanticKey: '--em-sem-background--light' };
    if (/muted|pressed/i.test(lower))
      return { category: 'background', semanticKey: '--em-sem-background--muted' };
    if (/neutral|container|page/i.test(lower))
      return { category: 'background', semanticKey: '--em-sem-background--neutral' };
    if (/subtle|hover/i.test(lower))
      return { category: 'background', semanticKey: '--em-sem-background--subtle' };
    return { category: 'background', semanticKey: '--em-sem-background' };
  }

  if (/text|foreground|heading|body|label|title|paragraph/i.test(lower)) {
    if (/inverted|white|on[-\s]?dark/i.test(lower))
      return { category: 'text', semanticKey: '--em-sem-text--inverted' };
    if (/muted|secondary|subtitle/i.test(lower))
      return { category: 'text', semanticKey: '--em-sem-text--muted' };
    if (/subtle|disabled|placeholder/i.test(lower))
      return { category: 'text', semanticKey: '--em-sem-text--subtle' };
    return { category: 'text', semanticKey: '--em-sem-text' };
  }

  return { category: 'unknown', semanticKey: null };
}

function classifyByLuminance(colors: ExtractedColor[]): {
  chartColors: string[];
  backgrounds: Record<string, string>;
  textColors: Record<string, string>;
} {
  const chartColors: string[] = [];
  const backgrounds: Record<string, string> = {};
  const textColors: Record<string, string> = {};

  const chromatic = colors.filter(c => !isGrayish(c.hex) && !isNearWhite(c.hex) && !isNearBlack(c.hex));
  const uniqueChromatic = [...new Set(chromatic.map(c => c.hex))];

  // Chromatic colors are chart color candidates
  for (const hex of uniqueChromatic) {
    chartColors.push(hex);
  }

  // Sort grays by luminance for background/text assignment
  const grays = colors.filter(c => isGrayish(c.hex));
  const uniqueGrays = [...new Set(grays.map(c => c.hex))];
  const sortedGrays = uniqueGrays.sort((a, b) => hexToLuminance(b) - hexToLuminance(a));

  if (sortedGrays.length >= 1) {
    const lightest = sortedGrays[0]!;
    if (hexToLuminance(lightest) > 0.8) {
      backgrounds['--em-sem-background'] = lightest;
    }
  }
  if (sortedGrays.length >= 2) {
    const secondLightest = sortedGrays[1]!;
    if (hexToLuminance(secondLightest) > 0.7) {
      backgrounds['--em-sem-background--neutral'] = secondLightest;
    }
  }
  if (sortedGrays.length >= 1) {
    const darkest = sortedGrays[sortedGrays.length - 1]!;
    if (hexToLuminance(darkest) < 0.2) {
      textColors['--em-sem-text'] = darkest;
    }
  }
  if (sortedGrays.length >= 2) {
    const secondDarkest = sortedGrays[sortedGrays.length - 2]!;
    if (hexToLuminance(secondDarkest) < 0.4) {
      textColors['--em-sem-text--muted'] = secondDarkest;
    }
  }

  return { chartColors, backgrounds, textColors };
}

// ─── Style extraction (local styles from file metadata) ──────────────

function extractLocalStyles(
  fileStyles: Record<string, any> | undefined,
  styleNodes: Record<string, any>,
): { colors: ExtractedColor[]; textStyles: ExtractedTextStyle[]; effects: ExtractedEffect[] } {
  const colors: ExtractedColor[] = [];
  const textStyles: ExtractedTextStyle[] = [];
  const effects: ExtractedEffect[] = [];

  if (!fileStyles) return { colors, textStyles, effects };

  for (const [styleId, styleMeta] of Object.entries(fileStyles)) {
    const nodeWrapper = styleNodes[styleId];
    const node = nodeWrapper?.document || nodeWrapper;
    if (!node) continue;

    if (styleMeta.styleType === 'FILL') {
      const fills = node.fills || [];
      const solidFill = fills.find((f: any) => f.type === 'SOLID' && f.visible !== false);
      if (solidFill?.color) {
        const hex = figmaColorToHex(solidFill.color);
        colors.push({
          name: styleMeta.name || 'unnamed style',
          hex,
          rgb: figmaColorToRgb(solidFill.color),
          opacity: solidFill.opacity ?? solidFill.color.a ?? 1,
          source: 'style',
          nodePath: `styles/${styleMeta.name}`,
        });
      }
    }

    if (styleMeta.styleType === 'TEXT') {
      const ts = node.style;
      if (ts) {
        let lineHeight = 'normal';
        if (ts.lineHeightUnit === 'PIXELS') lineHeight = `${Math.round(ts.lineHeightPx)}px`;
        else if (ts.lineHeightUnit === 'PERCENT') lineHeight = `${Math.round(ts.lineHeightPercent)}%`;
        else if (ts.lineHeightPx) lineHeight = `${Math.round(ts.lineHeightPx)}px`;

        textStyles.push({
          name: styleMeta.name || 'unnamed style',
          fontFamily: ts.fontFamily || 'unknown',
          fontWeight: ts.fontWeight || 400,
          fontSize: ts.fontSize || 16,
          lineHeight,
          letterSpacing: ts.letterSpacing ? `${ts.letterSpacing}px` : '0px',
          source: 'style',
        });
      }
    }

    if (styleMeta.styleType === 'EFFECT') {
      for (const effect of (node.effects || [])) {
        if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
          effects.push({
            name: styleMeta.name || 'unnamed',
            type: effect.type,
            color: effect.color ? figmaColorToRgba(effect.color) : 'rgb(0 0 0 / 25%)',
            offset: { x: effect.offset?.x || 0, y: effect.offset?.y || 0 },
            blur: effect.radius || 0,
            spread: effect.spread || 0,
          });
        }
      }
    }
  }

  return { colors, textStyles, effects };
}

// ─── Main Extraction ─────────────────────────────────────────────────

async function extractTokens(fileKey: string, nodeId: string | null, token: string): Promise<ExtractedTokens> {
  console.log(`Fetching Figma file: ${fileKey}${nodeId ? ` (node: ${nodeId})` : ''}...`);

  // Fetch the full file (or specific node branch)
  let fileData: any;
  if (nodeId) {
    const formattedNodeId = nodeId.replace('-', ':');
    console.log(`Fetching specific node: ${formattedNodeId}`);
    const nodesResponse = await figmaFetch<any>(
      `/files/${fileKey}/nodes?ids=${formattedNodeId}&depth=100`,
      token,
    );
    const nodeData = nodesResponse.nodes?.[formattedNodeId];
    if (!nodeData?.document) {
      console.log('Node not found with formatted ID, fetching full file instead...');
      fileData = await figmaFetch<any>(`/files/${fileKey}`, token);
    } else {
      fileData = {
        name: nodesResponse.name || 'Unknown',
        document: nodeData.document,
        styles: nodesResponse.styles || {},
      };
    }
  } else {
    fileData = await figmaFetch<any>(`/files/${fileKey}`, token);
  }

  const fileName = fileData.name || 'Unknown';
  console.log(`File: "${fileName}"`);

  // Step 1: Try local styles from file metadata
  const localStyles = fileData.styles || {};
  const localStyleCount = Object.keys(localStyles).length;
  console.log(`Found ${localStyleCount} local styles in file metadata`);

  // Fetch style node details if styles exist
  let styleNodeDetails: Record<string, any> = {};
  if (localStyleCount > 0) {
    const styleIds = Object.keys(localStyles);
    const batchSize = 50;
    for (let i = 0; i < styleIds.length; i += batchSize) {
      const batch = styleIds.slice(i, i + batchSize);
      try {
        const nodesResp = await figmaFetch<any>(
          `/files/${fileKey}/nodes?ids=${batch.join(',')}`,
          token,
        );
        for (const [id, data] of Object.entries(nodesResp.nodes || {})) {
          styleNodeDetails[id] = data;
        }
      } catch (e) {
        console.log(`Warning: could not fetch style nodes batch: ${e}`);
      }
    }
  }

  const localExtracted = extractLocalStyles(localStyles, styleNodeDetails);
  console.log(`  From local styles: ${localExtracted.colors.length} colors, ${localExtracted.textStyles.length} text styles, ${localExtracted.effects.length} effects`);

  // Step 2: Also try published styles endpoint
  let publishedColors: ExtractedColor[] = [];
  let publishedText: ExtractedTextStyle[] = [];
  let publishedEffects: ExtractedEffect[] = [];
  try {
    const stylesResp = await figmaFetch<any>(`/files/${fileKey}/styles`, token);
    const publishedStyles: any[] = stylesResp.meta?.styles || [];
    console.log(`Found ${publishedStyles.length} published styles`);

    if (publishedStyles.length > 0) {
      const pubIds = publishedStyles.map((s: any) => s.node_id);
      const pubNodes: Record<string, any> = {};
      for (let i = 0; i < pubIds.length; i += 50) {
        const batch = pubIds.slice(i, i + 50);
        const resp = await figmaFetch<any>(`/files/${fileKey}/nodes?ids=${batch.join(',')}`, token);
        Object.assign(pubNodes, resp.nodes || {});
      }

      const pubStyleMap: Record<string, any> = {};
      for (const s of publishedStyles) {
        pubStyleMap[s.node_id] = { name: s.name, styleType: s.style_type };
      }
      const pubExtracted = extractLocalStyles(pubStyleMap, pubNodes);
      publishedColors = pubExtracted.colors;
      publishedText = pubExtracted.textStyles;
      publishedEffects = pubExtracted.effects;
      console.log(`  From published styles: ${publishedColors.length} colors, ${publishedText.length} text styles`);
    }
  } catch (e) {
    console.log('Published styles endpoint not available or empty');
  }

  // Step 3: Traverse the document tree for fills/text/effects on actual nodes
  console.log('Traversing document tree for design tokens...');
  const state: TraversalState = {
    colors: new Map(),
    textStyles: new Map(),
    effects: new Map(),
    nodeCount: 0,
  };

  const rootNode = fileData.document;
  if (rootNode) {
    traverseNode(rootNode, state, '');
  }

  const treeColors = Array.from(state.colors.values());
  const treeText = Array.from(state.textStyles.values());
  const treeEffects = Array.from(state.effects.values());
  console.log(`  From node traversal: ${treeColors.length} unique colors, ${treeText.length} text styles, ${treeEffects.length} effects (scanned ${state.nodeCount} nodes)`);

  // Merge all sources (styles take priority for naming)
  const allColors = [...localExtracted.colors, ...publishedColors, ...treeColors];
  const allText = [...localExtracted.textStyles, ...publishedText, ...treeText];
  const allEffects = [...localExtracted.effects, ...publishedEffects, ...treeEffects];

  // Deduplicate colors by hex
  const colorMap = new Map<string, ExtractedColor>();
  for (const c of allColors) {
    const existing = colorMap.get(c.hex);
    if (!existing || c.source === 'style') {
      colorMap.set(c.hex, c);
    }
  }
  const uniqueColors = Array.from(colorMap.values());

  // Deduplicate text styles by key
  const textMap = new Map<string, ExtractedTextStyle>();
  for (const t of allText) {
    const key = `${t.fontFamily}:${t.fontWeight}:${t.fontSize}`;
    if (!textMap.has(key) || t.source === 'style') {
      textMap.set(key, t);
    }
  }
  const uniqueText = Array.from(textMap.values());

  // Deduplicate effects
  const effectMap = new Map<string, ExtractedEffect>();
  for (const e of allEffects) {
    const key = `${e.type}:${e.blur}:${e.offset.x}:${e.offset.y}`;
    if (!effectMap.has(key)) effectMap.set(key, e);
  }
  const uniqueEffects = Array.from(effectMap.values());

  // Classify colors
  const chartColorCandidates: string[] = [];
  const backgroundCandidates: Record<string, string> = {};
  const textColorCandidates: Record<string, string> = {};
  const statusColorCandidates: Record<string, string> = {};

  // First pass: classify by name (higher confidence)
  for (const color of uniqueColors) {
    const classification = classifyColorByName(color.name);
    if (classification.category === 'chart') {
      chartColorCandidates.push(color.hex);
    } else if (classification.semanticKey) {
      if (classification.category === 'background') {
        backgroundCandidates[classification.semanticKey] = color.hex;
      } else if (classification.category === 'text') {
        textColorCandidates[classification.semanticKey] = color.hex;
      } else if (classification.category === 'status') {
        statusColorCandidates[classification.semanticKey] = color.hex;
      }
    }
  }

  // Second pass: if we got very few name-based matches, classify by luminance
  const totalNameMatches = chartColorCandidates.length +
    Object.keys(backgroundCandidates).length +
    Object.keys(textColorCandidates).length +
    Object.keys(statusColorCandidates).length;

  if (totalNameMatches < 3 && uniqueColors.length > 0) {
    console.log('Few name-based matches found, using luminance-based classification...');
    const lumResult = classifyByLuminance(uniqueColors);
    if (chartColorCandidates.length === 0) {
      chartColorCandidates.push(...lumResult.chartColors);
    }
    for (const [key, val] of Object.entries(lumResult.backgrounds)) {
      if (!backgroundCandidates[key]) backgroundCandidates[key] = val;
    }
    for (const [key, val] of Object.entries(lumResult.textColors)) {
      if (!textColorCandidates[key]) textColorCandidates[key] = val;
    }
  }

  // Extract unique font families
  const fontFamilies = [...new Set(uniqueText.map(t => t.fontFamily))].filter(f => f !== 'unknown');

  const summary = [
    `Extracted from "${fileName}":`,
    `  ${uniqueColors.length} unique colors (${allColors.filter(c => c.source === 'style').length} from styles, ${allColors.filter(c => c.source !== 'style').length} from nodes)`,
    `  ${uniqueText.length} text styles (fonts: ${fontFamilies.join(', ') || 'none detected'})`,
    `  ${uniqueEffects.length} effects`,
    `  ${chartColorCandidates.length} chart color candidates`,
    `  ${Object.keys(backgroundCandidates).length} background token candidates`,
    `  ${Object.keys(textColorCandidates).length} text token candidates`,
    `  ${Object.keys(statusColorCandidates).length} status token candidates`,
  ].join('\n');

  return {
    meta: {
      fileName,
      fileKey,
      extractedAt: new Date().toISOString(),
      nodeId: nodeId || undefined,
      totalNodesScanned: state.nodeCount,
    },
    colors: uniqueColors,
    textStyles: uniqueText,
    effects: uniqueEffects,
    chartColorCandidates,
    backgroundCandidates,
    textColorCandidates,
    statusColorCandidates,
    fontFamilyCandidates: fontFamilies,
    summary,
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/extract-figma-tokens.ts <FIGMA_FILE_URL_OR_KEY> [--output path]');
    console.error('');
    console.error('Set FIGMA_ACCESS_TOKEN environment variable first.');
    console.error('Get your token at: https://www.figma.com/developers/api#access-tokens');
    process.exit(1);
  }

  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    console.error('Error: FIGMA_ACCESS_TOKEN environment variable is not set.');
    console.error('Get your token at: https://www.figma.com/developers/api#access-tokens');
    process.exit(1);
  }

  const fileInput = args[0]!;
  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx >= 0 && args[outputIdx + 1] ? args[outputIdx + 1] : 'figma-tokens.json';

  const { fileKey, nodeId } = parseFileKey(fileInput);
  console.log(`File key: ${fileKey}${nodeId ? `, node: ${nodeId}` : ''}\n`);

  try {
    const tokens = await extractTokens(fileKey, nodeId, token);

    const { writeFile } = await import('node:fs/promises');
    await writeFile(outputPath, JSON.stringify(tokens, null, 2));

    console.log(`\n${tokens.summary}`);
    console.log(`\nTokens written to: ${outputPath}`);
    console.log(`\nNext: Open Cursor and ask "Based on figma-tokens.json, update embeddable.theme.ts to match this design."`);
  } catch (err) {
    console.error('\nExtraction failed:', err);
    process.exit(1);
  }
}

main();
