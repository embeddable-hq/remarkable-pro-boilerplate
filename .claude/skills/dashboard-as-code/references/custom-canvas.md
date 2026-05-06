# Custom canvas

The custom canvas lets end users build their own widgets from **templates** the dashboard author defines. Each end user has their own copy of the custom canvas — what they create is private to them.

## Concept

- **Main canvas** (`widgets`) is static for end users — they can only interact with widgets, not add/move/remove them.
- **Custom canvas** (`customCanvas`) lets end users instantiate widgets from `templates`. End-user-created widgets live in user state, not in this YAML.
- **Starter canvas** (`customCanvas.starterCanvas`) is a pre-populated set of template-instantiated widgets that appears in every end user's custom canvas the first time they open it. They can edit or delete those.

## Shape

```yaml
customCanvas:
  datasets:
    - dataset: Orders               # references a dataset declared in this embeddable
  templates:
    - key: orders-by-date           # stable identifier — see "Template key lifecycle" below
      name: Orders by date          # human-readable, end-user-visible
      description: Daily order volume over time
      component: LineChartDefaultPro
      icon: single-line             # see icon catalogue below
      inputs: [...]                 # same shape as widget inputs; see "Template inputs"
  starterCanvas:
    widgets:
      - template: orders-by-date    # the KEY of a template above
        position: { x: 0, y: 0 }
        dimensions: { width: 6, height: 8 }
        inputs: []                  # optional overrides for the template's inputs
```

## `customCanvas.datasets`

A list of `{ dataset: <name> }` entries pointing at datasets declared in the same embeddable. These are the datasets end users may use when configuring custom-canvas widgets.

## `customCanvas.templates`

Each template is a recipe for a custom-canvas widget. Fields:

| Field | Purpose |
|---|---|
| `key` | **Stable identifier.** End-user widgets and `starterCanvas` entries reference the template by `key`. Treat as effectively immutable — see lifecycle below. |
| `name` | Human-readable, shown to end users in the template picker. Cosmetic — safe to edit. |
| `description` | Human-readable subtitle in the template picker. Cosmetic — safe to edit. |
| `component` | Component name from the meta index (same as a regular widget's `component`). |
| `icon` | Icon name from the catalogue below. |
| `inputs` | Same shape as widget inputs, with two extra rules — see "Template inputs". |

### Template `key` lifecycle (critical)

- `key` is the only field with referential meaning. End-user-created widgets bind to it; `starterCanvas.widgets[].template` is the `key` value.
- **Changing or removing a `key` deletes every widget that references it** — both end-user widgets (in user state) and starter-canvas widgets in this YAML.
- Treat `key` as effectively immutable. Only change or remove a `key` after the user has explicitly acknowledged that all dependent widgets will be lost.
- When picking a `key` for a new template, choose something stable and intent-describing (e.g. `orders-by-date`), not a phrase the user might want to reword later.
- `name` and `description` are cosmetic and can be edited freely without consequence.

### Template inputs

Template inputs follow the same shape as widget inputs (see [widgets.md](widgets.md)) with two differences:

- **Required inputs are not required to be set.** Leaving a required input unset means end users will configure it themselves when they instantiate the template. Pre-filling it sets a default they can still change unless `visible: false` is also set.
- **`visible: false`** (optional) hides an input from the end-user configuration UI, locking the value to what you set.
- **`dataset` inputs are hidden by default** and **cannot** be set to `visible: true`.

## `customCanvas.starterCanvas`

A pre-populated custom canvas that every end user sees the first time they open the dashboard. Each entry references a template by `key` and lays out one widget instance.

```yaml
starterCanvas:
  widgets:
    - template: orders-by-date      # the KEY (not the name) of a template above
      position: { x: 0, y: 0 }
      dimensions: { width: 6, height: 8 }
      inputs: []                    # optional; overrides the template's input values
```

Always validate that every `template` value matches an existing template `key` in the same embeddable.

## Icon catalogue

Tabler-based icons:

`chart-bubble`, `chart-pie2`, `chart-donut4`, `table`, `world`, `chart-bar-popular`, `chart-area-line`, `graph`, `chart-radar`, `chart-treemap`

Custom icons:

`area`, `bubble-map`, `circular`, `comparison-line`, `date`, `funnel`, `grouped-line`, `histogram`, `horizontal-bar`, `horizontal-stacked-bar`, `kpi-number`, `kpi-text`, `pivot-table`, `scatter`, `single-line`, `text`, `vertical-bar`, `vertical-stacked-bar`, `waffle`, `dropdown`

Pick the icon that best fits the template's intent. If nothing matches well, reach for one of the generic ones (`graph`, `chart-bar-popular`, `chart-area-line`).
