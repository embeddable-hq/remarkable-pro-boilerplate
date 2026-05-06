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
- A component meta file may include `defaultWidth` / `defaultHeight` (in pixels) — use them as a hint when sizing on the grid; convert pragmatically to grid units that fit the layout.

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
- `config.sourceType: EVENT_PROPERTY` — currently the only documented source.
- `config.sourceValue` — the event property name from the meta. Its `type` must match the target variable's `type` (and `array` flag).

### Other actions

- `DRILLDOWN` is a separate, larger topic and is **not yet covered by this skill**. Don't generate `DRILLDOWN` events from this skill.
