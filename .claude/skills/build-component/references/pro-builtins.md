# Pro built-ins — the mandatory reuse layer
Everything here imports from `@embeddable.com/remarkable-pro` (verified against `dist/index.d.ts`). Wiring these in is what gives a custom component i18n, locale/timezone-aware formatting, consistent colors, gap-filled series, and standard chrome — for free. Skipping them is the #1 failure mode.
## The render-time opening sequence (every chart/control)
```tsx
const theme = useTheme() as Theme;          // from @embeddable.com/react
i18nSetup(theme);                            // init i18n once (idempotent)
const { title, description, tooltip } = resolveI18nProps(props);  // bulk-translate string props
const f = getThemeFormatter(theme);          // formatter for all values
```
## Quick reference
| Built-in | Import from `@embeddable.com/remarkable-pro` | Use it for |
|---|---|---|
| `i18nSetup`, `i18n` | `{ i18nSetup, i18n }` | `i18nSetup(theme)` at top of render; `i18n.t('charts.emptyTitle')` for static strings |
| `resolveI18nProps` | `{ resolveI18nProps }` | Translate `title`/`description`/`tooltip`/labels in one call; supports `"key|Fallback"` |
| `getThemeFormatter` | `{ getThemeFormatter }` | `.data(dimOrMeasure, value)`, `.number`, `.dateTime`, `.dimensionOrMeasureTitle` — never hand-format |
| `useFillGaps` | `{ useFillGaps }` | Fill missing time buckets before rendering any time-series chart |
| `getDimensionMeasureColor` | `{ getDimensionMeasureColor }` | Stable per-value / per-measure chart colors honoring theme maps |
| `ChartCard`, `asChartCardHeaderProps` | `{ ChartCard, asChartCardHeaderProps }` | Outer wrapper for charts: header, loading, error, empty, export menu |
| `EditorCard` | `{ EditorCard }` | Outer wrapper for controls/editors |
| `inputs`, `subInputs` | `{ inputs }` / `{ subInputs }` | Compose `meta.inputs` by spreading shared definitions |
| time utils | `{ getDimensionWithGranularity, getTimeRangeFromDimensionValue, getClientContextTimezone }` | Apply granularity, build event time ranges, resolve timezone |
| comparison | `{ defaultComparisonPeriodOptions, ComparisonPeriodType }` | Period-over-period: derive the comparison `TimeRange` via the chosen option's `getRange(primaryRange)`; reuse Pro's comparison-period custom type instead of defining your own. See [data-loading.md](data-loading.md) |
## `useFillGaps` — time-series only
Signature: `useFillGaps({ results, dimension, orderDirection?, externalDateBounds? }): DataResponse`. It is a **hook**, called in the React component (not the descriptor). It **no-ops unless** the dimension is `nativeType: 'time'` **with a known granularity** (read from `dimension.inputs.granularity`). It synthesizes empty buckets across the date range and returns a new `DataResponse`. Always feed the **filled** result to both `ChartCard` and your data transform.
Real call site — `LineChartDefaultPro/index.tsx`:
```tsx
const results = useFillGaps({ results: props.results, dimension: xAxis });
const data = getLineChartProData({ data: results.data, dimension: xAxis, measures, ... }, theme);
// ...
<ChartCard data={results} dimensionsAndMeasures={[...measures, xAxis]} errorMessage={results.error} ...>
```
## `getThemeFormatter`
`.data(dimensionOrMeasure, value)` applies prefix/suffix/currency/decimals/abbreviation/truncation/null-handling driven by the dimension/measure sub-inputs. Use it for axis labels, option labels, KPI values — everything.
- `SingleSelectFieldPro/index.tsx`: `label: themeFormatter.data(dimension, data[dimension.name])`
- `KpiChartNumberPro/index.tsx`: `const valueFormatter = (v: number) => themeFormatter.data(measure, v);` then passed to the `KpiChart` primitive.
## i18n
Pattern (every component): `i18nSetup(theme)` once, `resolveI18nProps(props)` for string props, `i18n.t(key)` for static copy. `MarkdownPro` even resolves i18n *inside* the markdown content. Keys seen in use: `charts.errorTitle`, `charts.emptyTitle`, `charts.emptyMessage`, `editors.errorTitle`, `common.noOptionsFound`, `common.other`.
## Colour — value colours vs chrome colours
Classify every colour first; the two kinds come from different places.

**Value colours** — a colour that stands for a *data value* (a dimension value, or a measure/series). These MUST come from the **theme palette**, never from CSS tokens, so the same value is coloured consistently across the whole dashboard and respects the consumer's `theme.charts.backgroundColors` (palette) and `theme.charts.backgroundColorMap` (specific value → colour). Use `getChartColors()` (from `@embeddable.com/remarkable-ui`) for the palette and `getDimensionMeasureColor(...)` (from `@embeddable.com/remarkable-pro`) to resolve each value:
```tsx
const chartColors = getChartColors();
const color =
  getDimensionMeasureColor({
    dimensionOrMeasure: dimension,                       // or the measure
    theme,
    color: 'background',                                 // or 'border'
    value: `${dimension.name}.${row[dimension.name]}`,   // for a measure, use `measure.name`
    chartColors,
    index,
  }) || chartColors[index % chartColors.length];
```
Built-in resolution order: per-value `inputs.color` override → `theme.charts.backgroundColorMap[dimensionValue|measure][value]` → palette by index (stable per value). Charts built on the Chart.js primitives get this for free via the Pro data builders (`getPieChartProData`, `getBarChartProData`, …); hand-rolled charts call the two helpers themselves (mirror `pies.utils.ts`). **Never use `--em-sem-chart-color--N` for value colours.** (`getColor` returns `''` when there is no `window` — i.e. at build time — so keep the `|| chartColors[...]` fallback; it resolves real colours at render time.)

**Chrome colours** — text, borders, surfaces, control accents, gauge tracks, status. These use the **component-token → base-token fallback chain**: `var(--em-mycomp-x, var(--em-sem-…, #hex))` — see [theming.md](theming.md). Use exact base-token names (there is no `--em-sem-border`, `--em-sem-text--inverse`, or `--em-sem-status-warning`) and always keep the literal fallback.
## Card wrappers
- `ChartCard`: props `{ children, data: DataResponse, errorMessage?, dimensionsAndMeasures?, onCustomDownload?, ...header }`. Spread header props with `asChartCardHeaderProps(props)` **if your installed version exports it** — otherwise pass `title`/`description`/`tooltip`/`hideMenu` directly (the examples in this skill do this; see [discovery-and-validation.md](discovery-and-validation.md)). Handles loading skeleton, error, empty, and the export menu automatically.
- `EditorCard`: props `{ children, errorMessage?, title?, description?, tooltip? }`.
## Shared `inputs` / `subInputs`
Compose `meta.inputs` by spreading and overriding — don't write input objects by hand. Common keys: `dataset`, `dimension`, `dimensions`, `dimensionWithGranularitySelectField`, `measure`, `measures`, `dimensionOrMeasure`, `dimensionsAndMeasures`, `title`, `description`, `tooltip`, `placeholder`, `string`, `number`, `boolean`, `showLegend`, `showTooltips`, `showValueLabels`, `maxLegendItems`, `maxResults`, `menuOptions`, `displayNullAs`, `filters`. Override pattern (from `LineChartDefaultPro`):
```ts
{ ...inputs.dimensionWithGranularitySelectField, label: 'X-axis', name: 'xAxis' },
{ ...inputs.measures, inputs: [ ...inputs.measures.inputs,
  { ...subInputs.boolean, name: 'dashedLine', label: 'Dashed line', defaultValue: false } ] },
```
Sub-inputs (attach to dimension/measure inputs) drive the formatter automatically: `prefix`, `suffix`, `currency`, `decimalPlaces`, `abbreviateLargeNumber`, `maxCharacters`, `granularity`, `dateBounds`, `color`, `displayFormat`.
