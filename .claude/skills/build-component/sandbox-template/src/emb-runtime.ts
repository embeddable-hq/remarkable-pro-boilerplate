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

// Distinct-value sets keyed by mock dimension name — drive the filter builder's value dropdowns.
const DEFAULT_VALUE_SET = ['United States', 'Germany', 'United Kingdom', 'France', 'Spain', 'Italy'];
const MOCK_VALUE_SETS: Record<string, string[]> = {
  'mock.country': DEFAULT_VALUE_SET,
  'mock.genre': ['Pop', 'Rock', 'Hip-Hop', 'Jazz', 'Classical', 'Electronic'],
  'mock.age_group': ['18-24', '25-34', '35-44', '45-54', '55+'],
  'mock.is_active': ['true', 'false'],
};

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

  let rows: Record<string, unknown>[];

  if (timeDims.length > 0) {
    // Time series anchored to the PRESENT and granularity-aware: the newest bucket is the
    // current (in-progress) period and we step back from there, so charts always show recent
    // dates. Count scales with granularity (90 days, 26 weeks, 18 months, …), capped sensibly.
    const timeKey = itemName(timeDims[0]);
    const g = granularityOf(timeDims[0]);
    const count = Math.min(limit ?? (GRANULARITY_DEFAULT_COUNT[g] ?? 90), GRANULARITY_CAP[g] ?? 180);
    const end = startOfPeriod(new Date(), g);
    const catLabels = ['Alpha', 'Beta', 'Gamma'];

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
        row[itemName(c)] = catLabels[ci % catLabels.length];
      });
      rows.push(row);
    }
  } else if (catDims.length > 0) {
    const valuesFor = (name: string): string[] => MOCK_VALUE_SETS[name] ?? DEFAULT_VALUE_SET;
    if (measures.length === 0) {
      // Pure value list (e.g. a filter control loading a dimension's distinct values):
      // return exactly the distinct set so "is one of" dropdowns show real options.
      const maxLen = Math.max(1, ...catDims.map((c) => valuesFor(itemName(c)).length));
      const count = limit ? Math.min(limit, maxLen) : maxLen;
      rows = [];
      for (let i = 0; i < count; i++) {
        const row: Record<string, unknown> = {};
        catDims.forEach((c) => {
          const vs = valuesFor(itemName(c));
          row[itemName(c)] = vs[i % vs.length];
        });
        rows.push(row);
      }
    } else {
      // Dimensions + measures (a table or category chart): generate plenty of rows so the
      // component has real data to lay out and scroll. Repeats are suffixed so rows stay
      // distinct even when a value set is smaller than the row count.
      const count = limit ? Math.min(limit, 60) : 30;
      rows = [];
      for (let i = 0; i < count; i++) {
        const row: Record<string, unknown> = {};
        catDims.forEach((c) => {
          const vs = valuesFor(itemName(c));
          const label = vs[i % vs.length];
          row[itemName(c)] = i >= vs.length ? `${label} ${Math.floor(i / vs.length) + 1}` : label;
        });
        measures.forEach((m, mi) => {
          row[itemName(m)] = String(Math.max(3, Math.round((1000 - i * 17) / (mi + 1) + 40 * Math.sin(i / 5 + mi))));
        });
        rows.push(row);
      }
    }
  } else {
    // Measures only: single row
    const row: Record<string, unknown> = {};
    measures.forEach((m) => { row[itemName(m)] = '78'; });
    rows = [row];
    if (limit) rows = rows.slice(0, limit);
  }

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
