/**
 * emb-runtime.ts
 *
 * Faithful data-layer + input-builder for the sandbox.
 *
 * Key responsibilities:
 *   1. isLoadDataSentinel — detect values returned by the real loadData()
 *   2. mockDataResponse   — synthesise mock rows from a sentinel's requestParams
 *   3. resolveLoadData    — walk a props object, replacing every sentinel with mock data
 *   4. buildInputs        — map meta.inputs → concrete values (data mocks + user controls)
 */

import type { DataResponse } from '@embeddable.com/core';

// ─── 1. Sentinel detection ────────────────────────────────────────────────────

export function isLoadDataSentinel(v: unknown): boolean {
  return (
    v !== null &&
    typeof v === 'object' &&
    'requestParams' in (v as object) &&
    'dataLoader' in (v as object)
  );
}

// ─── 2. Mock data generation ──────────────────────────────────────────────────

type SelectItem =
  | { __type__: 'measure'; name: string; nativeType?: string }
  | { __type__: 'dimension'; name: string; nativeType?: string }
  | { dimension: { name: string; nativeType?: string; __type__?: string }; granularity?: string };

function classifyItem(item: SelectItem): 'measure' | 'time' | 'category' {
  if (!item) return 'category';
  // Time wrapper: has .dimension but no __type__ directly
  if ('dimension' in item && !('__type__' in item)) return 'time';
  if ('__type__' in item) {
    if ((item as any).__type__ === 'measure') return 'measure';
    if ((item as any).nativeType === 'time') return 'time';
    return 'category';
  }
  return 'category';
}

function itemName(item: SelectItem): string {
  if ('dimension' in item && !('__type__' in item)) {
    return (item as any).dimension.name;
  }
  return (item as any).name;
}

// ── Granularity-aware time buckets, anchored to the present ─────────────────────
// The mock time series ENDS at the current period so the latest bucket is in progress
// (lets the "incomplete period" line chart show its dotted current segment).
function granularityOf(item: SelectItem): string {
  if ('dimension' in item && !('__type__' in item)) return (item as any).granularity ?? 'day';
  return (item as any).inputs?.granularity ?? 'day';
}

function startOfPeriod(now: Date, g: string): Date {
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth();
  const day = new Date(Date.UTC(y, mo, now.getUTCDate()));
  switch (g) {
    case 'year':
      return new Date(Date.UTC(y, 0, 1));
    case 'quarter':
      return new Date(Date.UTC(y, Math.floor(mo / 3) * 3, 1));
    case 'month':
      return new Date(Date.UTC(y, mo, 1));
    case 'week': {
      const monOffset = (day.getUTCDay() + 6) % 7; // ISO week starts Monday
      const s = new Date(day);
      s.setUTCDate(day.getUTCDate() - monOffset);
      return s;
    }
    case 'hour':
      return new Date(Date.UTC(y, mo, now.getUTCDate(), now.getUTCHours()));
    case 'day':
    default:
      return day;
  }
}

function stepBack(date: Date, g: string, n: number): Date {
  const e = new Date(date);
  switch (g) {
    case 'year':
      e.setUTCFullYear(e.getUTCFullYear() - n);
      break;
    case 'quarter':
      e.setUTCMonth(e.getUTCMonth() - 3 * n);
      break;
    case 'month':
      e.setUTCMonth(e.getUTCMonth() - n);
      break;
    case 'week':
      e.setUTCDate(e.getUTCDate() - 7 * n);
      break;
    case 'hour':
      e.setUTCHours(e.getUTCHours() - n);
      break;
    case 'day':
    default:
      e.setUTCDate(e.getUTCDate() - n);
  }
  return e;
}

const GRANULARITY_DEFAULT_COUNT: Record<string, number> = {
  hour: 48,
  day: 90,
  week: 26,
  month: 18,
  quarter: 8,
  year: 6,
};
const GRANULARITY_CAP: Record<string, number> = {
  hour: 168,
  day: 180,
  week: 52,
  month: 36,
  quarter: 16,
  year: 12,
};
const formatBucket = (date: Date, g: string): string =>
  g === 'hour' || g === 'minute' || g === 'second'
    ? date.toISOString()
    : date.toISOString().slice(0, 10);

// ── Realistic value pools (sampled, never cycled or suffixed) ───────────────────
// Drive both filter-dropdown distinct values and category-chart / table rows. A pool
// is chosen per requested member: by keyword on its name, else by position from a
// rotation so even generically-named mock dimensions get varied, real-looking values.
// We emit at most one row per distinct value — so we never fabricate "Germany 2".
const POOLS: Record<string, string[]> = {
  // High-cardinality "entity" pools — natural as a table/list primary column.
  artist: [
    'Taylor Swift', 'Drake', 'The Weeknd', 'Billie Eilish', 'Bad Bunny', 'Dua Lipa',
    'Kendrick Lamar', 'Adele', 'Ed Sheeran', 'Ariana Grande', 'Post Malone', 'SZA',
    'Harry Styles', 'Olivia Rodrigo', 'Travis Scott', 'Doja Cat', 'Coldplay', 'Beyoncé',
    'Bruno Mars', 'Lana Del Rey', 'Frank Ocean', 'Tame Impala', 'Khalid', 'Lorde',
  ],
  track: [
    'Anti-Hero', "God's Plan", 'Blinding Lights', 'bad guy', 'Tití Me Preguntó', 'Levitating',
    'HUMBLE.', 'Easy On Me', 'Shape of You', '7 rings', 'Circles', 'Kill Bill', 'As It Was',
    'good 4 u', 'SICKO MODE', 'Yellow', 'CUFF IT', 'Uptown Funk', 'Pink + White', 'EARFQUAKE',
    'About Damn Time', 'Holocene', 'Location', 'Royals',
  ],
  album: [
    'Midnights', 'Scorpion', 'After Hours', 'Happier Than Ever', 'Un Verano Sin Ti',
    'Future Nostalgia', 'DAMN.', '30', '÷ (Divide)', 'thank u, next', "Hollywood's Bleeding",
    'SOS', "Harry's House", 'SOUR', 'Astroworld', 'Planet Her', 'RENAISSANCE', '24K Magic',
    'Born to Die', 'Blonde', 'IGOR', 'MOTOMAMI', 'Currents', 'Pure Heroine',
  ],
  customer: [
    'Olivia Bennett', 'Liam Carter', 'Emma Walsh', 'Noah Foster', 'Ava Mitchell', 'Ethan Brooks',
    'Sophia Reed', 'Mason Hughes', 'Isabella Price', 'Lucas Ward', 'Mia Coleman', 'Logan Hayes',
    'Charlotte Ross', 'Jackson Lee', 'Amelia Cox', 'Aiden Gray', 'Harper Bell', 'Elijah Wood',
    'Evelyn Shaw', 'James Hunt', 'Abigail Cole', 'Benjamin Fox', 'Emily Stone', 'Henry Wells',
  ],
  city: [
    'New York', 'London', 'Tokyo', 'Paris', 'Berlin', 'Sydney', 'Toronto', 'São Paulo',
    'Mumbai', 'Singapore', 'Amsterdam', 'Dubai', 'Barcelona', 'Seoul', 'Mexico City',
    'Stockholm', 'Chicago', 'Madrid', 'Rome', 'Cape Town', 'Bangkok', 'Vienna', 'Lisbon', 'Dublin',
  ],
  country: [
    'United States', 'Germany', 'United Kingdom', 'France', 'Spain', 'Italy', 'Japan', 'Brazil',
    'Canada', 'Australia', 'Netherlands', 'Sweden', 'Mexico', 'India', 'South Korea', 'Poland',
    'Norway', 'Denmark', 'Ireland', 'Portugal', 'Austria', 'Belgium', 'Switzerland', 'Finland',
  ],
  // Lower-cardinality "category" pools — natural as a chart axis (bar / pie / funnel stages).
  genre: ['Pop', 'Hip-Hop', 'Rock', 'R&B', 'Electronic', 'Latin', 'Jazz', 'Classical', 'Country', 'Metal'],
  channel: ['Organic Search', 'Paid Search', 'Social', 'Email', 'Referral', 'Direct'],
  device: ['Desktop', 'Mobile', 'Tablet'],
  plan: ['Free', 'Premium', 'Family', 'Student'],
  status: ['Active', 'Trialing', 'Past Due', 'Cancelled'],
  segment: ['Enterprise', 'Mid-Market', 'SMB', 'Startup'],
  age_group: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
  boolean: ['true', 'false'],
};

// When a member name gives no hint, draw from one of these by position so multiple
// generic dimensions still differ. Entities → many rows (tables); categories → few stages.
const ENTITY_ROTATION = ['track', 'customer', 'city', 'country', 'artist', 'album'];
const CATEGORY_ROTATION = ['genre', 'channel', 'segment', 'plan', 'status', 'device'];

// Matched against whole field tokens (see poolForMember) so substrings never mislead —
// "stage" must not hit the age rule, "tracks.genre" must pick genre not track. Specific
// entities come before the generic person/name pool.
const POOL_KEYWORDS: [RegExp, string][] = [
  [/^artists?$/i, 'artist'],
  [/^albums?$/i, 'album'],
  [/^tracks?$|^songs?$|^titles?$/i, 'track'],
  [/^genres?$/i, 'genre'],
  [/^countr(y|ies)$|^nation$/i, 'country'],
  [/^cit(y|ies)$|^town$|^metro$/i, 'city'],
  [/^channels?$|^source$|^medium$|^utm$/i, 'channel'],
  [/^devices?$|^platform$|^browser$/i, 'device'],
  [/^age$/i, 'age_group'],
  [/^plan$|^tier$|^subscription$/i, 'plan'],
  [/^status$|^state$|^stage$/i, 'status'],
  [/^segments?$|^categor(y|ies)$|^type$|^group$|^cohort$/i, 'segment'],
  [/^customers?$|^users?$|^names?$|^person$|^member$|^account$/i, 'customer'],
];

// Pick the value pool for a requested category member.
function poolForMember(name: string, nativeType: string | undefined, index: number, manyRows: boolean): string[] {
  if (nativeType === 'boolean') return POOLS.boolean;
  // Match the field part only (drop any "cube." prefix), token by token, so a cube name
  // or an embedded substring can't hijack the choice.
  const field = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : name;
  const tokens = field.split(/[^a-z0-9]+/i).filter(Boolean);
  for (const [re, key] of POOL_KEYWORDS) {
    if (tokens.some((t) => re.test(t))) return POOLS[key];
  }
  const rotation = manyRows ? ENTITY_ROTATION : CATEGORY_ROTATION;
  return POOLS[rotation[index % rotation.length]];
}

// A single category chart (bar/pie/funnel) with no explicit limit shows this many stages.
const TOP_N_CATEGORIES = 8;

// ── Honor the request: filter → sort → page (mirrors SQL WHERE → ORDER BY → LIMIT/OFFSET) ──
// The rows generated below are realistic but unordered/unfiltered. A component whose state drives
// loadData(orderBy/filters/offset) only renders correctly if the mock applies those, so a sort
// toggle reorders, a committed filter narrows, and page 2 shows different rows. Deterministic and
// synchronous; NOT real aggregation/joins/GROUP-BY (use embeddable:dev for data correctness).

function memberName(property: unknown): string | undefined {
  if (property == null) return undefined;
  if (typeof property === 'string') return property;
  const p = property as any;
  if ('dimension' in p && !('__type__' in p)) return p.dimension?.name ?? p.dimension;
  return p.name;
}

// Numeric when the member says so, or when every provided sample parses as a finite number
// (measure values come through as strings, e.g. "120").
function isNumericProp(property: unknown, ...samples: unknown[]): boolean {
  if ((property as any)?.nativeType === 'number') return true;
  return samples.length > 0 && samples.every((s) => s !== '' && s != null && Number.isFinite(Number(s)));
}

function applyFilters(rows: Record<string, unknown>[], filters: any[]): Record<string, unknown>[] {
  if (!Array.isArray(filters) || filters.length === 0) return rows;
  return rows.filter((row) =>
    filters.every((f) => {
      const key = memberName(f?.property);
      // Can't resolve the member, or it isn't one of the selected columns → can't evaluate it
      // here; pass rather than wrongly empty the result (the mock only holds selected members).
      if (!key || !(key in row)) return true;
      const cell = row[key];
      const sCell = cell == null ? '' : String(cell);
      const has = cell != null && sCell !== '';
      const raw = f?.value;
      const values = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
      const sVals = values.map((v) => String(v));
      const numeric = isNumericProp(f?.property, cell, values[0]);
      switch (f?.operator) {
        case 'equals':
          return numeric ? values.some((v) => Number(cell) === Number(v)) : sVals.includes(sCell);
        case 'notEquals':
          return numeric ? values.every((v) => Number(cell) !== Number(v)) : !sVals.includes(sCell);
        case 'contains':
          return sVals.some((v) => sCell.toLowerCase().includes(v.toLowerCase()));
        case 'notContains':
          return !sVals.some((v) => sCell.toLowerCase().includes(v.toLowerCase()));
        case 'startsWith':
          return sVals.some((v) => sCell.toLowerCase().startsWith(v.toLowerCase()));
        case 'endsWith':
          return sVals.some((v) => sCell.toLowerCase().endsWith(v.toLowerCase()));
        case 'gt': return Number(cell) > Number(values[0]);
        case 'gte': return Number(cell) >= Number(values[0]);
        case 'lt': return Number(cell) < Number(values[0]);
        case 'lte': return Number(cell) <= Number(values[0]);
        case 'set':
        case 'notNull':
          return has;
        case 'notSet':
        case 'isNull':
          return !has;
        case 'inDateRange': {
          const from = Array.isArray(raw) ? raw[0] : raw?.from;
          const to = Array.isArray(raw) ? raw[1] : raw?.to;
          if (!from || !to || !has) return true; // relative/partial ranges → skip, don't drop
          return sCell >= String(from) && sCell <= String(to);
        }
        default:
          return true; // unknown operator → pass, never empty the result
      }
    }),
  );
}

function applySort(rows: Record<string, unknown>[], orderBy: any[]): Record<string, unknown>[] {
  if (!Array.isArray(orderBy) || orderBy.length === 0) return rows;
  const keys = orderBy
    .map((o) => ({ key: memberName(o?.property), dir: o?.direction === 'desc' ? -1 : 1, property: o?.property }))
    .filter((k): k is { key: string; dir: number; property: unknown } => !!k.key);
  if (keys.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const { key, dir, property } of keys) {
      const av = a[key];
      const bv = b[key];
      const cmp = isNumericProp(property, av, bv)
        ? Number(av) - Number(bv)
        : String(av ?? '').localeCompare(String(bv ?? ''));
      if (cmp !== 0) return cmp * dir;
    }
    return 0;
  });
}

function applyPaging(
  rows: Record<string, unknown>[],
  offset: number,
  limit: number | undefined,
): Record<string, unknown>[] {
  if (!offset && limit == null) return rows;
  return rows.slice(offset, limit != null ? offset + limit : undefined);
}

export function mockDataResponse(requestParams: any): DataResponse {
  // Collect select items — support both select[] and dimensions/measures arrays
  let selectItems: SelectItem[] = [];
  if (Array.isArray(requestParams.select)) {
    selectItems = requestParams.select as SelectItem[];
  } else {
    const dims: SelectItem[] = Array.isArray(requestParams.dimensions) ? requestParams.dimensions : [];
    const measures: SelectItem[] = Array.isArray(requestParams.measures) ? requestParams.measures : [];
    selectItems = [...dims, ...measures];
  }

  // Classify
  const timeDims = selectItems.filter((i) => classifyItem(i) === 'time');
  const measures = selectItems.filter((i) => classifyItem(i) === 'measure');
  const catDims = selectItems.filter((i) => classifyItem(i) === 'category');

  const limit = typeof requestParams.limit === 'number' && requestParams.limit > 0
    ? requestParams.limit
    : undefined;
  const orderBy = Array.isArray(requestParams.orderBy) ? requestParams.orderBy : [];
  const filters = Array.isArray(requestParams.filters) ? requestParams.filters : [];
  const offset =
    typeof requestParams.offset === 'number' && requestParams.offset > 0 ? requestParams.offset : 0;
  // When the request shapes the result (sort/filter/paging), generate the full set up to the pool
  // cap and let the post-stage below slice it — otherwise page 2 would re-slice the same rows.
  const shapingActive = offset > 0 || orderBy.length > 0 || filters.length > 0;
  const genLimit = shapingActive ? undefined : limit;

  let rows: Record<string, unknown>[];

  if (timeDims.length > 0) {
    // Time series anchored to the PRESENT and granularity-aware: the newest bucket is the
    // current (in-progress) period and we step back from there, so charts always show recent
    // dates. Count scales with granularity (90 days, 26 weeks, 18 months, …), capped sensibly.
    const timeKey = itemName(timeDims[0]);
    const g = granularityOf(timeDims[0]);
    const count = Math.min(genLimit ?? (GRANULARITY_DEFAULT_COUNT[g] ?? 90), GRANULARITY_CAP[g] ?? 180);
    const end = startOfPeriod(new Date(), g);

    rows = [];
    // Oldest → newest so the series reads left to right; the last row is the current period.
    for (let i = count - 1; i >= 0; i--) {
      const d = stepBack(end, g, i);
      const phase = count - 1 - i;
      const row: Record<string, unknown> = {
        [timeKey]: formatBucket(d, g),
      };
      measures.forEach((m, mi) => {
        const v = Math.max(0, Math.round(
          (mi + 1) * 20 + 8 * Math.sin(phase / 7 + mi) + 5 * Math.sin(phase / 3.3) + 3 * Math.cos(phase / 14)
        ));
        row[itemName(m)] = String(v);
      });
      catDims.forEach((c, ci) => {
        const vs = poolForMember(itemName(c), (c as any).nativeType, ci, false);
        row[itemName(c)] = vs[ci % vs.length];
      });
      rows.push(row);
    }
  } else if (catDims.length > 0) {
    // A limit, or more than one category dimension, signals a table/list that wants many
    // rows; a single category dimension is a chart axis (bar/pie/funnel) that wants a few
    // distinct stages. Either way we SAMPLE distinct values from a realistic pool — we
    // never cycle a short list back round with a "Germany 2" suffix.
    const manyRows = limit != null || catDims.length > 1;
    const dimPools = catDims.map((c, i) =>
      poolForMember(itemName(c), (c as any).nativeType, i, manyRows),
    );

    if (measures.length === 0) {
      // Pure value list (a filter control loading a dimension's distinct values): return
      // exactly the distinct set so "is one of" dropdowns show real options.
      const count = Math.min(genLimit ?? dimPools[0].length, dimPools[0].length);
      rows = [];
      for (let i = 0; i < count; i++) {
        const row: Record<string, unknown> = {};
        catDims.forEach((c, di) => { row[itemName(c)] = dimPools[di][i % dimPools[di].length]; });
        rows.push(row);
      }
    } else {
      // Table or category chart. The largest pool is the "primary" key: it walks its values
      // in order (one distinct row each) and bounds the row count, so rows never repeat or
      // get suffixed. Secondary dimensions vary independently — repeats across rows are fine
      // and realistic (many tracks share a genre); we just never invent new labels.
      const primaryIdx = dimPools.reduce((b, p, i) => (p.length > dimPools[b].length ? i : b), 0);
      const primaryLen = dimPools[primaryIdx].length;
      const target = genLimit ?? (manyRows ? 30 : Math.min(primaryLen, TOP_N_CATEGORIES));
      const count = Math.min(target, primaryLen);
      rows = [];
      for (let i = 0; i < count; i++) {
        const row: Record<string, unknown> = {};
        catDims.forEach((c, di) => {
          const vs = dimPools[di];
          const vi = di === primaryIdx ? i : (i * (di + 2) + di) % vs.length;
          row[itemName(c)] = vs[vi];
        });
        measures.forEach((m, mi) => {
          // Clearly descending so funnels/bars step down, with mild per-measure variation.
          const falloff = 1 - 0.6 * (i / Math.max(1, count - 1));
          row[itemName(m)] = String(
            Math.max(3, Math.round((1000 / (mi + 1)) * falloff + 30 * Math.sin(i / 4 + mi))),
          );
        });
        rows.push(row);
      }
    }
  } else {
    // Measures only: single row
    const row: Record<string, unknown> = {};
    measures.forEach((m) => { row[itemName(m)] = '78'; });
    rows = [row];
  }

  // Honor the request shape: filter → sort → page (see helpers above). A no-op when there are no
  // filters/orderBy/offset and the limit was already applied during generation.
  rows = applyPaging(applySort(applyFilters(rows, filters), orderBy), offset, limit);

  return { isLoading: false, error: undefined, data: rows };
}

// ─── 3. Resolve loadData sentinels in a props object ─────────────────────────

export function resolveLoadData(props: Record<string, unknown>): Record<string, unknown> {
  const out = { ...props };
  for (const key of Object.keys(out)) {
    if (isLoadDataSentinel(out[key])) {
      out[key] = mockDataResponse((out[key] as any).requestParams);
    }
  }
  return out;
}

// ─── 4. Input builder ─────────────────────────────────────────────────────────

/** Input types that are "data" (cannot be user-edited; need auto-mock) */
const DATA_TYPES = new Set([
  'dataset',
  'dimension',
  'measure',
  'dimensionOrMeasure',
  'dimensionSimple',
  'dimensionTime',
  'dimensionWithGranularitySelectField',
  'dimensionWithDateBounds',
  'dimensions',
  'dimensionsAndMeasures',
  'measures',
  'xMeasure',
  'yMeasure',
]);

/** Whether an input type string is a data input */
export function isDataInputType(type: string): boolean {
  return DATA_TYPES.has(type);
}

function mockDatasetValue() {
  return { embeddableId: '', datasetId: '', name: 'mock_dataset', variableValues: {} };
}

function mockMeasureValue(name = 'mock.count') {
  return {
    name,
    nativeType: 'number' as const,
    __type__: 'measure' as const,
    inputs: {},
    title: 'Count',
    modelTitle: 'Count',
    description: '',
  };
}

function mockTimeDimensionValue(name = 'mock.day') {
  return {
    name,
    nativeType: 'time' as const,
    __type__: 'dimension' as const,
    // showGranularityDropdown: true enables the ChartGranularitySelectField to render.
    // In real Embeddable this is set by the builder when the user enables the granularity toggle.
    inputs: { granularity: 'day', showGranularityDropdown: true },
    title: 'Day',
    modelTitle: 'Day',
    description: '',
  };
}

function mockField(
  name: string,
  title: string,
  nativeType: 'string' | 'number' | 'boolean',
  type: 'dimension' | 'measure',
) {
  return { name, nativeType, __type__: type, inputs: {}, title, modelTitle: title, description: '' };
}

/** Varied member set for filter builders / dimensionOrMeasure pickers. */
function mockFilterFields() {
  return [
    mockField('mock.country', 'Country', 'string', 'dimension'),
    mockField('mock.genre', 'Genre', 'string', 'dimension'),
    mockField('mock.age_group', 'Age group', 'string', 'dimension'),
    mockField('mock.is_active', 'Is active', 'boolean', 'dimension'),
    mockField('mock.plays', 'Plays', 'number', 'measure'),
  ];
}

function mockCategoryDimensionValue(name = 'mock.category') {
  return {
    name,
    nativeType: 'string' as const,
    __type__: 'dimension' as const,
    inputs: {},
    title: 'Category',
    modelTitle: 'Category',
    description: '',
  };
}

/** Decide if a dimension input should be mocked as a time dimension */
function isTimeDimension(input: { name: string; type: string; config?: any; inputs?: any }): boolean {
  // Explicit supportedTypes check on the input config
  if (input.config?.supportedTypes?.includes?.('time')) return true;
  // Type string explicitly marks time
  if (/time/i.test(input.type)) return true;
  // Used as a granularity-select field (has a GranularitySelectField component pairing)
  if (input.type === 'dimensionWithGranularitySelectField') return true;
  // Sub-inputs array contains a granularity item (dimensionWithGranularitySelectField pattern)
  // input.inputs is the array of sub-inputs defined on the meta input object
  if (Array.isArray(input.inputs) && input.inputs.some((sub: any) => sub?.name === 'granularity')) {
    return true;
  }
  // Name pattern
  if (/date|day|time|month|week|created|timestamp/i.test(input.name)) return true;
  return false;
}

type InputDef = {
  name: string;
  type: string | { toString(): string };
  defaultValue?: unknown;
  array?: boolean;
  config?: any;
  inputs?: any[];
};

/**
 * Build the inputs object to pass as the first arg to config.props().
 *
 * - Data inputs (dataset/dimension/measure/…) → auto-mocked objects
 * - Non-data inputs → controlValues[name] ?? defaultValue ?? (array ? [] : null)
 */
export function buildInputs(
  meta: { inputs: readonly InputDef[] },
  controlValues: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const input of meta.inputs) {
    const typeStr = typeof input.type === 'string' ? input.type : (input.type?.toString?.() ?? 'string');
    const name = input.name;

    if (isDataInputType(typeStr)) {
      // Auto-mock
      let mock: unknown;
      if (typeStr === 'dataset') {
        mock = mockDatasetValue();
      } else if (typeStr === 'measure' || typeStr === 'xMeasure' || typeStr === 'yMeasure') {
        mock = mockMeasureValue(`mock.${name}`);
      } else if (typeStr === 'measures') {
        mock = [mockMeasureValue(`mock.${name}`)];
      } else if (typeStr === 'dimensionsAndMeasures') {
        // A realistic mix of fields so filter/picker components have something to choose from.
        mock = mockFilterFields();
      } else if (typeStr === 'dimension' || typeStr === 'dimensionSimple' || typeStr === 'dimensionWithDateBounds') {
        if (isTimeDimension({ name, type: typeStr, config: input.config, inputs: input.inputs })) {
          mock = mockTimeDimensionValue(`mock.${name}`);
        } else {
          mock = mockCategoryDimensionValue(`mock.${name}`);
        }
      } else if (typeStr === 'dimensionTime') {
        mock = mockTimeDimensionValue(`mock.${name}`);
      } else if (typeStr === 'dimensionWithGranularitySelectField') {
        // This is the time-dimension type used by granularity selectors
        mock = mockTimeDimensionValue(`mock.${name}`);
      } else if (typeStr === 'dimensionOrMeasure') {
        // An array dimensionOrMeasure (e.g. a filter builder's members) gets a realistic mix
        // of dimensions + measures; a single one stays a lone measure.
        mock = input.array ? mockFilterFields() : mockMeasureValue(`mock.${name}`);
      } else if (typeStr === 'dimensions') {
        if (isTimeDimension({ name, type: typeStr, config: input.config, inputs: input.inputs })) {
          mock = [mockTimeDimensionValue(`mock.${name}`)];
        } else {
          mock = [mockCategoryDimensionValue(`mock.${name}`)];
        }
      } else {
        mock = null;
      }

      // Wrap in array if input.array and mock isn't already
      if (input.array && !Array.isArray(mock)) {
        mock = mock !== null ? [mock] : [];
      }
      out[name] = mock;
    } else {
      // User-editable: prefer controlValues, then defaultValue, then sensible fallback
      if (controlValues[name] !== undefined) {
        out[name] = controlValues[name];
      } else if (input.defaultValue !== undefined) {
        out[name] = input.defaultValue;
      } else if (input.array) {
        out[name] = [];
      } else {
        out[name] = null;
      }
    }
  }

  return out;
}
