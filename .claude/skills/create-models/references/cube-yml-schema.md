# Cube YAML schema reference

Files live at `src/embeddable.com/models/cubes/<name>.cube.yml` and `src/embeddable.com/models/views/<name>.cube.yml`.

> **View files must use `.cube.yml`, not `.view.yml`.** The SDK only scans `*.cube.yml` / `*.cube.yaml` for data models — `.view.yml` files are silently ignored. The sdk-react validator also rejects the `cubes:` key in any non-`.cube.yml` file, so a `.view.yml` containing `cubes:` causes a build error.

## Cube skeleton

```yaml
cubes:
  - name: orders               # snake_case, matches SQL table name by convention
    title: Orders              # Optional; shown in the no-code builder
    description: ...           # Optional; documentation only
    sql_table: schema.orders   # Fully qualified table name, or use `sql:` for a subquery

    joins:
      - name: customers        # Must match the target cube's `name`
        sql: "{CUBE}.customer_id = {customers}.customer_id"
        relationship: many_to_one   # many_to_one | one_to_many | one_to_one

    dimensions:
      - name: order_id
        sql: order_id
        type: string
        primary_key: true
        public: false          # hide from builder but keep for joins

      - name: status
        sql: status
        type: string
        title: Order Status

    measures:
      - name: count
        type: count
        title: "# Orders"

      - name: total_revenue
        sql: amount
        type: sum
        title: Revenue (USD)
```

## Dimension types

| Type | Notes |
|------|-------|
| `string` | Default for text columns |
| `number` | Numeric column (not aggregated — use a measure for that) |
| `boolean` | `true`/`false` |
| `time` | Timestamp or date; required for time-based filters and `timeDimensions` in queries |

## Measure types

| Type | Requires `sql`? | Notes |
|------|-----------------|-------|
| `count` | No | Row count |
| `count_distinct` | Yes | `sql: column_name` |
| `sum` | Yes | |
| `avg` | Yes | |
| `min` / `max` | Yes | |
| `number` | Yes | Fully custom expression; can reference other measures with `{measure_name}` |

## Calculated dimensions and measures

```yaml
# Calculated dimension (transform at read time)
- name: duration_minutes
  sql: "ROUND(duration_ms::numeric / 60000.0, 2)"
  type: number

# Calculated measure referencing another measure
- name: revenue_per_order
  sql: "{total_revenue} / NULLIF({count}, 0)"
  type: number

# CASE expression as a dimension
- name: tier
  sql: >
    CASE
      WHEN amount >= 1000 THEN 'Enterprise'
      WHEN amount >= 100  THEN 'Mid-market'
      ELSE 'SMB'
    END
  type: string
```

## Joins

- Declare joins on the **fact** side (the "many" table in a many-to-one).
- A cube can join to multiple other cubes.
- Joins are transitive in queries: `orders` → `customers` → `regions` works.
- `{CUBE}` refers to the current cube in the SQL expression.

```yaml
joins:
  - name: customers
    sql: "{CUBE}.customer_id = {customers}.customer_id"
    relationship: many_to_one

  - name: order_items
    sql: "{CUBE}.order_id = {order_items}.order_id"
    relationship: one_to_many
```

## `public` flag

```yaml
- name: internal_id
  sql: id
  type: number
  primary_key: true
  public: false   # hidden from the no-code builder, still usable in joins/measures
```

## `meta` overrides (for the builder UI)

```yaml
- name: revenue
  sql: amount
  type: sum
  meta:
    currency: 'USD'
    decimalPlaces: 2
    format: 'currency'   # hint to chart components
```

## Using a subquery instead of a table

```yaml
cubes:
  - name: active_users
    sql: >
      SELECT *
      FROM users
      WHERE status = 'active'
```

## Views

Views expose a denormalized surface that joins multiple cubes — easier for dashboard authors than navigating raw cubes.

```yaml
# src/embeddable.com/models/views/orders_view.cube.yml  ← must be .cube.yml
views:
  - name: orders_view
    title: Orders (full)

    cubes:
      - join_path: orders          # starting cube
        includes:
          - status
          - created_at
          - count
          - total_revenue

      - join_path: orders.customers   # traverses the join declared in `orders`
        includes:
          - name
          - country
          - tier
```

### `includes` options

```yaml
# Include everything from a cube
- join_path: orders
  includes: "*"

# Exclude specific members
- join_path: orders
  includes: "*"
  excludes:
    - internal_id

# Rename a member in the view
- join_path: orders
  includes:
    - name: total_revenue
      alias: revenue
```

## Common pitfalls

- **Missing `primary_key`**: Cube will throw an error if no PK is defined. Every cube needs one, even if `public: false`.
- **Wrong join direction**: Declare `many_to_one` joins on the fact table, not the dimension table.
- **Referencing un-joined cubes**: You can only use dimensions/measures from cubes that are connected through declared joins.
- **`type: number` dimension vs. measure**: A `number` dimension is a column value; a measure of type `sum`/`avg`/etc. is an aggregation. Don't use a dimension where you need aggregation.
