# Chart behavior: `legendPosition` & per-variant Chart.js options
Everything in `theme.charts` that is **not** color (palettes and pins live in [mapping.md](mapping.md) → Chart palettes).

## `charts.legendPosition`
`'top' | 'right' | 'bottom' | 'left'` — the default legend placement for all charts (library default: `bottom`). The most common single behavior override; set it in the theme's shared block.

## Per-variant Chart.js overrides — `charts.<variantKey>.options`
Each Pro chart merges `theme.charts.<variantKey>.options` over its computed Chart.js config at render — theme wins, and it applies to **every instance of that variant, workspace-wide**. Typed `Partial<ChartOptions<'pie'|'bar'|'line'|'scatter'|'bubble'>>`.

The 16 variant keys (from `ThemeCharts`):
`pieChartPro` · `donutChartPro` · `donutLabelChartPro` · `barChartDefaultPro` · `barChartDefaultHorizontalPro` · `barChartGroupedPro` · `barChartGroupedHorizontalPro` · `barChartStackedPro` · `barChartStackedHorizontalPro` · `lineChartDefaultPro` · `lineChartGroupedPro` · `lineChartComparisonDefaultPro` · `barLineChartPro` · `areaChartPro` · `scatterChartPro` · `bubbleChartPro`

Worked examples:
```ts
charts: {
  // Hide the legend on pies only
  pieChartPro: { options: { plugins: { legend: { display: false } } } },
  // Bars always start at zero
  barChartDefaultPro: { options: { scales: { y: { beginAtZero: true } } } },
  // Softer line curves
  lineChartDefaultPro: { options: { elements: { line: { tension: 0.3 } } } },
}
```

## Scope rules — pick the right layer
- **One widget** should differ → that's a builder setting on the widget (authored in YAML → the `dashboard-as-code` skill), not a theme override. The theme key hits every instance of the variant.
- **Colors** → palettes/pins in [mapping.md](mapping.md); **fonts/sizes of chart text** → `--em-chart-*` tokens; reach for `options` only for genuine Chart.js *behavior* (axes, legend, elements, plugins).
- **Custom components** aren't covered by these 16 keys — even Chart.js-based ones read their own config; see the `build-component` skill.

## Cautions
- This is an escape hatch into Chart.js internals: keys are only `Partial`-checked, and a wrong nesting is **silently ignored**. Verify paths against the Chart.js docs for the chart type, and visually confirm in the builder.
- Overrides merge over library behavior the Pro components rely on (tooltips, interaction modes) — override the *specific* key you need, never a whole `plugins`/`scales` object wholesale.
