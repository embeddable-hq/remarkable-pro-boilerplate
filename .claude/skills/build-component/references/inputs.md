# Inputs — native types, shared constants, sub-inputs, custom types
`meta.inputs` declares what the no-code builder exposes. Each becomes a prop on the React component (via `props`). **Compose from the shared `inputs`/`subInputs` constants** (`@embeddable.com/remarkable-pro`) instead of hand-writing objects — they carry the right labels, categories, and the sub-inputs that drive formatting.
## Native input types
| `type` | Builder control | Value shape passed to `props` |
|---|---|---|
| `string` | text box | `string` |
| `number` | number box | `number` |
| `boolean` | true/false dropdown | `boolean` |
| `time` | single time (absolute or relative) | `{ date }` or `{ relativeTimeString }` |
| `timeRange` | date-range | `{ from, to }` or `{ relativeTimeString }` |
| `dataset` | dataset picker | `Dataset` (never a variable) |
| `dimension` | dimension picker (needs `config.dataset`) | `Dimension` |
| `measure` | measure picker (needs `config.dataset`) | `Measure` |
| `dimensionOrMeasure` | either | `Dimension \| Measure` |
| `granularity` | day/week/month/… | `Granularity` |
Plus **custom types** (see below) for fixed named option sets.
## `InputMeta` fields
```ts
{
  name: 'xAxis',                 // unique within the component; the prop key
  type: 'dimension',
  label: 'X-axis',
  description: 'Shown in the builder; some carry decision-relevant hints',
  defaultValue: undefined,       // emit sensible defaults
  category: 'Component Settings',// groups inputs in the builder sidebar
  required: false,               // required ones must always be set
  array: true,                   // allow multiple (e.g. `measures`)
  config: { dataset: 'dataset', supportedTypes: ['time'] }, // type-specific
  inputs: [ /* sub-inputs — only meaningful with array: true */ ],
}
```
- `config.dataset` on a `dimension`/`measure`/`dimensionOrMeasure` input **must name another input** on the same component (usually the `dataset` input). It binds the picker to that dataset.
- `config.supportedTypes` restricts a dimension picker, e.g. `['time']` for an x-axis.
- `array: true` turns a single picker into a list (e.g. `measures`) and unlocks per-value sub-inputs.
## Categories & ordering — match the Pro convention
The no-code builder groups inputs by their `category` string and shows the groups in a fixed order. To make custom components feel native, **use the exact same category strings the Pro components use, and order inputs data-first**. The Pro categories, in display order:

1. **`Component Data`** — `dataset`, `dimension(s)`, `measure(s)`, and query-shaping numerics (`maxResults`, `maxLegendItems`, a "max stages/days" limit). **Always first.**
2. **`Component Header`** — `title`, `description`, `tooltip`.
3. **`Component Settings`** — display toggles and visual numerics (`showLegend`, `showValueLabels`, `fontSize`, a threshold, etc.).
4. **`Axes Settings`** — axis labels/ranges (charts with x/y axes only).
5. **`Pre-configured Variables`** — the input that seeds a variable (e.g. `selectedValue`). (The shipped library is inconsistent on casing — `Pre-configured variables` also appears — but pick one and be consistent within a component.)
6. **`Data Mapping for Interactions`** — an optional input that makes the component emit a *different* field than it displays (see [events-and-state.md](events-and-state.md)).

The shared `inputs.*` constants already carry the right `category` (e.g. `inputs.dataset` → `Component Data`, `inputs.title` → `Component Header`). **You only set `category` on inputs you add yourself** — and you should, using the strings above, rather than leaving them uncategorised or inventing new ones. List the inputs array in category order (Data → Header → Settings → …) so the source reads the way the builder renders.

## The shared `inputs` constants — spread & override
Don't write input objects by hand. Spread the shared one and override the few fields you need (real pattern from `LineChartDefaultPro`):
```ts
import { inputs } from '@embeddable.com/remarkable-pro';
import { subInputs } from '@embeddable.com/remarkable-pro';
inputs: [
  inputs.dataset,
  { ...inputs.measures, inputs: [
    ...inputs.measures.inputs,
    { ...subInputs.boolean, name: 'dashedLine', label: 'Dashed line', defaultValue: false },
  ] },
  { ...inputs.dimensionWithGranularitySelectField, name: 'xAxis', label: 'X-axis' },
  inputs.title, inputs.description, inputs.tooltip,
  inputs.showLegend, inputs.showTooltips, inputs.showValueLabels,
  inputs.maxResults, inputs.menuOptions,
]
```
Frequently-used keys (confirmed in Pro definitions): `dataset`, `dimension`, `dimensions`, `dimensionWithGranularitySelectField`, `measure`, `measures`, `dimensionOrMeasure`, `dimensionsAndMeasures`, `title`, `description`, `tooltip`, `placeholder`, `markdown`, `string`, `number`, `boolean`, `fontSize`, `displayNullAs`, `showLegend`, `showTooltips`, `showValueLabels`, `showLogarithmicScale`, `maxLegendItems`, `maxResults`, `menuOptions`, `xAxisLabel`, `yAxisLabel`, `reverseXAxis`, `yAxisRangeMin`, `yAxisRangeMax`, `timeRange`, `comparisonPeriod`. When unsure a key exists, confirm against `component.inputs.constants` in `dist/index.d.ts` rather than guessing.

For period-over-period charts, the comparison pair is **already provided** — spread `inputs.timeRange` (renamed `primaryDateRange`) for the current window and `inputs.comparisonPeriod` for the comparison-period selector. Don't hand-write either, and don't define your own comparison custom type — `inputs.comparisonPeriod` already uses Pro's `ComparisonPeriodType`. The two-load mechanic is in [data-loading.md](data-loading.md).
## Sub-inputs (per dimension/measure value)
Sub-inputs attach to an `array: true` dimension/measure input and configure one value. The standard ones **drive `getThemeFormatter` automatically** — set them and formatting just works, no React code:
`prefix`, `suffix`, `currency`, `decimalPlaces`, `abbreviateLargeNumber`, `maxCharacters`, `granularity`, `dateBounds`, `color`, `displayFormat`. Compose via `subInputs.*` (e.g. `subInputs.boolean`, `subInputs.color`, `subInputs.number`).
Reserved: a `granularity` sub-input is always usable on a `time` dimension even if not declared — Embeddable groups time-series by it. `getDimensionWithGranularity(dimension, state?.granularity)` applies a state-chosen granularity before `loadData`.
## Custom types vs native types — when to use which

| Situation | Use |
|---|---|
| Fixed, named option set (e.g. "Ascending / Descending", "Solid / Dashed / Dotted") | Custom type (`defineType` + `defineOption`) |
| Any text the user might enter | `string` native |
| On/off flag | `boolean` native |
| A number the user picks | `number` native |
| Anything that can be captured as a `string` with a `description` that clarifies the allowed values | `string` native — simpler, no overhead |

**Prefer native types.** The overhead of a custom type is real: TypeScript noise (often needs `as never`), may require restarting `embeddable:dev` to pick up, and **not supported in Custom Canvas**. Only reach for a custom type when the option set is genuinely closed and the user must pick from a finite list. When in doubt, use `string` with a clear `description`, or `boolean` for two-state choices.

Side-by-side for a sort direction input:
```ts
// ✅ Native — zero overhead, works everywhere
{ name: 'sortDirection', type: 'string', label: 'Sort direction',
  description: 'Use "asc" for ascending or "desc" for descending.',
  defaultValue: 'desc', category: 'Component Settings' }

// ✅ Custom — better UX (dropdown with labels), but has overhead
import SortDirectionType from './SortDirection.type.emb';
{ name: 'sortDirection', type: SortDirectionType as never, label: 'Sort direction',
  defaultValue: { value: 'desc', label: 'Descending' }, category: 'Component Settings' }
```

Use the custom type version only when: (a) there are ≥ 3 options, (b) the option labels differ meaningfully from their values, and (c) Custom Canvas is not a requirement. Confirm with the user before adding a custom type.

## Custom types (a legitimate tool, currently beta)
Reach for a custom type when an input needs a **fixed set of named options** that isn't a plain string/number/boolean — exactly what Pro itself does for `ComparisonPeriod`, `DisplayFormat`, `ExportOption`, `SortDirection`, `TableCellStyle`.
Define in a `*.type.emb.ts` with `defineType` + `defineOption`:
```ts
import { defineType, defineOption } from '@embeddable.com/core';
const SortDirectionType = defineType('sortDirection', { label: 'Sort direction', optionLabel: (o) => o.label });
defineOption(SortDirectionType, { value: 'asc',  label: 'Ascending' });
defineOption(SortDirectionType, { value: 'desc', label: 'Descending' });
export default SortDirectionType;
```
Use it in a component as `{ name: 'sort', type: SortDirectionType as never, label: 'Sort', defaultValue: {...} }`.
**Extending a native type** (e.g. extra `granularity`/`timeRange`/`time` presets): use `defineOption` **only**, never `defineType` on a native type — `defineType` on natives causes build errors.
Beta caveats — call these out to the user when you reach for one: TypeScript noise (often need `as never` at the use site), may require restarting `embeddable:dev` to pick up changes, and **not supported in Custom Canvas**. Prefer native types unless a fixed named option set is genuinely needed.
