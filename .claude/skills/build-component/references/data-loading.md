# Data loading — `loadData`
`loadData` runs **in the descriptor's `props`**, never in the React component. It returns a `DataResponse` you pass down as a prop. The React side only reads `results.data` / `results.isLoading` / `results.error` (and usually hands the whole thing to `ChartCard`, which renders loading/error/empty for you).
## Signature
```ts
import { loadData } from '@embeddable.com/core';
const results = loadData({
  from: inputs.dataset,                  // Dataset (required)
  select: [inputs.measure, inputs.dimension], // (Dimension | Measure | TimeDimension)[] — at least one
  filters: [ /* QueryFilter[] */ ],      // optional, AND-combined
  orderBy: [{ property: inputs.measure, direction: 'desc' }], // optional
  limit: inputs.maxResults,              // optional (default 100)
  offset: 0,                             // optional (pagination)
  timezone: clientContext?.timezone,     // optional; pass for time dimensions
  countRows: false,                      // optional; returns `total` (slow on big data)
});
```
Conceptually builds: `SELECT <select> FROM <dataset> WHERE <dim filters> GROUP BY <dims/timeDims> HAVING <measure filters> ORDER BY <orderBy> LIMIT/OFFSET`.
## `select` items
- **Dimension / Measure** — pass the input directly: `select: [inputs.measure, inputs.dimension]`.
- **Time dimension with granularity** — `getDimensionWithGranularity(inputs.xAxis, state?.granularity)` returns a dimension whose `inputs.granularity` is set; pass that in `select`. (This is also what `useFillGaps` keys off — see [pro-builtins.md](pro-builtins.md).)
## Result shape
```ts
{ isLoading: boolean; error?: string; data?: Array<Record<string, unknown>>; total?: number }
```
Rows are keyed by **qualified member name**: `row[measure.name]`, `row[dimension.name]` (e.g. `row['orders.count']`). Values come back as strings/numbers — coerce when needed.
## Filter operators
General: `equals`, `notEquals`, `contains`, `notContains`, `startsWith`, `endsWith`, `gt`, `gte`, `lt`, `lte`, `set`, `notSet`.
Time (on `time` members): `inDateRange` (`{ from, to }` or `{ relativeTimeString }`), `notInDateRange`, `beforeDate`, `afterDate`.
A filter is `{ property: Dimension | Measure, operator, value }`. Real example — search-as-you-type from `SingleSelectFieldPro`:
```ts
filters: state?.searchValue
  ? [{ operator: inputs.dimension.nativeType === 'string' ? 'contains' : 'equals',
       property: inputs.dimension, value: state.searchValue }]
  : undefined,
```
## Reactive loads via Embeddable State
`loadData` re-runs whenever `props` re-runs, and `props` re-runs when `setState` is called. So make the query depend on state:
- **Pagination** — `offset: (state?.page ?? 0) * pageSize`, `limit: pageSize`.
- **Granularity** — `getDimensionWithGranularity(inputs.xAxis, state?.granularity)`.
- **Search** — a `filters` entry built from `state.searchValue` (above).
None of these emit an event — they only change what this component shows. See [events-and-state.md](events-and-state.md).
## Multiple loads in one component
`props` can return several `DataResponse`s. Patterns from real Pro components:
- **Table** (`TableChartPaginated`): one load for the page, one with `countRows: true` for the total, one unpaginated for download.
- **Cascading** (`FilterBuilderPro`): one `loadData` **per draft filter row**, each selecting that row's dimension, optionally filtered by the other rows' committed values — built by reducing over `state.filters` into keyed results (`filterResults0`, `filterResults1`, …).
```ts
const props = (inputs, [state, setState]) => ({
  ...inputs,
  results:      loadData({ from: inputs.dataset, select: inputs.columns, limit, offset: page * limit }),
  countResults: loadData({ from: inputs.dataset, select: inputs.columns, countRows: true }),
});
```
## Comparison / period-over-period (the "compare this period vs last" pattern)
**First check you actually need a custom component** — `KpiChartNumberComparisonPro`, `LineChartComparisonDefaultPro`, and `LineChartComparisonWithKpiTabsPro` already do this (see the decision tree in [SKILL.md](../SKILL.md)). Build custom only for a genuinely novel comparison visualization.

The mechanic, distilled from those Pro components: **two loads over two date windows**. The comparison window is *derived* from the primary window by a comparison-period option. The pieces ship with Pro — don't reinvent them:
- `inputs.comparisonPeriod` — a shared input of the `comparisonPeriod` custom type (Pro's `ComparisonPeriodType`); the resolved prop value is the option's `value` **string** (e.g. `'previousPeriod'`). Don't define your own custom type.
- `inputs.timeRange` — spread and rename to `primaryDateRange` for the current window.
- `defaultComparisonPeriodOptions` (exported from `@embeddable.com/remarkable-pro`) — each option is `{ value, label, dateFormat, getRange(primaryRange) => TimeRange | undefined }`. Find the chosen option by `value`, call its `getRange` to get the comparison `TimeRange`.

```ts
import { loadData } from '@embeddable.com/core';
import { defaultComparisonPeriodOptions } from '@embeddable.com/remarkable-pro';

const props = (inputs: Inputs<typeof meta>, [state, setState], clientContext) => {
  const option = defaultComparisonPeriodOptions.find((o) => o.value === inputs.comparisonPeriod);
  const comparisonDateRange = option?.getRange(inputs.primaryDateRange);

  // Apply each window as an inDateRange filter on the time property:
  const windowFilter = (range?: { from: string; to: string }) =>
    range ? [{ property: inputs.timeProperty, operator: 'inDateRange', value: range }] : undefined;

  const baseSelect = [inputs.measure, inputs.timeProperty];
  return {
    ...inputs,
    comparisonDateRange,
    results: loadData({
      from: inputs.dataset, select: baseSelect,
      filters: windowFilter(inputs.primaryDateRange), timezone: clientContext?.timezone,
    }),
    // Second load only when a comparison window exists ("no comparison" → undefined):
    resultsComparison: comparisonDateRange
      ? loadData({
          from: inputs.dataset, select: baseSelect,
          filters: windowFilter(comparisonDateRange), timezone: clientContext?.timezone,
        })
      : undefined,
  };
};
```
The React side reads `results` and `resultsComparison` and renders the delta / overlay. Pro's own components hold `comparisonDateRange` in Embeddable state (`setComparisonDateRange`) so the comparison axis and the select-field can read it; deriving it inline from `inputs` as above is equivalent and simpler for a custom component — promote it to state only if another part of the component needs to read or set it. The dashboard wires a date-range picker into `primaryDateRange` and a `ComparisonPeriodSelectFieldPro` into `comparisonPeriod`; both are normal variables (see [events-and-state.md](events-and-state.md)).
## Timezone
Time dimensions are UTC internally and localized for display. Pass `timezone: clientContext?.timezone` (the 3rd `props` arg supplies `clientContext`) so buckets land in the viewer's zone. Pro's own charts route this through a timezone helper; reading `clientContext?.timezone` directly is equivalent for a custom component.
