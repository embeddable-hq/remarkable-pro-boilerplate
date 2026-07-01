/**
 * Mock data for the sandbox.
 *
 * Shapes match exactly what the real runtime provides:
 * - Dimension: { name, nativeType, __type__: 'dimension', inputs, title, modelTitle, description }
 * - Measure:   { name, nativeType, __type__: 'measure',   inputs, title, modelTitle, description }
 * - DataResponse: { isLoading: false, error: undefined, data: Array<Record<string, unknown>> }
 * Numeric values are strings (mimic the cloud) except where the preview data uses numbers —
 * CalendarHeatmap values are kept as numbers since the component does Number(row[...]).
 */

import type { DataResponse } from '@embeddable.com/core';

// ─── Dimension & Measure objects ───────────────────────────────────────────

export const mockCategoryDimension = {
  name: 'orders.country',
  nativeType: 'string' as const,
  __type__: 'dimension' as const,
  inputs: {},
  title: 'Country',
  modelTitle: 'Country',
  description: '',
};

export const mockTimeDimension = {
  name: 'events.day',
  nativeType: 'time' as const,
  __type__: 'dimension' as const,
  inputs: { granularity: 'day' },
  title: 'Day',
  modelTitle: 'Day',
  description: '',
};

export const mockMeasure = {
  name: 'orders.count',
  nativeType: 'number' as const,
  __type__: 'measure' as const,
  inputs: {},
  title: 'Count',
  modelTitle: 'Count',
  description: '',
};

// ─── DataResponse shapes ────────────────────────────────────────────────────

/** 1 measure, 1 category dimension — funnel / bar etc. */
export const mockResults1Measure1Dimension: DataResponse = {
  isLoading: false,
  error: undefined,
  data: [
    { 'orders.country': 'US',  'orders.count': '120' },
    { 'orders.country': 'GER', 'orders.count': '100' },
    { 'orders.country': 'UK',  'orders.count': '80' },
    { 'orders.country': 'FRA', 'orders.count': '70' },
    { 'orders.country': 'SPA', 'orders.count': '55' },
  ],
};

/** 1 measure only — gauge / KPI */
export const mockResults1Measure: DataResponse = {
  isLoading: false,
  error: undefined,
  data: [{ 'orders.count': '78' }],
};

// ─── Calendar-specific dimension & measure ────────────────────────────────
// Use names that match the data row keys so row[dim.name] / row[measure.name] resolve.

export const mockCalendarTimeDimension = {
  name: 'events.day',
  nativeType: 'time' as const,
  __type__: 'dimension' as const,
  inputs: { granularity: 'day' },
  title: 'Day',
  modelTitle: 'Day',
  description: '',
};

export const mockCalendarMeasure = {
  name: 'events.count',
  nativeType: 'number' as const,
  __type__: 'measure' as const,
  inputs: {},
  title: 'Count',
  modelTitle: 'Count',
  description: '',
};

/** Calendar heatmap: time dimension + measure */
function generateDailyRows(count = 70): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const start = new Date('2024-01-01T00:00:00Z');
  for (let i = 0; i < count; i++) {
    const d = new Date(start.getTime() + i * 86_400_000);
    const iso = d.toISOString().slice(0, 10);
    const value = Math.max(0, Math.round(
      10 + 8 * Math.sin(i / 7) + 5 * Math.sin(i / 3.3) + 3 * Math.cos(i / 14)
    ));
    rows.push({ 'events.day': iso, 'events.count': value });
  }
  return rows;
}

export const mockCalendarResults: DataResponse = {
  isLoading: false,
  error: undefined,
  data: generateDailyRows(70),
};
