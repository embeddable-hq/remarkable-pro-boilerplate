# Plan 01 — Rewrite CLAUDE.md Workflow to be KPI-First

## Goal
Replace the current schema-discovery-first workflow with a KPI/goal-first conversation flow so developers don't need to understand Cube.js or database concepts upfront.

---

## Tasks

### Task 1.1 — Audit the current CLAUDE.md workflow
- [ ] Read the full current CLAUDE.md
- [ ] Map each step of the current workflow (schema → tables → columns → generate)
- [ ] Identify every question that requires Cube.js knowledge to answer (e.g. "is this a fact table or lookup?")
- [ ] Document the friction points a non-Cube developer would hit

### Task 1.2 — Add connection selection as the first step
- [ ] Add instruction to CLAUDE.md: at the very start of any model generation session, run `connection-list.cjs` to list available connections
- [ ] Present the connection list to the user in plain language (name + type, not raw JSON)
- [ ] Ask: "Which connection do you want to model?" — only proceed once the user has chosen
- [ ] If only one connection exists, confirm it with the user rather than asking them to pick
- [ ] Update the workflow diagram in CLAUDE.md to show connection selection as Step 0

### Task 1.3 — Design the KPI-first conversation flow
- [ ] Define the opening question after connection is chosen: "What do you want to show on your dashboard?"
- [ ] Write a mapping from common KPI answers → likely fact tables / dimensions
  - e.g. "total revenue over time" → orders table, amount column, date column
  - e.g. "active users by region" → users table, region dimension, activity event
- [ ] Define how Claude should probe for: metrics (measures), breakdowns (dimensions), filters, and time ranges
- [ ] Define the fallback: if Claude can't infer tables from the KPI description, run introspection scripts and confirm with the user
- [ ] Write the revised step-by-step conversation script (as prose, not code)

### Task 1.4 — Design the KPI feasibility check
- [ ] Add a mandatory step in CLAUDE.md: after running `connection-columns.cjs` and before generating any model, Claude must assess whether the requested KPI is actually achievable from the available columns
- [ ] Define what makes a KPI infeasible:
  - The required metric column doesn't exist (e.g. user asks for "revenue" but no price/amount column is present)
  - The required dimension column doesn't exist (e.g. user asks to break down by country but no country/region column exists)
  - A required join is impossible (e.g. no shared key between the tables needed)
  - The required time dimension doesn't exist (e.g. user asks for a trend over time but no date/timestamp column exists)
- [ ] Define the response format when a KPI is infeasible:
  - State clearly: "This KPI cannot be built from the available data"
  - Explain specifically which column or relationship is missing and why it's needed
  - Suggest the closest alternative that *is* possible, if one exists (e.g. "There's no revenue column, but there is a `quantity` column — I could model total units sold instead")
  - Ask the user: do they want the alternative, or do they want to stop?
- [ ] Define partial feasibility: if only part of the KPI is achievable (e.g. the measure exists but the breakdown dimension doesn't), Claude should say so explicitly and offer to generate the partial model
- [ ] Add instruction: never silently skip a KPI or generate a model that doesn't answer what was asked

### Task 1.5 — Rewrite the workflow section of CLAUDE.md
- [ ] Replace "Workflow: Generating Cube Models from a Database Schema" section
- [ ] New flow: list connections → user picks connection → ask KPIs → infer tables → confirm → run introspection → **feasibility check** → generate (or explain why not)
- [ ] Update "Clarifying Questions to Ask Before Generating" to be KPI-oriented
- [ ] Keep the fallback path (schema-first) available for power users who prefer it

### Task 1.6 — Test the rewritten workflow
- [ ] Start a fresh Claude Code conversation
- [ ] Prompt: "Generate data models for my database" (no connection name given)
- [ ] Verify Claude runs `connection-list.cjs` and presents connections before anything else
- [ ] **Happy path test:** Prompt "I want to show total listens per artist over time" — verify Claude generates a valid model
- [ ] **Infeasible KPI test:** Prompt a KPI the Spotify schema cannot answer (e.g. "I want to show revenue per track") — verify Claude:
  - Does NOT generate a model silently
  - Explains which column is missing and why it's needed
  - Suggests the closest available alternative
- [ ] **Partial feasibility test:** Prompt a KPI where the measure exists but a breakdown dimension doesn't — verify Claude generates the partial model and explicitly flags what's missing
- [ ] Document what worked and what still felt schema-heavy

---

## Acceptance Criteria
- Claude always lists available connections and asks the user to choose before starting introspection
- A non-Cube developer can complete the full workflow by describing dashboard goals only
- No question in the opening flow requires knowledge of Cube.js concepts (fact tables, joins, pre-aggregations)
- When a KPI is infeasible, Claude explains exactly why with the specific missing column/relationship named
- When a KPI is partially feasible, Claude generates the partial model and flags what's missing
- Claude never silently generates a model that doesn't answer what was asked
- The fallback to schema-first is still available and documented
