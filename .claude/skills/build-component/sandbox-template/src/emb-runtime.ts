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
    // Time series: ~70 daily rows
    const timeKey = itemName(timeDims[0]);
    const count = limit ? Math.min(limit, 70) : 70;
    const start = new Date('2024-01-01T00:00:00Z');
    const catLabels = ['Alpha', 'Beta', 'Gamma'];

    rows = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(start.getTime() + i * 86_400_000);
      const row: Record<string, unknown> = {
        [timeKey]: d.toISOString().slice(0, 10),
      };
      measures.forEach((m, mi) => {
        const v = Math.max(0, Math.round(
          (mi + 1) * 20 + 8 * Math.sin(i / 7 + mi) + 5 * Math.sin(i / 3.3) + 3 * Math.cos(i / 14)
        ));
        row[itemName(m)] = String(v);
      });
      catDims.forEach((c, ci) => {
        row[itemName(c)] = catLabels[ci % catLabels.length];
      });
      rows.push(row);
    }
  } else if (catDims.length > 0) {
    // Category rows: ~6
    const countries = ['United States', 'Germany', 'United Kingdom', 'France', 'Spain', 'Italy'];
    const count = limit ? Math.min(limit, countries.length) : countries.length;
    rows = [];
    for (let i = 0; i < count; i++) {
      const row: Record<string, unknown> = {};
      catDims.forEach((c, ci) => {
        row[itemName(c)] = countries[(i + ci) % countries.length];
      });
      const baseValues = [120, 100, 80, 70, 55, 40];
      measures.forEach((m, mi) => {
        row[itemName(m)] = String(Math.max(5, (baseValues[i] ?? 30) - mi * 10));
      });
      rows.push(row);
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
      } else if (typeStr === 'measures' || typeStr === 'dimensionsAndMeasures') {
        mock = [mockMeasureValue(`mock.${name}`)];
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
        mock = mockMeasureValue(`mock.${name}`);
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
