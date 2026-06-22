# Events, variables, and the internal-vs-emit decision
The defining skill of an Embeddable component: deciding, for **each** interaction, whether it stays internal or propagates up.
## The rule
> Does this interaction only change what THIS component shows, or does it express intent other widgets should react to?
- **Only this component** → **Embeddable State** (the `[state, setState]` tuple in `props`). State changes re-run `props` and trigger new `loadData`. No event, no variable.
- **Other widgets react** → **event + variable**. React calls `onX(...)`; `config.events.onX` shapes the payload; `meta.events` declares it; `meta.variables` auto-creates the builder variable it updates.
A component often does **both**. The matched pairs below come from real Pro components.
## Matched pairs (proof from real code)
| Component | Stays INTERNAL (state) | EMITS (event + variable) |
|---|---|---|
| `LineChartDefaultPro` | granularity toggle → `setGranularity` re-buckets its own data | line click → `onLineClicked` (`axisDimensionValue`, `axisDimensionTimeRange`) |
| `SingleSelectFieldPro` | search box → `setSearchValue` re-queries its own options | value picked → `onChange` → `single-select value` variable |
| `FilterBuilderPro` | selecting dims/operators, typing, add/delete rows → `setEmbeddableState` | committed clause → `onChange` (emitted once, deduped) |
| `TableChartPaginated` | page / sort / pageSize → `setState` → new `loadData(offset, limit, orderBy)` | row click → `onRowClicked`, only if `clickDimension` configured |
## Interactive surfaces a primitive owns (trap slots)
Many `remarkable-ui` primitives **already bind** a click/keyboard interaction on a surface that *also* accepts your content. A `ReactNode` (or render-fn) slot rendered **inside** an element that has `onClick`/`onKeyDown`/`role="button"`/Radix `asChild` is a **trap slot**: put an interactive element (`<button>`, link, input, anything focusable) there and you nest interactive controls — invalid HTML, so the browser splits the DOM and the primitive's own interaction (e.g. sorting) silently breaks. This is the single most common way a custom component breaks a primitive. **Audit before you fill** — see [discovery-and-validation.md](discovery-and-validation.md) → "Audit a primitive's interactions".

| Primitive | Surface it owns | Trap slot (renders *inside* it) | Do instead |
|---|---|---|---|
| `TableScrollable` / `TablePaginated` / `TableHeader` | each `<th>` **is** a sort `<button>` (sort cycles in internal state; `onSortChange` only *reports* it) | `header.title: ReactNode` (sits next to the sort caret) | keep `title` a **plain string**; put rich content in `accessor`; wire `onSortChange` to report |
| table body cell (`TableBodyCellWithCopy`) | `<td>` holds a copy `<button>` (ActionIcon) | `header.accessor: (row) => ReactNode` (sibling of the copy button) | put **non-interactive** JSX (bars, badges, text) in `accessor`; for a per-row action use `onRowIndexClick` / a `clickDimension`-style emit |
| table body row | `<tr onClick>` → `onRowIndexClick` | the whole row | use `onRowIndexClick`; don't add a competing row-level click |
| `PivotTable` (expandable) | row-header cell gets `onClick`+`onKeyDown`+`role="button"` when `expandableRows` | the expandable row header | drive expand via the primitive; don't overlay a control there |
| `Dropdown` | `DropdownMenu.Trigger asChild` merges its handlers onto your node | `triggerComponent: ReactNode` | pass a **plain** trigger (no own `onClick`); let the primitive open/close it |
| `HeatMap` | cell `onClick` → `onCellClick` | the cell | use `onCellClick`; no nested control in the cell |

**General rule:** any slot typed `React.ReactNode` or `(…) => ReactNode` that renders *within* an element carrying `onClick`/`onKeyDown`/`role="button"`/`asChild` is a trap slot. When in doubt, read the primitive's source (it's not minified) — commands in [discovery-and-validation.md](discovery-and-validation.md). The right pattern for a table: custom JSX lives in the column `accessor` (cell content), `title` stays a **plain string**, and sort/row behaviour goes through the primitive's own callback (`onSortChange` / `onRowIndexClick`) — never an interactive element inside `title`.
## Internal state
`props(inputs, [state, setState], clientContext)`. Read state, wire setters, and make `loadData` depend on state:
```ts
// SingleSelectFieldPro: search state drives the query
const props = (inputs, [state, setState]) => ({
  ...inputs,
  setSearchValue: (searchValue: string) => setState({ searchValue }),  // internal
  results: loadDataResults(inputs, state),                              // reacts to state.searchValue
});
```
Pagination uses `offset: page * pageSize`; granularity uses `getDimensionWithGranularity(inputs.xAxis, state?.granularity)` before `loadData`.
## Events
Declare in `meta.events`, transform in `config.events`. Use `Value.noFilter()` for the cleared case.
```ts
// meta
events: [{ name: 'onChange', label: 'Selected value updated',
  properties: [{ name: 'value', label: 'Selected value', type: 'string' }] }],
// config
events: { onChange: (v: string | null) => ({ value: v ?? Value.noFilter() }) },
```
Property `type` values: `string`, `number`, `boolean`, `time`, `timeRange`, `filters`, `dimension`, `measure`. For a clicked time bucket, build a `timeRange` with `getTimeRangeFromDimensionValue({ value, dimension })` so drilldowns filter the correct range.
## Variables (auto-created in the builder)
```ts
variables: [{
  name: 'single-select value',
  type: 'string',
  defaultValue: Value.noFilter(),
  inputs: ['selectedValue'],                       // input that seeds the default
  events: [{ name: 'onChange', property: 'value' }], // event that updates it
}],
```
Pre-defining the variable in code (vs. making the user create it) is the better UX. The seeding input typically sits in category `'Pre-configured Variables'`.
## Multi-property events & multiple variables
An event can carry several properties, and each becomes its own variable. Declare every property in `meta.events[].properties`, shape them all in one `config.events` transformer, and declare **one variable per property** — each linking the input that seeds it and the event property that updates it. Example — a numeric range control emitting `{ min, max }`:
```ts
// meta
events: [{ name: 'onChange', label: 'Range changed', properties: [
  { name: 'min', label: 'Min', type: 'number' },
  { name: 'max', label: 'Max', type: 'number' },
]}],
variables: [
  { name: 'range min', type: 'number', defaultValue: Value.noFilter(),
    inputs: ['defaultMin'], events: [{ name: 'onChange', property: 'min' }] },
  { name: 'range max', type: 'number', defaultValue: Value.noFilter(),
    inputs: ['defaultMax'], events: [{ name: 'onChange', property: 'max' }] },
],
// config — one transformer returns the whole payload object (shape = the declared properties):
events: { onChange: (v: { min: number | null; max: number | null }) => ({
  min: v.min ?? Value.noFilter(), max: v.max ?? Value.noFilter() }) },
```
The React side fires once with the whole object: `onChange?.({ min, max })`. The transformer's returned keys MUST match the `properties` names. For a straight pass-through, return the object as-is (still map empties to `Value.noFilter()`).
## Firing in React
Charts: a click handler extracts the value and calls the callback —
```tsx
const handleClick = createSimpleClickHandler({ data, dimension: xAxis, granularity, onClicked: onLineClicked });
```
Controls: call the callback directly on change — `onChange?.(newValue as string | null)`.
## Commit-on-change with dedup (FilterBuilderPro)
When draft state is assembled internally and should emit only on a real change, emit from an effect and dedup against the previous serialized value:
```tsx
useEffect(() => {
  const clause = filtersToClause(filterBuilderAndOrOperator.AND, filters);
  if (JSON.stringify(clause) === JSON.stringify(prevFilterValueRef.current)) return;
  prevFilterValueRef.current = clause;
  onChange?.(clause);
}, [filters]);
```
## "Data Mapping for Interactions"
An optional input lets a component emit a **different** dimension's value than the one it displays — e.g. `SingleSelectFieldPro`'s `optionalSecondDimension`, `TableChartPaginated`'s `clickDimension` (both in category `'Data Mapping for Interactions'`). Use when the displayed field and the filtering field differ.

### Worked example — table shows a label, emits an ID
A table renders `users.name` for readability but the rest of the dashboard filters on `users.id`. Without `clickDimension`, clicking a row emits the name — wrong field.

```ts
// .emb.ts — meta
inputs: [
  inputs.dataset,
  { ...inputs.dimension, name: 'rowDimension', label: 'Row dimension', category: 'Component Data' },
  { ...inputs.measures, label: 'Measures', category: 'Component Data' },
  {
    name: 'clickDimension',
    type: 'dimension',
    label: 'Field to emit on row click',
    description: 'Optional. If set, row clicks emit the value of this field instead of the row dimension. Useful when the display field (e.g. name) differs from the filter field (e.g. ID).',
    required: false,
    category: 'Data Mapping for Interactions',
    config: { dataset: 'dataset' },
  },
  // … title, settings …
  { name: 'defaultClickValue', type: 'string', label: 'Default selected value',
    defaultValue: undefined, category: 'Pre-configured Variables' },
],
events: [{ name: 'onRowClicked', label: 'Row clicked',
  properties: [{ name: 'value', label: 'Clicked value', type: 'string' }] }],
variables: [{
  name: 'selected row value',
  type: 'string',
  defaultValue: Value.noFilter(),
  inputs: ['defaultClickValue'],
  events: [{ name: 'onRowClicked', property: 'value' }],
}],
```

```ts
// .emb.ts — config
events: {
  onRowClicked: (row: Record<string, unknown>, inputs: Inputs) => {
    const emitDim = inputs.clickDimension ?? inputs.rowDimension;
    const rawValue = row[emitDim?.name ?? ''];
    return { value: rawValue != null ? String(rawValue) : Value.noFilter() };
  },
},
```

```tsx
// index.tsx — React side
const handleRowClick = (row: Record<string, unknown>) => {
  onRowClicked?.(row);  // raw row; config.events shapes the payload
};
```

Key points:
- The `config.events` transformer receives the **raw value** as the first arg when the React component calls the callback directly. For cases where you need access to `inputs` inside the transformer to know which field to read, pass the whole row and let the transformer do the field lookup.
- `inputs.clickDimension` falls back to `inputs.rowDimension` when unset — emit behaviour degrades gracefully.
- Put the `clickDimension` input in `'Data Mapping for Interactions'` (not `'Component Data'`), so the builder groups it separately from query-shaping inputs.
- `Value.noFilter()` for the case where the cell value is null/undefined.
