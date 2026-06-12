---
name: cube-model-generation
description: Use when the user wants to generate, scaffold, or edit Cube data models — `*.cube.yml` files and starter views under `src/embeddable.com/models/`. Triggers on phrases like "generate a cube model", "model my database", "create a cube for", "add a data model", "write cube YAML", "introspect my schema", or any direct work on `*.cube.yml` files.
---

# Cube model generation

Interview the user to understand their database schema, generate `*.cube.yml` cubes and at least one starter view per domain, and persist business context for future sessions.

**Scope one domain at a time.** A domain is a logical cluster of related tables (e.g. "orders + order_items + customers", or "analytics events"). Stop after each domain and instruct the user to verify in `embeddable:dev` before continuing.

## File locations

| File type | Path |
|-----------|------|
| Cubes | `src/embeddable.com/models/cubes/<name>.cube.yml` |
| Views | `src/embeddable.com/models/views/<name>.cube.yml` (must be `.cube.yml`, not `.view.yml`) |
| Business context notes | `.claude/notes/cube-models/<domain>.md` (gitignored) |

The `notes` directory is gitignored — write freely without committing.

## Two operating modes

**Check auth first.** Run the schema fetch script at the start of every session:

```bash
node src/embeddable.com/scripts/cube-schema-fetch.cjs
```

| Outcome | Mode |
|---------|------|
| Success (prints connection list) | **Interview + schema** — list connections, ask user to pick one, then fetch the DB schema for that connection to inform generation |
| Exit 1 (`No login token` or `Token expired`) | **Interview-only** — inform the user once: *"I can't reach the live schema — run `npm run embeddable:login` to enable it. I'll continue from your answers."* Then proceed without scripts. |

Never repeat the auth warning after the first mention.

## Workflow

### 1. Load existing context
- Read any matching note from `.claude/notes/cube-models/` for the domain if it exists.
- Run `cube-schema-fetch.cjs` (no flags) to check auth.
  - If the response contains `action: "choose_workspace"`: **stop and ask the user which workspace to use** — never pick one automatically. Show the full list. Then re-run with `--workspace <id>` once they've chosen.
  - If the response contains a `connections` list: show it and ask which connection to use, then run `cube-schema-fetch.cjs --connection <name> --workspace <id>` to get tables and columns.
  - On exit 1: switch to interview-only mode (warn once).
- Pass `--workspace <id>` on every subsequent script call in the session once a workspace is chosen.
- Read all existing `*.cube.yml` files in `src/embeddable.com/models/cubes/` — don't regenerate what's already there.

### 2. Choose domain
Ask: *"Which domain or set of tables would you like to model?"*

When schema is available, propose tables that aren't yet modeled and let the user confirm the scope. If the user isn't sure, suggest grouping by entity (e.g. "the orders cluster" or "the user events tables").

### 3. Interview

Work through the questions in [references/interview-guide.md](references/interview-guide.md). Don't dump all questions at once — group by topic and wait for answers.

When schema is available, many structural questions answer themselves from the column list:
- Table names, column names, SQL types → already known
- PK candidates (`*_id`, `id` columns) → suggest, user confirms
- FK candidates (matching column names across tables) → suggest, user confirms

The interview then focuses on **business context** that the schema can't provide:
- What does each entity mean to the business?
- Which measures matter? (counts, sums, calculated fields)
- Are any column values encoded? (e.g. `status = 1/2/3`, `gender = 'm'/'f'`)
- What should be hidden from dashboard authors?
- What business names should cryptic columns get?

**When the user expresses uncertainty** ("I don't know", "check yourself", "I have no idea"), don't just proceed with inference — proactively offer to query the live data: *"I can look at the actual data to figure that out — want me to check sample values / distinct values for [column]?"* Then use `cube-explore-query.cjs` to answer the question directly. This is the right moment for exploration, not a last resort.

In interview-only mode, ask the full question set from the guide.

### 4. Generate

Produce files in this order:
1. One `*.cube.yml` per table in the domain
2. One `*.cube.yml` starter view (in `models/views/`) that joins all tables in the domain into a single denormalized surface

Use [references/cube-yml-schema.md](references/cube-yml-schema.md) for the YAML syntax.
Use the examples in [examples/](examples/) as scaffolding.

**Generation rules:**
- Every cube needs a `primary_key: true` dimension.
- `public: false` on primary keys hides them from the no-code builder but keeps them usable for joins.
- Joins are declared on the **fact** side (many-to-one goes in the fact cube).
- Denormalized views use `includes` to pull from multiple cubes — don't re-specify dimensions manually.
- Don't invent column names. If a column name isn't confirmed by the schema fetch or the user, ask.

### 5. Persist context

Write (or update) `.claude/notes/cube-models/<domain>.md` with:
- Table names and their business purpose
- Modeling decisions made and why
- Any open questions or known limitations
- Connection name used

See note format at [references/interview-guide.md#notes-format](references/interview-guide.md#notes-format).

### 6. Stop and hand off

After writing files, output:

```
Generated:
  src/embeddable.com/models/cubes/<cube>.cube.yml  (× N)
  src/embeddable.com/models/views/<view>.cube.yml

Next step: verify in embeddable:dev
  1. Start the dev server: npm run dev
  2. Open the no-code builder and navigate to Data Models
  3. Confirm dimensions and measures appear correctly
  4. Run a test query from the builder to check row counts / values

Once verified, come back and we can model the next domain or add presets / dashboards.
```

**Do not run `embeddable:push` or `embeddable:dev`.** Both are the user's call (see root CLAUDE.md).

## Exploration — last resort only

After schema fetch and the interview, there may still be questions the available information can't answer. At that point — and only then — use `cube-explore-query.cjs` to run a targeted query against the live data.

**Trigger conditions (examples):**
- Column values are encoded and the user doesn't know the codes → run a distinct-values query
- A FK relationship looks plausible from column names but isn't confirmed → run a join count to check for nulls
- A generated measure looks off and you want to sanity-check the number → run a single-row aggregate

```bash
# Distinct values of an encoded column
node src/embeddable.com/scripts/cube-explore-query.cjs \
  --connection <name> --cube <cube_name> \
  --query '{"dimensions":["<cube>.status"],"measures":["<cube>.count"],"limit":20}'

# Row-count sanity check
node src/embeddable.com/scripts/cube-explore-query.cjs \
  --connection <name> --cube <cube_name> \
  --query '{"measures":["<cube>.count"],"limit":1}'
```

See [references/exploration.md](references/exploration.md) for the full query format and more examples.

**This step is not routine.** Most sessions will not need it. Schema + interview is sufficient for the vast majority of models.

## Partial edits

When the user asks to modify an existing cube (add a dimension, fix a measure, rename a field):
1. Read the current file before editing.
2. Make only the requested change — don't rewrite unrelated cubes.
3. Update the domain note to record the change.
4. Remind the user to re-verify in `embeddable:dev`.

## Reference index

- [references/cube-yml-schema.md](references/cube-yml-schema.md) — YAML syntax, all field types, join relationships, meta overrides.
- [references/interview-guide.md](references/interview-guide.md) — the full question list and note format.
- [references/exploration.md](references/exploration.md) — how to invoke the helper scripts and interpret results.

## Examples

Read these when scaffolding:

- [examples/single-table.cube.yml](examples/single-table.cube.yml) — minimal cube with no joins.
- [examples/with-joins.cube.yml](examples/with-joins.cube.yml) — fact + dimension cubes with relationships.
- [examples/starter-view.cube.yml](examples/starter-view.cube.yml) — denormalized view using `includes`.

## Out of scope

- Custom components, theming, presets, or dashboard layout — separate skills cover those.
- Cube.js features not supported by Embeddable (pre-aggregations, segments, multi-tenancy beyond `securityContext`).
