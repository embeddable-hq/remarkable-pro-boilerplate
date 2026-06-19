# Component anatomy
## Pattern A — new component (default for new charts/controls/content)
```
src/embeddable.com/components/<Name>/
├── <Name>.emb.ts   # meta + inline defineComponent(Component, meta, config)
└── index.tsx       # the React component (default export)
```
`<Name>.emb.ts`:
```ts
import { EmbeddedComponentMeta, defineComponent, Inputs, definePreview } from '@embeddable.com/react';
import { loadData, Value } from '@embeddable.com/core';
import Component from './index';
export const meta = {
  name: '<Name>',                 // unique; must be stable after push
  label: '<Human label>',
  category: '<Builder grouping>',
  description: '<one line; helps builder disambiguation>',
  defaultWidth: 600, defaultHeight: 300,
  inputs: [ /* compose from shared `inputs` */ ],
  events: [ /* optional */ ],
  variables: [ /* optional */ ],
} as const satisfies EmbeddedComponentMeta;
export const preview = definePreview(Component, { /* previewData.* mocks */, hideMenu: true });
export default defineComponent(Component, meta, {     // MUST be inline
  props: (inputs: Inputs<typeof meta>) => ({ ...inputs, results: loadData({ from: inputs.dataset, select: [...] }) }),
  events: { /* onX: (v) => ({ ... }) */ },
});
```
Hard rules: `as const satisfies EmbeddedComponentMeta`; `defineComponent(...)` called **inline** (never assigned first — breaks the build); `loadData` lives in `props`, not React; **the `.emb.*` filename must equal `meta.name`** (e.g. `KpiTile.emb.ts` ↔ `name: 'KpiTile'`) — the build's meta validator rejects a mismatch.
## Pattern B — extend a Pro component
```
src/embeddable.com/components/<Name>/
├── definition.ts   # spreads the Pro component's exported object
├── <Name>.emb.ts   # re-exports preview/meta + defineComponent(...definition)
└── index.tsx       # OPTIONAL — only if wrapping with new UI
```
See [extending-pro.md](extending-pro.md). The reason it works: every Pro component exports a namespaced object you can spread.
## The namespaced `definition` object (how Pro ships every component)
```ts
export const <name>Pro = {
  Component, meta, preview, previewConfig?,
  config: { props, events? },                 // events omitted if none
  results: { loadDataArgs, loadData },         // omitted if no data (e.g. MarkdownPro)
} as const;
```
The split `results.loadDataArgs` / `results.loadData` is the reuse seam — extenders rebuild or reuse the query.
## The `props` signature ladder
Scales with interactivity:
```ts
(inputs) => ({ ...inputs })                                   // MarkdownPro — content
(inputs) => ({ ...inputs, results: loadData(...) })           // KpiChartNumberPro — data, no interaction
(inputs, [state, setState]) => ({ ... })                      // SingleSelectFieldPro — internal state
(inputs, [state, setState], clientContext) => ({ ... })       // LineChartDefaultPro — + timezone
```
`clientContext` supplies `timezone` (via `getClientContextTimezone(clientContext?.timezone)`) and locale — pass it into `loadData` and theming.
## Preview
Always export a `definePreview(Component, {...})` so the component renders in the builder without a live dataset.
- **Data components** (charts/KPIs): use the shared `previewData.*` mocks (e.g. `previewData.dimension`, `previewData.measure`, `previewData.results1Measure1Dimension`) and `hideMenu: true`.
- **Data-less components** (controls, content): there is no `results` to mock — **omit it**. Seed the visible inputs and pass a no-op for any event, e.g. `definePreview(Component, { values: ['Day','Week','Month'], selectedValue: 'Week', onChange: () => null })`. Only the props the component actually reads need to be present.
