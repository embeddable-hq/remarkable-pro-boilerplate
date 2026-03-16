# Plan 03 — Run First Quality Measurement Against Spotify Schema

## Goal
Establish a measurable quality baseline by checking whether Claude-generated models are syntactically correct, structurally valid Cube.js YAML, and actually answer the KPIs the user asked for. No comparison against hand-written ground truth — correctness is determined by validation tools and real query results.

---

## Tasks

### Task 3.1 — Define the quality scoring rubric
- [ ] **Syntax score** — does the generated YAML parse without errors? (run `embeddable:push` and capture output)
- [ ] **KPI coverage score** — for each KPI the user stated, does a query in the embeddable.com UI return a valid, non-empty result?
  - KPI 1: "Total listens per artist this month"
  - KPI 2: "Top 10 tracks by average listen duration"
  - KPI 3: "Daily listen trend over the last 30 days"
- [ ] **Completeness score** — does each generated cube include: at least one measure, at least one dimension, a time dimension (if a date column exists), and a description on the cube itself?
- [ ] **Feasibility check score** — when given an infeasible KPI, does Claude correctly refuse to generate a model, name the missing column/relationship, and suggest an alternative? (pass/fail)
- [ ] **Human review score** — 1–5 scale: are the measure/dimension names and descriptions clear enough for a business user in the embeddable.com UI?
- [ ] Document the rubric in `plans/quality-rubric.md`

### Task 3.2 — Run the AI-generated model workflow
- [ ] Start a fresh Claude Code conversation
- [ ] Prompt: "Generate data models for my database" (no connection name — verify Claude lists connections first per Plan 01)
- [ ] Select the `default` Heroku Postgres connection and the `spotify` schema
- [ ] State the 3 KPIs from Task 3.1 during the conversation
- [ ] Also state one intentionally infeasible KPI (e.g. "revenue per track" — no revenue column in Spotify schema) to test the feasibility check
- [ ] Save the generated `.cube.yaml` files to `src/embeddable.com/models/generated-run-01/`
- [ ] Record the full conversation transcript in `plans/run-01-transcript.md`

### Task 3.3 — Validate syntax and structure
- [ ] Run `npm run embeddable:push` on the generated models
- [ ] Record: pass / fail, and any validation errors with the exact error messages
- [ ] For any validation errors: note which cube/member caused the error and what was wrong
- [ ] Re-run after fixing errors (if any) to confirm they're resolved — record how many fix iterations were needed

### Task 3.4 — Validate KPI coverage
- [ ] Open the embeddable.com UI and run each of the 3 KPI queries
- [ ] Record: does each query return results? Are the numbers plausible?
- [ ] For any query that returns no results or an error: capture the error and note which model member was missing or wrong

### Task 3.5 — Score and document findings
- [ ] Fill in all scores from Task 3.1 rubric based on Tasks 3.3 and 3.4
- [ ] Record all scores in `plans/quality-scores.md`
- [ ] Write a findings summary: what did the agent get right, what did it miss?
- [ ] Set target scores to aim for after Plan 01 (KPI-first) and Plan 02 (narration) are implemented
- [ ] Commit scores as the reference baseline for all future runs

---

## Acceptance Criteria
- Generated models pass `embeddable:push` with zero errors (or errors are documented and understood)
- All 3 KPI queries return valid results in the embeddable.com UI
- Every generated cube has a measure, a dimension, and a description
- Claude correctly handles the infeasible KPI test (no silent model generation, clear explanation, alternative offered)
- Scores are recorded and committed as the baseline
