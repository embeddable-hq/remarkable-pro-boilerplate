# Project Overview

This repository contains two main parts:
- **React components** embeddable into [embeddable.com](https://embeddable.com) dashboards
- **Cube.js data models** used as the semantic layer for embedded analytics

---

## Part 1: Cube.js Data Models

### File Conventions

- All Cube model files **must** be in YAML format
- File names **must** follow the pattern: `{some_name}.cube.yaml`
- Place model files in the appropriate models directory

### Security Context

At query time, a `security_context` is injected and available via `COMPILE_CONTEXT`. Use it for Row-Level Security (RLS) and Member-Level Security when needed.

Example of RLS using security context:

```yaml
cubes:
  - name: customers
    sql: >
      SELECT *
      FROM public.customers
      WHERE country = '{COMPILE_CONTEXT.securityContext.country}'
```

Refer to Cube.js docs for full details:
- [Data Modeling Concepts](https://cube.dev/docs/product/data-modeling/concepts)
- [Calculated Members](https://cube.dev/docs/product/data-modeling/concepts/calculated-members)
- [Working with Joins](https://cube.dev/docs/product/data-modeling/concepts/working-with-joins)
- [Calendar Cubes](https://cube.dev/docs/product/data-modeling/concepts/calendar-cubes)
- [Data Blending](https://cube.dev/docs/product/data-modeling/concepts/data-blending)
- [Row-Level Security](https://cube.dev/docs/product/auth/row-level-security)
- [Member-Level Security](https://cube.dev/docs/product/auth/member-level-security)
- [Auth Context](https://cube.dev/docs/product/auth/context)
- [Security Context Config Reference](https://cube.dev/docs/product/configuration/reference/config#securitycontext)

---

## Part 2: Database Schema Discovery Scripts

Use these Node.js scripts to introspect the database before generating Cube models.
JSON response schemas for each script are in `src/embeddable.com/schemas/`.

### Step 1 — Get available schemas

```bash
node src/embeddable.com/scripts/connection-schemas.cjs <connection_name>
```

Response schema: `src/embeddable.com/schemas/db_schemas.json`

> ⚠️ Always ask the user for the `connection_name` if they haven't provided it.

---

### Step 2 — Get tables for selected schemas

```bash
# Pass schemas as a JSON array file
node src/embeddable.com/scripts/connection-tables.cjs <connection_name> schemas.json

# Or pipe inline
echo '["schema_1", "schema_2"]' | node src/embeddable.com/scripts/connection-tables.cjs <connection_name> -
```

Response schema: `src/embeddable.com/schemas/db_tables.json`

---

### Step 3 — Get columns for selected tables

Pass the list of tables **in the same format as the output from Step 2** (as described in `src/embeddable.com/schemas/db_tables.json`).

```bash
node src/embeddable.com/scripts/connection-columns.cjs <connection_name> tables.json

# Or pipe
cat tables.json | node src/embeddable.com/scripts/connection-columns.cjs <connection_name> -
```

Response schema: `src/embeddable.com/schemas/db_columns.json`

---

## Workflow: Generating Cube Models from a Database Schema

Follow this sequence when a user asks to generate Cube models:

1. **Ask for connection name** if not already provided
2. **Run `connection-schemas.cjs`** → show available schemas → ask which schemas to use
3. **Run `connection-tables.cjs`** with selected schemas → show available tables → ask which tables to model
4. **Run `connection-columns.cjs`** with selected tables → inspect column types and names
5. **Ask clarifying questions before generating** (see below)
6. **Generate `.cube.yaml` files** one per logical cube (usually one per table, or grouped by domain)

### Clarifying Questions to Ask Before Generating

Always ask the user the following before generating models — don't guess:

- **What is the business purpose of each table?** (e.g. "is `orders` a fact table or a lookup?")
- **Which columns should be measures vs dimensions?** Ask if it's not obvious from column names/types
- **Are there foreign key relationships between tables?** Ask which joins to model
- **Should Row-Level Security be applied?** If yes, which `securityContext` fields are available and which columns to filter on
- **Should Member-Level Security be applied?** (hide certain measures/dimensions from some roles)
- **Are there calculated members needed?** (e.g. revenue = price * quantity)
- **Is there a date/time column to use as the primary time dimension?**
- **Will these models be used for a specific type of dashboard?** (e.g. sales, marketing, finance) — helps suggest useful pre-aggregations or granularities

### Model Generation Rules

- One `.cube.yaml` file per logical cube
- Always include a `sql_table` or `sql` property
- Always define at least one `time_dimension` if a date/timestamp column exists
- Use `security_context` for RLS only when the user confirms it's needed
- Prefer explicit joins over implicit ones
- Add `description` fields to cubes, measures, and dimensions — these appear in embeddable.com UI
- Use snake_case for cube and member names

---

## Part 3: React Components (embeddable.com)

Components live in `src/embeddable.com/` and are designed to be embedded in [embeddable.com](https://embeddable.com) dashboards.

When working on components:
- Each component connects to Cube.js via embeddable.com's data binding system
- Changes to Cube models may affect existing components — check for breaking changes in measure/dimension names
- Components are self-contained and should not share global state

---

## General Guidelines

- **Never guess** — always ask the user for missing information (connection name, schema selection, join logic, RLS requirements)
- **Analyze before generating** — read the column names and types carefully, infer likely business meaning, then ask for confirmation
- **Think about the dashboard use case** — these models power embedded analytics, so think in terms of what metrics and dimensions a business user would want to explore
- **Keep models clean** — avoid exposing raw technical columns (IDs, internal flags) as dimensions unless asked
