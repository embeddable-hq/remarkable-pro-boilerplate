# AI Data Modeling — Standup Log

> Format for each entry:
> - **Date**
> - **Prompt/context changes made** — what did you change in CLAUDE.md or any plan file, and what effect did it have?
> - **Measurement improvements** — did scores go up? what changed in the rubric or test run?
> - **What we learned** — unexpected behaviour, new insight about the workflow or the agent
> - **Biggest challenge today** — what's the hardest thing in front of you right now?

---

## 2026-03-16

### Prompt / Context Changes
- None yet. This is the baseline session.
- Created CLAUDE.md with the original schema-first workflow (already in repo).
- Wrote `AI-DATA-MODELING-BASELINE.md` documenting known gaps.

### Measurement Improvements
- No measurements run yet. Ground-truth Spotify models not yet written.
- Baseline rubric not yet defined — that's Plan 03, Task 3.2.

### What We Learned
- The current workflow is schema-first: it asks "which schemas? which tables?" before understanding what the developer wants to build. This requires Cube.js knowledge from the developer upfront.
- The spec intention was KPI-first: start with "what do you want to show?" and infer tables from that.
- Post-generation narration is completely missing from CLAUDE.md — Claude generates files silently.
- Two file extension values are in conflict: `.cube.yaml` (CLAUDE.md) vs `.cube.yml` (spec doc).

### Biggest Challenge Today
- Defining what "KPI-first" actually looks like as a concrete conversation flow (Plan 01, Task 1.2). The mapping from a business KPI to a likely set of database tables requires either a lookup/heuristic or a two-pass approach (ask KPI → then still do introspection to confirm).

---

## Template for Next Entry

```
## YYYY-MM-DD

### Prompt / Context Changes
-

### Measurement Improvements
-

### What We Learned
-

### Biggest Challenge Today
-
```

---

## Plan Status Overview

| Plan | Title | Status |
|------|-------|--------|
| Plan 01 | KPI-First Workflow | 🔲 Not started |
| Plan 02 | Post-Generation Narration | 🔲 Not started |
| Plan 03 | Quality Measurement Baseline | 🔲 Not started |
| Plan 04 | File Extension & Conventions | 🔲 Not started |

> Update status to: 🔲 Not started → 🟡 In progress → ✅ Done

---

## Task Completion Log

> When a task checkbox is marked done, log it here with the date and a one-line note on what changed.

| Date | Plan | Task | Note |
|------|------|------|------|
| — | — | — | — |
