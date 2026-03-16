# Plan 04 — Fix File Extension Inconsistency and Audit Conventions

## Goal
Align `.cube.yaml` vs `.cube.yml` across CLAUDE.md, scripts, generated models, and any documentation. Also audit for other convention inconsistencies found during implementation.

---

## Tasks

### Task 4.1 — Audit all references to file extensions
- [ ] Search CLAUDE.md for `.cube.yaml` and `.cube.yml` — note every occurrence
- [ ] Search all scripts in `src/embeddable.com/scripts/` for hardcoded extensions
- [ ] Search all existing model files for their actual extension in use
- [ ] Search the Embeddable platform docs / spec doc to confirm which extension is canonical
- [ ] Check `AI-DATA-MODELING-BASELINE.md` — it flags `.cube.yml` as the spec preference
- [ ] Decide: use `.cube.yaml` (CLAUDE.md) or `.cube.yml` (spec) — document the decision

### Task 4.2 — Apply the chosen extension consistently
- [ ] Update CLAUDE.md to use the chosen extension everywhere
- [ ] Rename any existing model files to use the chosen extension
- [ ] Update any scripts that reference a specific extension
- [ ] Update plan files (plans 01–03) if they reference file extensions

### Task 4.3 — Audit for other naming and convention inconsistencies
- [ ] Check that all cube names in generated models use `snake_case` (per CLAUDE.md rule)
- [ ] Check that all measure and dimension names use `snake_case`
- [ ] Verify `sql_table` vs `sql` usage is consistent with Cube.js YAML spec
- [ ] Verify `time_dimension` field name matches what Cube.js YAML actually expects (check docs)
- [ ] Check that `description` fields are present on cubes, measures, and dimensions in all generated models

### Task 4.4 — Add a conventions linting step to the workflow
- [ ] Add a CLAUDE.md instruction: after generating models, do a self-check for:
  - [ ] Correct file extension
  - [ ] All names in snake_case
  - [ ] All cubes have a `description`
  - [ ] All measures have a `description`
  - [ ] All time dimensions are defined
- [ ] Document this self-check as a "pre-push checklist" in CLAUDE.md

---

## Acceptance Criteria
- One file extension is used consistently everywhere: CLAUDE.md, scripts, models, docs
- The choice is documented with a rationale
- All generated model files pass the naming convention self-check
- CLAUDE.md includes an explicit pre-push conventions checklist
