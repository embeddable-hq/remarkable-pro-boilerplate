# AI Data Model Generation — Implementation Notes

## Goal

Enable any developer to go from a connected database to working Cube.js data models without needing to understand Cube.js upfront or read documentation first.

A conversational agent (Claude Code) guides the developer through the process from inside the boilerplate repo.

---

## What's Been Built

### 1. CLAUDE.md — Agent Instructions

`CLAUDE.md` in the repo root is read by Claude Code at the start of every conversation. It defines:

- The 3-step DB introspection workflow
- Clarifying questions to ask before generating models
- Model generation rules (file naming, structure, RLS, joins, time dimensions)
- General guidelines (never guess, explain what's built)

This is the core "prompt" — changing this file changes how the agent behaves.

### 2. Database Introspection Scripts

Node.js scripts that call the Embeddable API to discover the connected database schema. The API proxies to the actual DB so credentials never leave the Embeddable platform.

| Script | Purpose |
|--------|---------|
| `connection-schemas.cjs` | List available schemas in a connection |
| `connection-tables.cjs` | List tables for given schemas |
| `connection-columns.cjs` | Get columns, types, and foreign keys for given tables |
| `connection-list.cjs` | List all connections in the workspace |
| `connection-read.cjs` | Read a single connection's details |
| `connection-create.cjs` | Create a new DB connection |
| `connection-update.cjs` | Update an existing connection |
| `connection-delete.cjs` | Delete a connection |
| `connection-test.cjs` | Test if a connection is reachable |

All scripts read `API_KEY` and `BASE_URL` from `.env`.

### 3. JSON Response Schemas

Documentation of the API response shapes, used by Claude to understand the script output:

- `schemas/db_schemas.json`
- `schemas/db_tables.json`
- `schemas/db_columns.json`

---

## How It Works End-to-End

```
Developer: "Generate data models for my database"
    ↓
Claude reads CLAUDE.md workflow
    ↓
Runs connection-schemas.cjs → shows available schemas → asks which to use
    ↓
Runs connection-tables.cjs → shows tables → asks which to model
    ↓
Runs connection-columns.cjs → gets columns + foreign keys (auto-detected)
    ↓
Asks clarifying questions (KPIs, joins, RLS, time dimensions)
    ↓
Generates .cube.yaml files directly in src/embeddable.com/models/
    ↓
Developer runs npm run embeddable:push → models live in workspace
```

---

## Tested Against

| Connection | Schema | Tables | Result |
|------------|--------|--------|--------|
| `default` (Heroku Postgres) | `spotify` | artists, tracks, daily_listens | ✅ Schemas/tables/columns returned correctly |

---

## Known Gaps

### 1. Schema-first vs KPI-first
**Current:** workflow starts with schema discovery (which schemas? which tables?)
**Should be:** start with "what do you want to show on your dashboard?" and work backwards
The spec says developers shouldn't need to understand Cube.js upfront — but asking about fact tables vs lookup tables requires that knowledge.

### 2. No post-generation explanation
The spec says *"the agent should explain what it builds — not just generate files silently"*.
CLAUDE.md currently has no instruction to narrate what was generated and why.

### 3. No measurement baseline yet
Quality criteria from the spec:
- Proximity to ground truth (compare against hand-written models)
- KPI coverage (run queries for each requested KPI, verify results)
- Model correctness (do generated files pass Cube validation?)
- Human review score

None of these have been run yet. The Spotify schema (`default` connection) is a good candidate for the first baseline test.

### 4. File extension inconsistency
CLAUDE.md says `.cube.yaml`, the spec says `.cube.yml`. Minor but should be aligned.

---

## Open Questions

- How much should the agent explain vs. just generate — what's the right balance for a developer audience?
- Is there a standalone prototype with better prompts worth reusing? Can we match its UX without it being a standalone app?

---

## Setup

1. Copy `.env.example` to `.env` (or create `.env`):
```
API_KEY=your_embeddable_api_key
BASE_URL=https://api.eu.embeddable.com  # or api.us.embeddable.com
```

2. Authenticate the CLI:
```bash
npm run embeddable:login
```

3. Start a conversation with Claude Code and say:
*"Generate data models for my database"*

---

## Next Steps

- [ ] Rewrite CLAUDE.md workflow to be KPI-first
- [ ] Add post-generation explanation instruction to CLAUDE.md
- [ ] Run first quality measurement against Spotify schema
- [ ] Review standalone prototype for reusable prompts/patterns
