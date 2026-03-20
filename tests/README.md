# Theming Agent — Internal QA & Testing

Internal documentation for measuring and improving the AI theming agent's accuracy.
This is not customer-facing — the customer workflow lives in `THEMING-WORKFLOW.md`.

## Overview

The test framework compares the agent's generated `embeddable.theme.ts` against
designer-verified "golden standard" files, producing a per-category accuracy score.

```
Figma File ──► extract-figma-tokens.ts ──► figma-tokens.json ──► Cursor Agent ──► embeddable.theme.ts
                                                                                         │
Designer ──► fills in golden.json                                                        │
                    │                                                                    │
                    └──────────────► score-theme.ts ◄────────────────────────────────────┘
                                          │
                                    Score Report (%)
```

## Golden Standard Files

Located in `tests/golden-standards/`. Each file defines the expected theme output
for a specific Figma design.

### Creating a new golden standard

1. Copy the template:

```bash
cp tests/golden-standards/golden-standard.template.json tests/golden-standards/my-design.golden.json
```

2. Fill in `meta` (name, Figma URL, description).

3. Have the designer fill in the `expected` sections. Each token has a `label`
   field explaining what it controls in plain language. Only include sections
   and tokens the design explicitly defines — remove everything else.

4. Optionally adjust `scoring.weights` to reflect what matters most for this
   design (e.g. if it's primarily about chart colors, increase that weight).

### Template structure

| Section | What the designer fills in | Maps to |
|---------|---------------------------|---------|
| `chartColors` | Branded palette as hex array | `theme.charts.backgroundColors` / `borderColors` |
| `backgrounds` | Surface/container colors | `theme.styles['--em-sem-background*']` |
| `textColors` | Text hierarchy colors | `theme.styles['--em-sem-text*']` |
| `statusColors` | Error/success indicators | `theme.styles['--em-sem-status-*']` |
| `shadows` | Shadow styling | `theme.styles['--em-core-shadow-*']` |

All sections are optional. The scorer only evaluates tokens present in the golden file.

## Running Tests

### Score a single design

```bash
npx tsx scripts/score-theme.ts tests/golden-standards/ai-week-library.golden.json
```

Output:

```
Test: AI Week Library - Light Theme
══════════════════════════════════════════════════
Chart Colors          100%  (18/18 exact)
Backgrounds           100%  (6/6 exact)
Text Colors           100%  (5/5 exact)
Status Colors         100%  (4/4 exact)
Shadows               100%  (3/3 exact)
──────────────────────────────────────────────────
Structural:         PASS
  OK     Uses semantic tokens: 15 semantic tokens found
  OK     No gray scale overrides: Clean
  OK     No font tokens: Clean
  OK     Chart colors provided: 9 chart colors (good coverage)
──────────────────────────────────────────────────
Weighted Score:     100%
```

### JSON output (for CI / programmatic use)

```bash
npx tsx scripts/score-theme.ts tests/golden-standards/ai-week-library.golden.json --json
```

### Extraction-only scoring (recommended)

When you provide the `--figma-tokens` flag, the scorer only checks tokens that have
corresponding extraction candidates. Derived/invented tokens are skipped. This isolates
extraction accuracy from the agent's harmony-derivation quality.

```bash
npx tsx scripts/score-theme.ts tests/golden-standards/ai-week-library-2.json --figma-tokens figma-tokens-2.json
```

How it works:
- Reads the `figma-tokens-*.json` to see which categories and tokens had extraction candidates
- **Skips entire categories** with zero candidates (e.g. status colors when none were extracted)
- **Skips individual tokens** without a matching key in the candidates (e.g. `--em-sem-background--inverted` when only `background` and `background--neutral` were extracted)
- **Limits chart colors** to the number of extraction candidates (derived chart expansion slots are skipped)
- Weight redistribution happens naturally — skipped categories don't count toward the total

### Score against a specific theme file

```bash
npx tsx scripts/score-theme.ts tests/golden-standards/my-design.golden.json path/to/embeddable.theme.ts
```

Exit code is 0 if weighted score >= 70%, 1 otherwise.

## How Scoring Works

### Color comparison

Colors are compared using **CIEDE2000 (deltaE)** — a perceptual distance metric
that matches how humans see color differences, not simple RGB/hex equality.

| deltaE | Meaning | Score |
|--------|---------|-------|
| 0 | Identical | 100% |
| < 1 | Imperceptible | 95% |
| < 5 | Barely noticeable | 80% |
| < tolerance | Same ballpark | 20-80% (scaled) |
| > tolerance | Wrong color | 0% |

The `colorTolerance` in each golden file controls the threshold (default: 15).

### Chart colors

Order-aware but forgiving:
- Exact match at correct position = 100%
- Exact match at wrong position = 80%
- Close color at wrong position = scaled partial score
- Missing = 0%

### Style tokens (backgrounds, text, status, shadows)

Per-token comparison:
- Exact value match = 100%
- Close color within tolerance = partial score
- Wrong value or missing = 0%
- Extra tokens the agent set but aren't in golden = **no penalty**

### Structural checks (pass/fail, not weighted)

| Check | What it validates |
|-------|-------------------|
| Uses semantic tokens | At least one `--em-sem-*` token present |
| No gray scale overrides | No `--em-core-color-gray-*` tokens set |
| No font tokens | No `font-family` tokens set (not supported) |
| Chart colors provided | At least 6 background colors |

### Weighted score

Each category has a weight (defined per golden file, default: chart 30, backgrounds 25,
text 25, status 10, shadows 10). The final score is the weighted average.

## Token Correctness Rules

The agent should:
- **Use `--em-sem-*` tokens** for all global appearance changes (correct layer)
- **Use `theme.charts.backgroundColors`** for chart palette (not CSS variables)
- **NOT set `--em-core-color-gray-*`** tokens (overwrites design system primitives)
- **NOT set `--em-core-font-family-*`** tokens (custom fonts not supported)
- **NOT set `--em-sem-chart-color--N`** when `backgroundColors` is already used

## Variation Stability

To measure how consistent the agent is, run the same prompt multiple times
and compare outputs.

```bash
# Save the original theme
cp embeddable.theme.ts embeddable.theme.ts.bak

for i in {1..5}; do
  # Reset to default theme before each run
  git checkout embeddable.theme.ts

  # Run the agent (manually in Cursor), then score
  npx tsx scripts/score-theme.ts tests/golden-standards/my-design.golden.json --json > "tests/results/run-$i.json"
done

# Restore original
mv embeddable.theme.ts.bak embeddable.theme.ts
```

Lower variance across runs = more reliable agent. Compare the `weightedScore`
values across all runs.

## Adding a New Test Case

1. Get a Figma file with a known design
2. Extract tokens: `npx tsx scripts/extract-figma-tokens.ts <FIGMA_URL>`
3. Create golden standard from template (see above)
4. Have designer fill it in
5. Run the agent: "Based on figma-tokens.json, update embeddable.theme.ts to match this design."
6. Score: `npx tsx scripts/score-theme.ts tests/golden-standards/<name>.golden.json`
7. Iterate on agent rules (`.cursor/rules/theming-agent.mdc`) if scores are low

## File Reference

| File | Purpose |
|------|---------|
| `scripts/extract-figma-tokens.ts` | Extracts tokens from Figma API → `figma-tokens.json` |
| `scripts/parse-theme.ts` | Parses `embeddable.theme.ts` → normalized JSON |
| `scripts/score-theme.ts` | Compares theme against golden standard → score report |
| `tests/golden-standards/golden-standard.template.json` | Empty template for designers |
| `tests/golden-standards/*.golden.json` | Designer-verified expected outputs |
| `.cursor/rules/theming-agent.mdc` | Agent rules (what to improve when scores are low) |
| `.cursor/theming-reference.md` | Agent's theming knowledge base |
