# Examples

Six worked, compiling components — one per rung of the complexity ladder. Each is a reference
template: copy a folder into `src/embeddable.com/components/`, rename `meta.name`, and adapt.
They import **only from the public package roots** (`@embeddable.com/core`, `@embeddable.com/react`,
`@embeddable.com/remarkable-pro`, `@embeddable.com/remarkable-ui`) — the same surface a consumer has.

| Example | loadData | state | events | variables | fillGaps | Pattern | Modelled on |
|---|---|---|---|---|---|---|---|
| `presentational-callout/` | — | — | — | — | — | A | MarkdownPro |
| `kpi-tile/` | ✓ | — | — | — | — | A | KpiChartNumberPro |
| `chart-with-event/` | ✓ | — | ✓ | — | — | A | PieChartPro |
| `timeseries-chart/` | ✓ | ✓ | ✓ | — | ✓ | A | LineChartDefaultPro |
| `control-with-variable/` | ✓ | ✓ | ✓ | ✓ | — | A | SingleSelectFieldPro |
| `extend-pro-component/` | (inherited) | (inherited) | (inherited) | — | — | B | handbook low-stock wrapper |

The progression maps directly to the reuse-first decision tree and the internal-vs-emit rule in
[../SKILL.md](../SKILL.md). Read the matching reference doc alongside each example.
