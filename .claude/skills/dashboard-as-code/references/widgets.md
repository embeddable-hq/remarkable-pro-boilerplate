# Widgets (main canvas)

Widgets on the main canvas are static for end users — they can interact (filters, drilldowns) but cannot move, resize, or remove them. Templates that end users instantiate are described separately in [custom-canvas.md](custom-canvas.md).

## Shape

```yaml
widgets:
  - component: BarChartDefaultPro     # name from the component meta index
    position:
      x: 0
      y: 0
    dimensions:
      width: 12
      height: 22
    inputs: [...]
    events: [...]
```

## Layout grid

- The canvas is **12 columns** wide.
- `position.x` / `position.y` and `dimensions.width` / `dimensions.height` are all in grid units, not pixels.
- Widgets must not overlap. The dev events log will emit a `validation_error` describing the conflicting rectangles when they do.

### Initial widget size

When you place a new widget, derive its `width` and `height` from the component meta. **This rule is mandatory — do not deviate to fit a "nicer" multi-column layout, equalise widget heights across a row, or any other visual reason. Layout customisation is the user's call; if they want different sizes or a side-by-side grid, they will ask. The agent's job is to place widgets at the rule-derived size and let the user drive the arrangement after.**

- **If the meta has both `defaultWidth` and `defaultHeight`** (both in pixels), convert to grid units with these exact formulas:
  - `width  = clamp(round((defaultWidth  + 20) / 108.33), 1, 12)`
  - `height = round((defaultHeight + 20) / 21)`
- **If either `defaultWidth` or `defaultHeight` is missing**, fall back to `width: 12, height: 22`. No other fallback values are acceptable.

The arithmetic is simple enough to do inline; if you want a safety check on edge cases, run a one-liner:

```bash
python3 -c "W,H=300,120; w=max(1,min(12,round((W+20)/108.33))); h=round((H+20)/21); print(w,h)"
```

Sanity-check examples:

| `defaultWidth` × `defaultHeight` | grid `width` × `height` |
|---|---|
| 300 × 120 | 3 × 7 |
| 600 × 400 | 6 × 20 |
| 900 × 400 | 8 × 20 |
| (missing) | 12 × 22 |

#### Default placement

Sizes are determined by the rule above and are **never** changed for layout reasons. Only `x` / `y` positions are decided here.

Pack widgets into rows greedily, respecting two constraints:

1. **Each row's widgets must sum to ≤ 12 columns.** If adding the next widget would overflow, close the row and start a new one. The new row's `y` is `(previous row's y) + max(height of widgets in that previous row)`.
2. **Control widgets get their own row(s).** A "control" is any widget whose component meta `category` is one of: `Dropdowns - dates`, `Dropdowns - values`, `Dropdowns - dimensions and measures`, `Filters`, or `Inputs`. Don't mix controls and content widgets in the same row — even if the math allows it. Date pickers, multi-selects, granularity dropdowns etc. belong on a control bar, not side-by-side with a chart.

Within those constraints, place widgets left-to-right inside each row: each widget's `x` is the accumulated width of widgets already placed in that row. Start the first row at `x: 0, y: 0`; advance `x` as the row fills; advance `y` when a row closes.

**Sizes are never adjusted to fit a row.** If a widget's rule-derived size is 12 wide (fallback), it owns its row, full stop. If one widget is 8 wide and the next is 5 wide, the second goes to a new row (8 + 5 > 12) — don't shrink either to make them fit, and don't grow either to "use" the empty space.

Order:

- If the user specified an order, keep it.
- Otherwise, place control widgets first (top of canvas), then content widgets. KPIs typically come before larger charts within the content section, but this is a soft preference — don't reshuffle aggressively if the user's prompt implies an order.

After the initial layout the user can ask to rearrange, resize specific widgets, or compose a different grid. Apply those changes when asked, not preemptively.

## Inputs

Each widget input is one of the values configured for that component instance. Include an entry for:

- every input declared `required: true` in the component meta;
- every input that has a `defaultValue` in the meta — emit the default as the `value` (with `valueType: VALUE`), since optional defaults are not always applied at runtime;
- every **sub-input** (in a parent input's nested `inputs`) that declares a `defaultValue` — same reasoning, but easy to miss because sub-input defaults are buried inside the parent input;
- any other optional input the user wants to set.

**Array-typed parents multiply this.** When the parent input is `array: true` (e.g. `measures` on most charts), every default sub-input must be emitted **once per `parentValue`** — each measure gets its own copy. N default sub-inputs × M values in the array = N×M entries; omitting any of them is a silent runtime regression where that value falls back to something other than the documented default. Concrete trap: `LineChartComparisonWithKpiTabsPro` declares `previousLineDashed: true` on its `measures` sub-inputs — skip it for any measure and that measure's comparison line renders solid instead of dashed.

Before declaring a widget complete, scan the relevant section of the meta for every `"defaultValue"` key inside the inputs you've placed and confirm each one appears in your YAML — for every `parentValue` when the parent is `array: true`.

Before setting an input, **glance at its `description` field in the meta** if present. Most are UI copy for the no-code builder, but some contain decision-relevant signals (sizing implications, expected variable pairings, mutual-exclusivity with another input). See [component-discovery.md](component-discovery.md#reading-description-fields-on-inputs).

```yaml
inputs:
  - input: dataset                  # name from the component meta
    inputType: dataset              # type from the component meta
    valueType: VALUE                # VALUE | VARIABLE
    value: Orders                   # literal, or variable name when VARIABLE
    array: false                    # required when meta has array: true
    config: {...}                   # for typed inputs (see below)
```

### `dataset` inputs

- Always `valueType: VALUE`. Datasets cannot be variables.
- `value` is the `name` of a dataset declared in the same embeddable.
- `config` may carry **component-level filters, sort, and limit** that further narrow or shape this widget's view of the dataset. Filters do **not replace** the dataset's filters — they are additional AND conditions on top. This is heavily used: define one shared dataset (e.g. "Orders filtered by the current date range") and have multiple widgets reuse it, each adding its own narrowing — by product type, by region, etc. Each widget then shows its own slice while honouring the shared date range.

#### Component-level `filters` / `order` / `limit` on a `dataset` input

```yaml
- input: dataset
  inputType: dataset
  valueType: VALUE
  value: Orders
  config:
    filters:                          # extra AND conditions added on top of the dataset's filters
      - member: products.size
        operator: equals
        value: 'large'
        valueType: VALUE
      - member: orders.created_at
        operator: afterDate
        value: cutoff-date            # variables work here too
        valueType: VARIABLE
    order:                            # this widget's sort
      - member: orders.count
        direction: desc               # `asc` or `desc`
    limit: 10                         # this widget's row cap
```

Rules:

- `config.filters` — extra filters that are **AND-combined** with the dataset's own filters; the dataset's filters always still apply. Each entry adds another `WHERE` clause to the query for this widget only. Same shape as dataset filters: `member`, `operator`, `value`, `valueType` (`VALUE` or `VARIABLE`). The full operator catalogue from [datasets.md](datasets.md) applies, including the type restrictions.
- `config.limit` — integer row cap for this widget. Useful for "top N" widgets sharing a wider dataset. Datasets don't carry a limit themselves, so this is purely a component-level cap.
- `config.order` — list of `{ member, direction }`. `direction` is `asc` or `desc`. Members must exist in the dataset's model or its joins.
- These three fields are valid only on inputs of type `dataset`. Don't put `filters` / `limit` / `order` on `dimension` / `measure` / `dimensionOrMeasure` inputs.

When several widgets need different views of the same data, prefer **one shared dataset + per-widget `config.filters`** over many near-duplicate datasets.

### `dimension` / `measure` / `dimensionOrMeasure` inputs

- `config.dataset` **must** name another input on the same widget — usually the dataset input. This binds the dimension/measure to a specific dataset (a widget can have several dataset inputs).
- Values are qualified Cube member names. They must come from cubes available in the bound dataset's `model` or from cubes joined to it. Combining members from unjoined cubes will fail at query time.
- **Primary-key dimensions are hidden by default.** Any dimension in a `*.cube.yml` declared with `primary_key: true` is unusable in charts (and in filter `member` values, and as a `dimension` variable's value) **unless** it also has `public: true` explicitly. Before using a member, check its `*.cube.yml` definition:

  ```yaml
  # Not usable in YAML — primary_key with no public override:
  - name: id
    sql: id
    type: number
    primary_key: true

  # Usable — explicitly marked public:
  - name: id
    sql: id
    type: number
    primary_key: true
    public: true
  ```

  This applies to **every** place a cube member appears in YAML: widget input `value`, dataset `filters[].member`, component-level `config.filters[].member`, `config.order[].member`, and variable defaults of type `dimension`/`measure`. Non-primary-key dimensions and measures don't need `public: true` — they're public by default.

```yaml
- input: measures
  inputType: measure
  valueType: VALUE
  array: true
  value:
    - orders.count
    - customers.count           # OK only if customers is joined to orders
  config:
    dataset: dataset            # name of the dataset input on this same widget
```

## Sub-inputs (per-value config)

`dimension` / `measure` / `dimensionOrMeasure` inputs can carry nested `inputs` inside their `config` block. These **sub-inputs** customise rendering for one specific dimension/measure value.

```yaml
- input: measures
  inputType: measure
  valueType: VALUE
  array: true
  value:
    - orders.count
    - customers.count
  config:
    dataset: dataset
    inputs:
      - input: prefix             # name from the parent input's nested `inputs` in the component meta
        valueType: VALUE
        value: '$'
        parentValue: orders.count   # required when the parent input is array: true
      - input: decimalPlaces
        valueType: VALUE
        value: 2
        parentValue: customers.count
```

Rules:

- Sub-inputs are only valid on `dimension` / `measure` / `dimensionOrMeasure` inputs.
- `parentValue` is required when the parent input is `array: true` — it pins the sub-input to a specific value in the array. For non-array parents, omit `parentValue`.
- Available sub-input names come from the parent input's nested `inputs` in the component meta — check there before adding one.

### Reserved sub-input: `granularity`

For inputs whose value is a `time` dimension, the `granularity` sub-input (e.g. `day`, `week`, `month`, `quarter`, `year`) is always usable, even if the component meta doesn't declare it. Embeddable handles it implicitly to group time-series data.

## Events

```yaml
events:
  - event: onChange                 # event name from the component meta
    action: SET_VARIABLE
    config:
      variable: date-range          # name of the variable to update
      sourceType: EVENT_PROPERTY
      sourceValue: value            # name of the event property to read
```

The component meta lists the events a component can emit and the properties each event carries.

### `SET_VARIABLE` action

- `config.variable` — the name of an existing variable in this embeddable.
- `config.sourceType: EVENT_PROPERTY` — currently the only documented source for `SET_VARIABLE`.
- `config.sourceValue` — the event property name from the meta. Its `type` must match the target variable's `type` (and `array` flag).

### `DRILLDOWN` action

Opens another embeddable in a modal, optionally pre-filling variables in the target embeddable from event properties or from variables in the current embeddable. Useful for click-to-detail navigation: click a bar in a summary chart, see the rows that make it up.

```yaml
events:
  - event: onBarClicked
    action: DRILLDOWN
    config:
      embeddable: orders-detail-by-country   # name of the target embeddable
      variableOverrides:
        - variable: country                   # variable in the TARGET embeddable
          sourceType: EVENT_PROPERTY
          sourceValue: axisDimensionValue     # event property from the firing component
        - variable: date-range                # variable in the TARGET embeddable
          sourceType: VARIABLE
          sourceValue: date-range             # name of a variable in THIS embeddable
```

#### `config.embeddable`

The target embeddable's `name`. Must reference an `embeddables[].name` that exists somewhere under `src/embeddable.com/embeddables/` — either in this same file or in another `*.embeddable.yml`. Before writing a `DRILLDOWN`, scan the embeddables directory and confirm the target exists; if it doesn't, ask the user whether to create it first or pick a different target.

#### `config.variableOverrides`

Optional list. If empty (or omitted), the modal opens with the target embeddable's defaults — basic navigation, no contextual filtering. Each entry overrides one variable in the target embeddable.

| Field | Meaning |
|---|---|
| `variable` | Name of a variable declared in the **target** embeddable. Must exist there. |
| `sourceType` | `EVENT_PROPERTY` — read a property off the firing event. `VARIABLE` — read the current value of a variable in **this** (source) embeddable. |
| `sourceValue` | When `EVENT_PROPERTY`, the event property name (look it up in the firing component's meta). When `VARIABLE`, the variable name in this embeddable. |

Rules:

- The override value's type must match the target variable's type (and `array` flag).
- Overrides supersede the target variable's `defaultValue` — the modal opens with the override applied.
- Each target variable can only be overridden **once** per `variableOverrides` list.
- If the target variable was deleted or renamed, the override is silently skipped at runtime — the drill-down still opens, just without that filter.

#### Common patterns

- **Click-to-context (most common):** pass a clicked dimension/measure value into the target. Use `EVENT_PROPERTY` and pick the relevant property from the firing component's meta (e.g. `axisDimensionValue`, `axisDimensionTimeRange`).
- **State propagation:** carry over a filter from this embeddable into the target. Use `VARIABLE` with the source variable name.
- **Combined:** mix the two — pass the clicked value plus the current date range, etc.

#### Multi-level drill-down

The target embeddable may itself have widgets with `DRILLDOWN` events, opening a deeper modal. Keep the chain shallow — 2–3 levels is the practical maximum so users don't get lost.

#### Cross-file references and safety

- Target embeddables can live in any `*.embeddable.yml` under `src/embeddable.com/embeddables/`. Cross-file references are fine.
- Renaming an `embeddables[].name` breaks every `DRILLDOWN` event pointing at it. Always grep `embeddable: <old-name>` across all files in the embeddables directory before renaming, and update or warn.
- Renaming a variable in the target breaks any override that referenced it (overrides silently skip, so the filter just goes missing — easy to miss in review).
