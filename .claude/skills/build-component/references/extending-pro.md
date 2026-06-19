# Pattern B — extend a Pro component
Highest reuse, lowest risk. Every Pro component exports a namespaced object (`barChartDefaultPro`, `lineChartDefaultPro`, `pieChartPro`, …) shaped `{ Component, meta, preview, previewConfig?, config: { props, events? }, results: { loadDataArgs, loadData } }`. You **spread** it and override only what changes. Inherited inputs, events, data loading, theming, and the React component all come along for free.
## When to use B vs A
- **B (extend)** — you want an existing Pro chart/control with a tweak: re-sort or post-process its data, add an input, annotate or wrap it with extra UI, change a default.
- **A (new)** — there is no close Pro component to start from. See [component-anatomy.md](component-anatomy.md).
## Step 0 — read the target's meta
Before extending, read `node_modules/@embeddable.com/remarkable-pro/dist/meta/<Name>.meta.json` to see the exact inputs/events you're inheriting (and so you don't re-add an input that already exists). Confirm the import name in `dist/index.d.ts` (e.g. `barChartDefaultPro` plus the `BarChartDefaultProProps` type).
## Variant 1 — logic only (data tweak, new input). Two files.
`definition.ts` — spread `meta` and `config`, and **call the original `props`** to get base props, then modify:
```ts
import { barChartDefaultPro } from '@embeddable.com/remarkable-pro';
import { Inputs } from '@embeddable.com/react';
const meta = {
  ...barChartDefaultPro.meta,
  name: 'BarChartSortedDesc',          // NEW unique name
  label: 'Bar Chart (Sorted Descending)',
} as const;
const props = (
  inputs: Inputs<typeof meta>,
  stateTuple: Parameters<typeof barChartDefaultPro.config.props>[1],
) => {
  const baseProps = barChartDefaultPro.config.props(
    inputs as Inputs<typeof barChartDefaultPro.meta>,
    stateTuple,
  );
  const measureName = inputs.measures?.[0]?.name;
  const sortedData = [...(baseProps.results.data ?? [])].sort(
    (a, b) => (measureName ? Number(b[measureName] ?? 0) - Number(a[measureName] ?? 0) : 0),
  );
  return { ...baseProps, results: { ...baseProps.results, data: sortedData } };
};
export const barChartSortedDesc = {
  ...barChartDefaultPro,
  meta,
  config: { ...barChartDefaultPro.config, props },
} as const;
```
`BarChartSortedDesc.emb.ts` — thin re-export (note: `defineComponent` inline):
```ts
import { defineComponent } from '@embeddable.com/react';
import { barChartSortedDesc } from './definition';
export const preview = barChartSortedDesc.preview;
export const meta = barChartSortedDesc.meta;
export default defineComponent(barChartSortedDesc.Component, meta, barChartSortedDesc.config);
```
## Variant 2 — wrap with new UI (add input + render around it). Three files.
Add inputs by spreading `...barChartDefaultPro.meta.inputs` plus your own (compose new ones from the shared `inputs`), point `Component` at your wrapper, and render the original component inside it.
`definition.ts`:
```ts
import { barChartDefaultPro, inputs } from '@embeddable.com/remarkable-pro';
import { Inputs } from '@embeddable.com/react';
import BarChartLowStockWarning from './index';
const meta = {
  ...barChartDefaultPro.meta,
  name: 'BarChartLowStockWarning',
  label: 'Bar Chart (Low Stock Warning)',
  inputs: [
    ...barChartDefaultPro.meta.inputs,
    { ...inputs.boolean, name: 'showLowStockWarning', label: 'Show low stock warning', defaultValue: true },
    { ...inputs.number, name: 'lowStockThreshold', label: 'Low stock threshold', defaultValue: 10 },
  ],
} as const;
const props = (
  inputs: Inputs<typeof meta>,
  stateTuple: Parameters<typeof barChartDefaultPro.config.props>[1],
) => {
  const baseProps = barChartDefaultPro.config.props(inputs as Inputs<typeof barChartDefaultPro.meta>, stateTuple);
  return {
    ...baseProps,
    showLowStockWarning: Boolean(inputs.showLowStockWarning),
    lowStockThreshold: Number(inputs.lowStockThreshold),
  };
};
export const barChartLowStockWarning = {
  ...barChartDefaultPro,
  Component: BarChartLowStockWarning,
  meta,
  config: { ...barChartDefaultPro.config, props },
  previewConfig: { ...barChartDefaultPro.previewConfig, showLowStockWarning: true, lowStockThreshold: 10 },
} as const;
```
`index.tsx` — render the original `barChartDefaultPro.Component` inside your wrapper, using `remarkable-ui`/Pro for the added UI:
```tsx
import { barChartDefaultPro, BarChartDefaultProProps } from '@embeddable.com/remarkable-pro';
import { Typography } from '@embeddable.com/remarkable-ui';
type Props = BarChartDefaultProProps & { showLowStockWarning?: boolean; lowStockThreshold?: number };
const BarChartLowStockWarning = ({ showLowStockWarning, lowStockThreshold, ...props }: Props) => {
  const measureName = props.measures[0]?.name;
  const hasLowStock = showLowStockWarning && typeof lowStockThreshold === 'number' && !!measureName &&
    props.results.data?.some((row) => Number(row[measureName]) < lowStockThreshold);
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ flex: 1, minHeight: 0 }}><barChartDefaultPro.Component {...props} /></div>
      {hasLowStock && <Typography as="p">⚠️ Items have low stock</Typography>}
    </div>
  );
};
export default BarChartLowStockWarning;
```
## Rules
- Always give the extension a **new unique `meta.name`** — never reuse the base component's name — and name the `.emb.*` file to match it (e.g. `name: 'BarChartLowStock'` ↔ `BarChartLowStock.emb.ts`).
- **Do not put `as const` on an extended meta.** Spreading the base meta's inputs into a new array literal keeps `inputs` a *mutable* `ComponentMetaInput[]`, which is what `defineComponent`/`Inputs` require; `as const` makes it `readonly` and fails to compile. (Brand-new Pattern A metas, which use literal inputs, do use `as const satisfies EmbeddedComponentMeta`.)
- Because the extended meta isn't `as const`, the SDK infers a loose input type for it. A Pattern B `props` is a thin adapter that delegates to the base component's own typed `props`, so typing its `inputs` parameter as `any` (then reading your added inputs off it) is the pragmatic, compile-clean choice — see [examples/extend-pro-component/definition.ts](../examples/extend-pro-component/definition.ts).
- Call the **original `props`** (`barChartDefaultPro.config.props(...)`) and modify its result; don't reimplement data loading.
- Use `Parameters<typeof <base>.config.props>[1]` for the state tuple type, and cast `inputs as Inputs<typeof <base>.meta>` when calling it (the handbook pattern).
- Spread `...<base>` last-wins: override `meta`, `config`, `Component`, `previewConfig` after the spread.
- A full worked version is in [examples/extend-pro-component/](../examples/extend-pro-component/).
