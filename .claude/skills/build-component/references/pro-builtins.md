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
## Charts: the whole `options` object is a theming surface
A chart's `options` is **not** a place for literals. Every styling key — legend, tooltip, datalabels, axis ticks, grid lines, axis titles, fonts — plus series colours and value formatting is sourced from the theme, so the chart **matches the rest of the suite and tracks dark mode**. The library proves the rule: every chart util returns `mergician(getChartjs[Axis]Options(), …type-specifics)`, and that base reads **every** value from a `--em-chart-*` token via `getStyle` (literals appear only as fallbacks) — see `remarkable-ui` `chartjs.constants.ts` + `bars.utils.ts`/`lines.utils.ts`/`scatter.utils.ts`/`pies.utils.ts`.

**On Chart.js (a `remarkable-ui` primitive, or a raw Chart.js chart) — compose, don't hand-write.** Deep-merge three layers, exactly as the library does:
1. **Themed base** — `getChartjsAxisOptions()` (cartesian), or the base baked into `get<Type>ChartOptions(...)` for a pie/polar/doughnut-family chart. Carries the legend/tooltip/datalabels/axis chrome (all `--em-chart-*`). *(Exported from `@embeddable.com/remarkable-ui`: `get<Type>ChartOptions`, `getChartjsAxisOptions`, the `getChartjsAxisOptionsScales*` helpers. The bare `getChartjsOptions()` is **not** exported — reach the non-axis base through the nearest `get<Type>ChartOptions`, e.g. `getPieChartOptions` for a polar chart.)*
2. **Type options** — `get<Type>ChartOptions({ showLegend, showTooltips, showValueLabels, … })`: type specifics + display toggles. Its datalabels is `display: 'auto'`, which **auto-hides colliding labels** — don't override it with `display: true`.
3. **Pro overlay** — `get<Type>ChartProOptions({ measure, dimension }, theme)`: the value-formatting layer only (legend `generateLabels`, tooltip `callbacks`, datalabel `formatter`).

**The Pro `*Pro*Options` builders are PARTIAL overlays — merge them ONTO the base, never use them alone.** Standalone they carry no chrome, so the legend reverts to Chart.js defaults (wrong markers/font, dark text that ignores dark mode) and the tooltip loses its themed styling. Deep-merge the nested keys so the overlay *adds to* the base rather than replacing it:
```ts
const ui  = getPieChartOptions({ showLegend, showTooltips, showValueLabels });   // themed base + toggles
const pro = getPieChartProOptions({ measure, dimension }, theme);                // value-format overlay
const options = {
  ...ui,
  plugins: {
    ...ui.plugins, ...pro.plugins,
    legend:  { ...ui.plugins?.legend,  ...pro.plugins?.legend,
               labels:    { ...ui.plugins?.legend?.labels,     ...pro.plugins?.legend?.labels } },
    tooltip: { ...ui.plugins?.tooltip, ...pro.plugins?.tooltip,
               callbacks: { ...ui.plugins?.tooltip?.callbacks, ...pro.plugins?.tooltip?.callbacks } },
    datalabels: { ...ui.plugins?.datalabels, ...pro.plugins?.datalabels },
  },
};
```

**Two Chart.js legend gotchas when you reuse a Pro `generateLabels`** (that's how `get<Type>ChartProOptions` formats legend text). Pro's `generateLabels` returns `{ text, fillStyle, strokeStyle, lineWidth, index }` — mind what's missing and where the marker comes from:
- **Legend text colour comes from `legendItem.fontColor`, with NO fallback to `labels.color`.** Chart.js draws each label as `ctx.fillStyle = legendItem.fontColor` (verified in the installed `chart.js` source — there is no `|| labels.color`). The *built-in* `generateLabels` sets `fontColor` from `labels.color`; Pro's **omits it**, so the text colour is `undefined`, the canvas keeps the previous fill (the marker colour), and the legend text **does not track dark mode**. Wrap the merged `generateLabels` to inject the themed colour:
  ```ts
  const labelColor = getStyle('--em-chart-category-color');   // themed → tracks dark mode
  const gen = options.plugins!.legend!.labels!.generateLabels!;
  options.plugins!.legend!.labels!.generateLabels = (chart) =>
    gen(chart).map((item) => ({ ...item, fontColor: labelColor }));
  ```
- **Legend markers come from the *dataset* style** (`meta.controller.getStyle(i)` → your dataset's `backgroundColor`/`borderColor`). Restyle the dataset — e.g. translucent fills via `getColorWithOpacity` — and the legend swatches inherit it, **diverging from the suite's solid swatches**. Keep dataset fills consistent, or override `fillStyle`/`strokeStyle` in that same wrapper.

(Both gaps live in the shipped `getPieChartProOptions`/`getDonutChartProOptions` `generateLabels`, so `remarkable-ui`'s own pie/donut **legend text doesn't theme either** — prefer the `<PieChart>`/`<DonutChart>` primitive when one fits; only hand-roll on a raw controller when there's no primitive, and then add the `fontColor` yourself. Worth reporting upstream — see [reporting-upstream.md](reporting-upstream.md).)

**On another charting library (ECharts / Recharts / visx / … — the escape-hatch rung):** you can't reuse the Chart.js builders, so **mirror the same sources**. There's a 1:1 map from styling slot → theme source; read tokens with `getStyle('--em-chart-…')` / `getStyleNumber(...)` (`@embeddable.com/remarkable-ui`), series colours with `getChartColors()` + `getDimensionMeasureColor()`, values with `getThemeFormatter().data(...)`:

| Options slot | Theme source |
|---|---|
| Legend text / font | `--em-chart-category-color`, `--em-chart-category-font-{family,size,weight}` |
| Legend marker | point-style; box `--em-chart-category-size` |
| Axis tick labels | `--em-chart-grid-label-color--muted` (index axis: `--em-chart-grid-label-color`), `--em-chart-grid-label-font-*` |
| Grid lines | `--em-chart-grid-line-color--light`; width `--em-chart-grid-line-width--thin` |
| Axis title | `--em-chart-grid-label-color`, `--em-chart-grid-title-font-*` |
| Tooltip | bg `--em-chart-tooltip-background`, text `--em-chart-tooltip-title-color`, radius `--em-chart-tooltip-border-radius`, padding `--em-chart-tooltip-padding` |
| Data labels | bg `--em-chart-label-background`, text `--em-chart-label-color`, font `--em-chart-label-font-*` |
| Series colours | `getChartColors()` + `getDimensionMeasureColor()` (per the Colour section) |
| All displayed values | `getThemeFormatter().data(dimensionOrMeasure, value)` |

These `--em-chart-*` tokens are defined as `var(--em-sem-*)`, so **reading from them is exactly what makes the chart follow dark mode** — hardcode any of them (or accept the library's own defaults) and you lose both suite-consistency and theming. `getStyle`/`getStyleNumber` resolve the token from `:root` **at call time**, so call them in render (where `useTheme()` re-runs on a theme change) and the values re-resolve when the theme switches.
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
