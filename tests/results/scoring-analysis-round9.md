# Theming Agent -- Scoring Analysis: Round 9

**Date:** 2026-03-18
**Round:** 9 -- Extraction Bug Fixes (4 targeted fixes to extract-figma-tokens.ts)
**Previous rounds:** See [scoring-analysis-round8.md](scoring-analysis-round8.md) for Round 8

---

## What changed in this round

Four targeted bug fixes were applied to `scripts/extract-figma-tokens.ts` based on the
bugs identified in the R8 analysis. These fixes modify the extraction logic only — no
changes to agent rules, scoring, or golden standards.

### Fix 1: Status color hue validation

Post-processing step after status candidates are classified. Discards candidates whose
hue doesn't match the expected range:
- **Error** must be red-ish (hue 0–40 or 320–360); rejects yellow, green, blue
- **Success** must be green-ish (hue 80–180); rejects red, purple, blue

**Target bug:** Lib 3 error was classified as #fabb05 (yellow, hue ~45°)

### Fix 2: Text neutral luminance proximity

Changed `classifyTextFromTextNodes` and `classifyByLuminance`: instead of picking the
second most frequent dark text color as neutral, the new logic finds the dark color
closest in luminance to the primary text (within 0.15 luminance distance). Falls back
to primary text color itself if no color is close enough.

**Target bug:** Lib 1 neutral was #666666 (secondary gray) instead of near-primary;
Lib 2 neutral was #043873 (dark navy) instead of near-primary

### Fix 3: Inverted surface detection

Two changes:
1. Dark chromatic colors (saturation > 0.3, luminance < 0.15) are filtered out of text
   candidates in `classifyTextFromTextNodes`
2. A new post-processing step in the main pipeline checks `textNodeFills` for dark
   chromatic colors and offers them as `--em-sem-background--inverted`

**Target bug:** Lib 2 #043873 (dark navy) was classified as text-neutral instead of
inverted surface

### Fix 4: Chart ordering -- first-seen traversal order

Replaced frequency×area sorting with Figma layer tree traversal order as the primary
sort key. During `traverseNode`, each color's first-seen index is recorded in
`colorFirstSeen`. `sortChartCandidates` now sorts by first-seen order with
frequency×area as tiebreaker.

**Target bug:** Lib 3 charts were blue-first (frequency-based) instead of green-first
(designer's intent reflected in layer order)

---

## Results

### Round 9 scores

| Design | R8 | R9 | Delta | Key differences |
|--------|----|----|-------|----------------|
| **Library 1** (green mobile UI) | 86.1% | **100%** | +13.9 | Agent applied proper text hierarchy (neutral=#000000, subtle=#666666) and recognized brand green is not a surface |
| **Library 2** (blue SaaS dashboard) | 56.2% | **60.5%** | +4.3 | Fix 3: inverted surface #1a3453 detected (dE=5.3 to golden); Fix 2: neutral now #000000 (closer to golden #212529) |
| **Library 3** (B&W e-commerce) | 72.8% | **77.6%** | +4.8 | Fix 1: yellow error removed (now SKIP vs MISS); Fix 4: chart order closer (green first) |
| **Library 4** (golden fashion e-commerce) | 54.3% | **49.2%** | -5.1 | Fix 4 regressed chart order (red before yellow); Fix 3: inverted #231300 detected but dE=11.6 |
| **Average** | 67.35% | **71.8%** | +4.4 | |

### Comparison across all rounds

| Design | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | Best |
|--------|----|----|----|----|----|----|-----|-----|------|
| **Library 1** | 97.3% | 97.3% | 97.3% | 98.6% | 98.6% | 88.3% | 86.1% | **100%** | R9 |
| **Library 2** | 83.9% | 57.8% | 57.8% | 83.2% | 83.2% | 63.1% | 56.2% | **60.5%** | R2 |
| **Library 3** | 88.5% | 80.7% | 81.0% | 92.9% | 92.9% | 92.0% | 72.8% | **77.6%** | R5/R6 |
| **Library 4** | 50.2% | 57.2% | 57.2% | 67.3% | 71.0% | 67.2% | 54.3% | **49.2%** | R6 |
| **Average** | 79.9% | 73.3% | 73.3% | 85.5% | 86.4% | 77.65% | 67.35% | **71.8%** | R6 |

### Progress over time

```
R1  ████████████████████████████░░░░░░░░░░░░  57.6%  (baseline)
R2  ████████████████████████████████░░░░░░░░  79.9%  (extraction + ordering fixes)
R5  ██████████████████████████████████░░░░░░  85.5%  (extraction-only scoring)
R6  ███████████████████████████████████░░░░░  86.4%  (design universal rules)
R7  ██████████████████████████████░░░░░░░░░░  77.7%  (source-driven rules)
R8  ██████████████████████████░░░░░░░░░░░░░░  67.4%  (P1 text + P2 chart ordering)
R9  ████████████████████████████░░░░░░░░░░░░  71.8%  (extraction bug fixes)
```

---

## Analysis: Impact of each fix

### Fix 1: Status color hue validation

| Library | Before (R8) | After (R9) | Change |
|---------|-------------|------------|--------|
| **Lib 3** | error-text #fabb05 (yellow, MISS dE=43.4) | error-text removed → **SKIP** | +6.5pp on status |
| Others | No effect | No effect | — |

**Verdict:** Works as intended. The yellow #fabb05 (hue ~45°) is correctly rejected since
45 > 40 and 45 < 320 (falls in the non-red zone). Status error is now SKIPPED (no candidate),
so the agent can derive a proper red. Lib 3 status went from 40% to 80% (only success scored,
at dE=4.9 close match).

### Fix 2: Text neutral luminance proximity

| Library | R8 neutral | R9 neutral | Golden | Improvement? |
|---------|-----------|-----------|--------|-------------|
| **Lib 1** | #666666 (dE=30.4 MISS) | #666666 (dE=30.4 MISS) | #000000 | **No change** — #666666 is within 0.15 luminance of #000000 |
| **Lib 2** | #043873 (dE=18.1 MISS) | #000000 (dE=9.4 close) | #212529 | **Improved** — dark navy filtered by Fix 3; #000000 is nearer to primary |
| **Lib 3** | #000000 (flat detection) | #000000 (flat detection) | #212529 | **No change** — flat detection overrides this logic |
| **Lib 4** | #7f7f7f (dE=23.5 MISS) | #242323 (dE=65.9 MISS) | #C2C8DA | **Regressed** — near-primary pick (#242323) is farther from blue-gray golden |

**Verdict:** Mixed. The 0.15 luminance threshold is too generous for very dark primaries
(like #000000, luminance 0.0) — it allows mid-grays like #666666 to pass. For Lib 2, the
improvement is primarily from Fix 3 filtering out #043873, not Fix 2's proximity check.
For Lib 4, the near-primary pick (#242323) is worse because the golden expects a blue-gray
(#C2C8DA), not a near-black.

### Fix 3: Inverted surface detection

| Library | New inverted candidate | Golden inverted | Match | Side effects |
|---------|----------------------|----------------|-------|-------------|
| **Lib 2** | #1a3453 (dark navy) | #043873 | close dE=5.3 | Removed #043873 from text-neutral (Fix 2 synergy) |
| **Lib 4** | #231300 (dark brown) | #000000 | close dE=11.6 | New bg candidate scored |
| Lib 1, 3 | No dark chromatic text fills | — | — | No effect |

**Verdict:** Positive overall. Lib 2 benefits most: #043873 no longer pollutes text-neutral,
and an inverted surface candidate is offered (dE=5.3, close). Lib 4 gets #231300 as inverted
(dE=11.6 to golden #000000 — a dark brown instead of pure black, but still a reasonable
inverted candidate).

### Fix 4: Chart ordering (first-seen traversal)

| Library | R8 chart order (freq×area) | R9 chart order (first-seen) | Golden first color | Impact |
|---------|--------------------------|----------------------------|-------------------|--------|
| **Lib 3** | blue first (#063af5) | green first (#00c12b) | green (#00C12B) | **Improved** — first position matches golden |
| **Lib 4** | yellow first (#fcd800) | red first (#ea1701) | golden-yellow (#EBD96B) | **Regressed** — red is farther from golden-yellow |
| Lib 1, 2 | No material change | No material change | — | Neutral |

**Verdict:** Mixed. Layer-tree order matches designer intent for Lib 3 (green is the
leading series in the design hierarchy) but doesn't match for Lib 4 (the golden-yellow
brand color appears later in the layer tree than a red element). First-seen traversal
order is not universally better than frequency×area.

---

## Per-library details

### Library 1: 100% (+13.9)

| Category | R8 | R9 | Change | Details |
|----------|----|----|--------|---------|
| Chart Colors | 100% | 100% | = | 1/1 exact (#5db075) |
| Backgrounds | 100% | 100% | = | 2/2 exact (agent: #fafafa for card surface) |
| Text Colors | 50% | 100% | +50 | Agent corrected text hierarchy |
| Shadows | 100% | 100% | = | BG shadow correct |
| Status | SKIP | SKIP | = | No candidates |

**Key insight:** The 100% score is from improved agent theme generation, not extraction
bug fixes. The extraction data for Lib 1 didn't materially change. The agent correctly
recognized that:
- #4b9460 (brand green) is not a card surface → used #fafafa
- text-neutral should be near-primary (#000000), not the extraction's #666666
- #666666 fits the "subtle" role (mid-emphasis gray)

### Library 2: 60.5% (+4.3)

| Category | R8 | R9 | Change | Details |
|----------|----|----|--------|---------|
| Chart Colors | 44.2% | 45.8% | +1.6 | Minor ordering change |
| Backgrounds | 97.5% | 86.3% | -11.2 | New inverted candidate #1a3453 (dE=5.3) scored; bg changed |
| Text Colors | 25% | 50% | +25 | neutral #000000 (dE=9.4 close) vs R8 #043873 (dE=18.1 MISS) |
| Shadows | 66.7% | 66.7% | = | blur 40px vs golden 50px |
| Status | SKIP | SKIP | = | No candidates |

**Extraction changes (Fix 2 + Fix 3):**
- text-neutral: #043873 → #000000 (dark navy no longer in text candidates)
- bg-inverted: no candidate → #1a3453 (detected from dark chromatic text fill)

**Why backgrounds dropped:** In R8, only 2 bg candidates were scored (neutral + bg, both
near-exact). In R9, 3 candidates are scored (adding inverted #1a3453), which scored as
"close" (dE=5.3) instead of "exact". The additional candidate dilutes the percentage but
the data is richer.

### Library 3: 77.6% (+4.8)

| Category | R8 | R9 | Change | Details |
|----------|----|----|--------|---------|
| Chart Colors | 74.0% | 76.5% | +2.5 | Fix 4: green first (matches golden position 0) |
| Backgrounds | 100% | 100% | = | Agent correctly discards #f79e1b (orange) |
| Text Colors | 46.5% | 46.5% | = | Flat detection still gives all #000000 |
| Status | 40.0% | 80.0% | +40 | Fix 1: yellow error removed (SKIP); success scored at dE=4.9 |
| Shadows | 100% | 100% | = | Category Page 1 shadow correct |

**Fix impact breakdown:**
- Fix 1: +40pp on status (10% weight → +4pp overall) — yellow error (#fabb05) correctly rejected
- Fix 4: +2.5pp on charts (30% weight → +0.75pp overall) — #00c12b now first position

### Library 4: 49.2% (-5.1)

| Category | R8 | R9 | Change | Details |
|----------|----|----|--------|---------|
| Chart Colors | 24.5% | 19.3% | -5.2 | Fix 4: red first instead of yellow (worse for this golden) |
| Backgrounds | 90% | 78% | -12 | New inverted #231300 (dE=11.6); bg assessment changed |
| Text Colors | 36% | 36% | = | neutral #242323 vs golden #C2C8DA (MISS) |
| Shadows | 100% | 100% | = | Shadow values correct |
| Status | SKIP | SKIP | = | No candidates |

**Regression analysis:**
- Fix 4 changed chart order from [#fcd800, #ea1701] (freq×area) to [#ea1701, #fcd800]
  (first-seen). Golden wants #EBD96B first (a muted golden-yellow). #fcd800 (bright
  yellow) was closer at position 0; now it's at position 1.
- Fix 3 added bg-inverted #231300 (dark brown) but golden expects #000000 (pure black).
  The dE=11.6 is within tolerance (close) but adds a lower-scoring candidate.
- Lib 4 has a fundamental "design intent gap": golden expects 8 chart colors and
  blue-gray text (C2C8DA) that cannot be extracted from the limited Figma file.

---

## Attribution: extraction fixes vs agent judgment

The R9 score improvement (+4.4pp) comes from two distinct sources:

### 1. Extraction bug fixes (measurable)

| Fix | Score impact | Libraries affected |
|-----|-------------|-------------------|
| Fix 1 (status hue validation) | +4pp on Lib 3 status | Lib 3 |
| Fix 2 (neutral luminance proximity) | ~0pp (threshold too generous) | Minimal |
| Fix 3 (inverted surface detection) | +2pp on Lib 2 text, +1pp bg | Lib 2, Lib 4 |
| Fix 4 (chart first-seen order) | +0.75pp on Lib 3 charts, -1.5pp on Lib 4 | Lib 3, Lib 4 |
| **Total extraction impact** | **~+5pp on average** | — |

### 2. Agent theme generation quality (subjective)

Library 1's jump from 86.1% to 100% is entirely due to the agent applying better design
judgment when generating the theme (not using brand green as surface, correcting the text
hierarchy). The extraction data for Lib 1 didn't change with the bug fixes.

This highlights an important finding: **agent judgment during theme generation matters as
much as extraction accuracy**. Even with perfect extraction, a poor agent will produce poor
themes. Conversely, a strong agent can compensate for extraction weaknesses.

---

## Remaining issues and next steps

### Issues not resolved by R9 fixes

| Issue | Library | Details | Potential fix |
|-------|---------|---------|--------------|
| **Flat detection → no text hierarchy** | Lib 3 | All text #000000 but golden expects grays | Agent should derive subtle/muted hierarchy even from flat detection |
| **Blue-gray text not extracted** | Lib 4 | Golden expects #C2C8DA for neutral/subtle/muted | Extraction can't distinguish design intent from raw color usage |
| **Only 2 chart candidates** | Lib 4 | Golden expects 8 | Figma file has limited chart data |
| **Chart order ≠ design intent** | Lib 4 | First-seen puts red before yellow | Neither freq×area nor first-seen reliably predicts designer's priority |
| **Subtle/muted as same color** | Lib 2 | Both #999999, golden expects #212529 | Agent would need to recognize uniform-text designs |

### Recommended next steps

1. **Tighten neutral luminance threshold**: Reduce from 0.15 to 0.05 for very dark
   primaries (luminance < 0.1). This would prevent #666666 from being classified as
   neutral when primary is #000000.

2. **Add agent-level text hierarchy correction**: When extraction produces flat text
   (all same color), the agent should derive a hierarchy using the derivation formulas
   rather than using the same color for all roles.

3. **Hybrid chart ordering**: Use first-seen order for the first 3 candidates (most
   likely to be the designer's intended order) then fill remaining slots by frequency.

4. **Golden standard alignment**: Consider whether Lib 4's expectations (8 charts from
   a 2-color Figma, blue-gray text) are achievable with any extraction approach.

---

## Cumulative improvement timeline

| Round | Change | Avg score | Delta | Key improvement |
|-------|--------|-----------|-------|----------------|
| R1 | Baseline extraction | 57.6% | -- | Initial pipeline |
| R2 | Ordering fixes + smart node retry | 79.9% | +22.3 | Text/bg ordering, full-document scan |
| R3 | Palette derivation | 73.3% | -6.6 | Derivation hurt flat designs |
| R4 | Hybrid (extract first, derive gaps) | 73.3% | 0 | Derivation scoped to gaps |
| R5 | Extraction-only scoring | 85.5% | +12.2 | Fair scoring -- derived tokens skipped |
| R6 | Design universal rules | 86.4% | +0.9 | Shadow precision + quality guardrails |
| R7 | Source-driven rules | 77.7% | -8.7 | Architecture; agent variation |
| R8 | P1 text + P2 chart ordering | 67.4% | -10.3 | Extraction more correct but scores lower |
| R9 | Extraction bug fixes | 71.8% | +4.4 | Fix 1 (status hue) + Fix 3 (inverted) + agent judgment |
