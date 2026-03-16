# Plan 02 — Add Post-Generation Explanation to CLAUDE.md

## Goal
After generating `.cube.yaml` files, Claude should explain what it built and why — not just silently drop files. The explanation should be clear to a developer who has never used Cube.js.

---

## Tasks

### Task 2.1 — Define what a good post-generation explanation looks like
- [ ] Review the baseline doc's spec quote: "the agent should explain what it builds — not just generate files silently"
- [ ] Write an example of a good explanation for the Spotify schema (what cube was created, what each measure/dimension does, why joins were modelled a certain way)
- [ ] Identify the key elements every explanation must include:
  - [ ] Which files were created and where
  - [ ] What each cube represents in business terms
  - [ ] What the key measures are and what they calculate
  - [ ] What the key dimensions are and how they slice data
  - [ ] Any joins modelled and the relationship direction
  - [ ] Any RLS applied and what it restricts
  - [ ] How to push models: `npm run embeddable:push`

### Task 2.2 — Write the post-generation instruction block for CLAUDE.md
- [ ] Add a new section: "After Generating Models"
- [ ] Instruction: after all `.cube.yaml` files are written, produce a structured summary using the elements from Task 2.1
- [ ] Instruction: use plain business language — avoid Cube.js jargon in the summary
- [ ] Instruction: if multiple cubes were generated, group the summary by cube
- [ ] Instruction: end with the push command and a note about testing in the embeddable.com UI

### Task 2.3 — Add instruction to explain model decisions
- [ ] Add instruction: explain *why* a column was made a measure vs dimension (e.g. "duration_ms is a measure because it makes sense to sum/average it")
- [ ] Add instruction: if a calculated member was created, explain the formula in plain English
- [ ] Add instruction: if a column was intentionally excluded (e.g. internal IDs), say so

### Task 2.4 — Test the narration quality
- [ ] Run the full workflow on the Spotify schema
- [ ] Evaluate the post-generation explanation against the checklist from Task 2.1
- [ ] Check: would a developer new to Cube.js understand what was built?
- [ ] Note any missing context or jargon that crept in

---

## Acceptance Criteria
- Every model generation session ends with a structured explanation
- The explanation is readable by someone with no Cube.js background
- Decisions (measure vs dimension, join direction, exclusions) are narrated with reasoning
- Developer knows exactly what command to run next
