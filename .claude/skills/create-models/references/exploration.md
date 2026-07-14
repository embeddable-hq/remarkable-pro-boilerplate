# Exploration reference

Two helper scripts wrap the builder API. The skill invokes them via `Bash`; never make raw HTTP calls directly.

Both scripts read the `embeddable:login` JWT from `~/.embeddable/credentials` and auto-detect the region from `embeddable.config.ts`.

---

## cube-schema-fetch.cjs

Two modes depending on whether `--connection` is supplied.

### Mode 1 — list connections (no --connection)

```bash
node src/embeddable.com/scripts/cube-schema-fetch.cjs
```

Output:
```json
{
  "workspaceId": "abc123",
  "connections": ["production-db", "analytics-db", "staging"]
}
```

Use this at the **start of the interview** to show the user which connections are available and ask them to pick one.

### Mode 2 — introspect schema (--connection)

```bash
# Full schema for a connection
node src/embeddable.com/scripts/cube-schema-fetch.cjs --connection my-db

# Limit to specific schemas
node src/embeddable.com/scripts/cube-schema-fetch.cjs --connection my-db --schemas public,analytics

# Override workspace
node src/embeddable.com/scripts/cube-schema-fetch.cjs --connection my-db --workspace <id>
```

Output:
```json
{
  "workspaceId": "abc123",
  "connection": "my-db",
  "schemas": [{ "name": "public", "label": "public" }],
  "tables": [
    {
      "schema": "public",
      "table": "orders",
      "columns": [
        { "name": "order_id", "type": "integer" },
        { "name": "customer_id", "type": "integer" },
        { "name": "status", "type": "varchar" },
        { "name": "amount", "type": "numeric" },
        { "name": "created_at", "type": "timestamp" }
      ]
    },
    {
      "schema": "public",
      "table": "customers",
      "columns": [...]
    }
  ]
}
```

Use this **after the user picks a connection** to get the full list of tables and columns. This replaces manual schema guessing — generate cube YAML directly from the column types returned here.

**Auth chain:** JWT → `GET /workspace/{id}/api-key` → API key used for `GET /api/v1/connections` and `/schemas`, `/tables`, `/columns`. This is transparent; just check the exit code.

---

## cube-explore-query.cjs

Runs a query against an **existing** Cube model. Requires `--cube` and `--query`.

Use this **after** generating and verifying `*.cube.yml` files — as a sanity check, not for schema discovery.

```bash
# Row count sanity check
node src/embeddable.com/scripts/cube-explore-query.cjs \
  --cube src/embeddable.com/models/cubes/orders.cube.yml \
  --query '{"measures":["orders.count"],"limit":1}'

# Check distinct values of an encoded column
node src/embeddable.com/scripts/cube-explore-query.cjs \
  --cube src/embeddable.com/models/cubes/orders.cube.yml \
  --query '{"dimensions":["orders.status"],"measures":["orders.count"],"limit":20,"order":[["orders.count","desc"]]}'

# Verify a calculated measure returns a plausible number
node src/embeddable.com/scripts/cube-explore-query.cjs \
  --cube src/embeddable.com/models/cubes/orders.cube.yml \
  --query '{"measures":["orders.total_revenue","orders.count"],"limit":1}'

# Override workspace
node src/embeddable.com/scripts/cube-explore-query.cjs \
  --cube src/embeddable.com/models/cubes/orders.cube.yml --workspace <id> \
  --query '{"measures":["orders.count"]}'
```

**`--cube`** is the path to a `*.cube.yml` file (e.g. `src/embeddable.com/models/cubes/orders.cube.yml`). The file is read and sent inline with the query.

**`--query`** is the `cubeQuery` object (Cube.js query format):

```json
{
  "measures":       ["cube.measure_name"],
  "dimensions":     ["cube.dimension_name"],
  "filters":        [{ "member": "cube.dim", "operator": "equals", "values": ["x"] }],
  "timeDimensions": [{ "dimension": "cube.date", "granularity": "month", "dateRange": "last 3 months" }],
  "order":          [["cube.count", "desc"]],
  "limit":          50
}
```

Output:
```json
{
  "workspaceId": "abc123",
  "cubeModel": "src/embeddable.com/models/cubes/orders.cube.yml",
  "cubeQuery": { ... },
  "result": {
    "data": [{ "orders.status": "complete", "orders.count": "1234" }],
    "total": 1
  }
}
```

---

## Skill workflow for using these scripts

### At session start

```bash
node src/embeddable.com/scripts/cube-schema-fetch.cjs
```

- **Success** → show the user the connection list, ask which one to use.
- **Exit 1** → switch to interview-only mode, mention it once.

### After user picks a connection

```bash
node src/embeddable.com/scripts/cube-schema-fetch.cjs --connection <chosen-name>
```

Read the returned tables and columns. Use them directly to:
- Propose which tables belong to the domain
- Generate dimension types (`string`, `number`, `time`, `boolean`) from SQL column types
- Identify PK candidates (columns named `*_id`, `id`)
- Identify FK candidates (columns that match a PK in another table)

**Column type mapping (SQL → Cube):**

| SQL type pattern | Cube type |
|-----------------|-----------|
| `int`, `integer`, `bigint`, `serial`, `numeric`, `decimal`, `float`, `double` | `number` |
| `varchar`, `text`, `char`, `uuid`, `enum` | `string` |
| `bool`, `boolean` | `boolean` |
| `timestamp`, `date`, `timestamptz`, `datetime` | `time` |

### After generating cube YAML (optional sanity check)

Use `cube-explore-query.cjs` to verify the models work before handing off:

```bash
# Quick row-count check
node src/embeddable.com/scripts/cube-explore-query.cjs \
  --cube src/embeddable.com/models/cubes/<cube_name>.cube.yml \
  --query '{"measures":["<cube_name>.count"],"limit":1}'
```

---

## Auth failure handling

Both scripts print a diagnostic on exit code 1:

```
[cube-schema-fetch] No login token found.
Run: npm run embeddable:login

[cube-schema-fetch] Token expired or invalid.
Run: npm run embeddable:login
```

When you see either: **mention it once** to the user:

> "I can't reach the live schema — run `npm run embeddable:login` to enable it. I'll continue from your answers."

Then proceed in interview-only mode for the rest of the session.
