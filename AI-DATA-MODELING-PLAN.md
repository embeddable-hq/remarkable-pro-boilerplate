# AI Data Modeling — Plan Index

Four plans derived from the known gaps in `AI-DATA-MODELING-BASELINE.md`.

| Plan | File | Focus |
|------|------|-------|
| Plan 01 | `plans/plan-01-kpi-first-workflow.md` | Rewrite CLAUDE.md to be KPI-first instead of schema-first |
| Plan 02 | `plans/plan-02-post-generation-narration.md` | Add post-generation explanation instructions to CLAUDE.md |
| Plan 03 | `plans/plan-03-quality-measurement-baseline.md` | Run first quality measurement against Spotify schema |
| Plan 04 | `plans/plan-04-file-extension-and-consistency.md` | Fix .cube.yaml vs .cube.yml and audit all conventions |

## Standup Log

`plans/STANDUP.md` — daily log of prompt changes, measurement improvements, learnings, and challenges.

## Suggested Implementation Order

1. **Plan 04** — fix the extension issue first (low effort, unblocks clean baselines)
2. **Plan 03** — establish quality baseline before making big workflow changes
3. **Plan 01** — KPI-first rewrite (highest impact, informed by baseline scores)
4. **Plan 02** — add narration (can be done alongside Plan 01)
