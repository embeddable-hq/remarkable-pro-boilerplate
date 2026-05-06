# Datasets

A `dataset` declares a data source that one or more widgets consume to render charts. Each dataset is built on top of a Cube model and may carry filters (static or driven by variables).

## Shape

```yaml
datasets:
  - name: Orders                    # unique within this embeddable; user-facing
    model: orders                   # the Cube model name (matches a *.cube.yml under src/embeddable.com/models/cubes/)
    filters:
      - member: orders.created_at
        operator: inDateRange
        value: date-range           # variable name when valueType: VARIABLE
        valueType: VARIABLE
```

## Naming

- `name` is unique within an embeddable.
- It is user-facing: builders see it in the no-code UI, and in the custom canvas end users see it too. Keep it short and descriptive (`Orders`, `Active customers`, `Revenue by region`).

## Filters

Each filter applies a Cube member-level constraint when fetching data.

| Field | Meaning |
|---|---|
| `member` | Qualified Cube member name (`<cube>.<dimension>` or `<cube>.<measure>`). Must exist in `model` or in a cube joined to `model`. |
| `operator` | One of the operators below. |
| `value` | A literal (when `valueType: VALUE`) or the name of a variable (when `valueType: VARIABLE`). Omit entirely for `set` / `notSet`. |
| `valueType` | `VALUE` (use the literal in `value`) or `VARIABLE` (look up the variable named in `value`). |

## Operator catalogue

| Operator | Applies to | Notes |
|---|---|---|
| `equals`, `notEquals` | any type | With an `array: true` variable, behaves like SQL `IN` / `NOT IN`. |
| `contains`, `notContains`, `startsWith`, `endsWith` | string dimensions | Will fail at query time on non-string members. |
| `gt`, `gte`, `lt`, `lte` | number dimensions/measures | Will fail at query time on non-number members. |
| `set`, `notSet` | any type | No `value` field — equivalent to `IS NOT NULL` / `IS NULL`. |
| `inDateRange`, `notInDateRange` | time dimensions | `value` is a `timeRange` literal or a `timeRange` variable. |
| `beforeDate`, `afterDate` | time dimensions | `value` is a `time` literal or a `time` variable. |

Always cross-check the member's type in the relevant `*.cube.yml` before picking an operator.

## VARIABLE filters and the `noFilter` rule

When a filter's `valueType` is `VARIABLE` and the referenced variable currently has no value (no `defaultValue` declared and nothing has set it), Embeddable omits that filter from the query entirely. This is the `noFilter` semantics — see [variables.md](variables.md).
