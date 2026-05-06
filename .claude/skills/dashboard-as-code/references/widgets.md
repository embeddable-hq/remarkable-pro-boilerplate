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
      height: 15
    inputs: [...]
    events: [...]
```

## Layout grid

- The canvas is **12 columns** wide.
- `position.x` / `position.y` and `dimensions.width` / `dimensions.height` are all in grid units, not pixels.
- Widgets must not overlap. The dev events log will emit a `validation_error` describing the conflicting rectangles when they do.

### Initial widget size

When you place a new widget, derive its starting `width` and `height` from the component meta:

- **If the meta has both `defaultWidth` and `defaultHeight`** (both in pixels), convert to grid units with these exact formulas:
  - `width  = clamp(round((defaultWidth  + 20) / 108.33), 1, 12)`
  - `height = round((defaultHeight + 20) / 21)`
- **If either `defaultWidth` or `defaultHeight` is missing**, fall back to `width: 12, height: 15`.

These are starting values — the user can always resize after. The arithmetic is simple enough to do inline; if you want a safety check on edge cases, run a one-liner:

```bash
python3 -c "W,H=300,120; w=max(1,min(12,round((W+20)/108.33))); h=round((H+20)/21); print(w,h)"
```

Sanity-check examples:

| `defaultWidth` × `defaultHeight` | grid `width` × `height` |
|---|---|
| 300 × 120 | 3 × 7 |
| 600 × 400 | 6 × 20 |
| 900 × 400 | 8 × 20 |
| (missing) | 12 × 15 |

## Inputs

Each widget input is one of the values configured for that component instance. For every input declared `required: true` in the component meta, include an entry; for optional inputs, include an entry only when the user wants to set them.

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
