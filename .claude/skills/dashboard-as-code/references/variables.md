# Variables

Dashboard-scoped reactive values. Updated by widget events; consumed by datasets (and optionally widget inputs) for live filtering.

## Shape

```yaml
variables:
  - name: date-range          # unique within the embeddable
    type: timeRange            # see "Built-in types" below
    array: false               # optional; defaults to false
    defaultValue:              # optional; shape depends on type
      relativeTimeString: 'Last 30 days'
```

## Built-in types

| Type | Use for | Value shape |
|---|---|---|
| `string` | text values | literal string |
| `number` | numeric values | literal number |
| `boolean` | flags | `true` / `false` |
| `time` | a single point in time | `{ date?: Date, relativeTimeString?: string }` |
| `timeRange` | a date range | `{ from?: Date, to?: Date, relativeTimeString?: string }` |
| `granularity` | grouping for time dimensions (`day`, `week`, `month`, …) | literal string |
| `dimension` | a Cube dimension reference | qualified `<cube>.<dimension>` string |
| `measure` | a Cube measure reference | qualified `<cube>.<measure>` string |
| `dimensionOrMeasure` | either of the above | qualified string |

(Custom variable types exist but are out of scope for this skill.)

## `array: true`

When `true`, the variable holds a list. Common pattern: a multi-select component drives a `string[]` of country codes that a dataset filter consumes via `equals` (= SQL `IN`) or `notEquals` (= SQL `NOT IN`).

## `defaultValue`

Optional. The value shape must match `type` (and respect `array`).

For `time` and `timeRange` defaults, prefer `relativeTimeString` over absolute dates so dashboards stay accurate as time passes:

```yaml
defaultValue: { relativeTimeString: 'Last 30 days' }
```

## The `noFilter` rule

If `defaultValue` is omitted **and** no event has set the variable, Embeddable treats it as "no filter": any dataset filter referencing this variable is dropped from the query, so the dataset returns the unfiltered result. The same applies to widget inputs bound to the variable — they fall back to no value.

Many components can reset the variable they drive (firing a `noFilter`-typed event), giving the user a "clear" control without removing the filter from the YAML.

## Type compatibility

- An input bound `valueType: VARIABLE` must reference a variable whose `type` matches the input's `inputType` (and `array` flag where applicable).
- An event property feeding a variable via `SET_VARIABLE` must have the same `type` as the variable.

These mismatches are usually caught at validation time and surface in the dev events log.
