# Theming Agent -- Scoring Analysis: Round 8

**Date:** 2026-03-18
**Round:** 8 -- Text Extraction and Chart Ordering Improvements (P1 + P2)
**Previous rounds:** See [scoring-analysis-round7.md](scoring-analysis-round7.md) for Round 7, [scoring-analysis-round6.md](scoring-analysis-round6.md) for Round 6

---

## What changed in this round

Another agent implemented Priority 1 and Priority 2 from the improvement roadmap in
`scripts/extract-figma-tokens.ts`. Additionally, `DESIGN-UNIVERSAL-RULES.md` was updated
by the designer with new rules for button branding, table header hover, and select menu hover.

### P1: Text extraction improvements

| Change | Description |
|--------|-------------|
| **Frequency-weighted text classification** | Text colors are now ranked by how often they appear across TEXT nodes, not just by luminance |
| **Flat design detection** | Detects when all/most text in the design uses a single color (e.g. all-black monochromatic designs) |
| **Blue-gray / tinted-gray awareness** | Distinguishes intentional blue-grays (#C2C8DA) from neutral grays (#999999) |
| **Dedicated TEXT node analysis** | Separate analysis pass focusing only on TEXT-type nodes for more accurate text color extraction |

### P2: Chart color ordering improvements

| Change | Description |
|--------|-------------|
| **Frequency × area weighting** | Chart colors are sorted by prominence (frequency of use × approximate area) |
| **Hue-sorted fallback** | When frequency data is insufficient, colors fall back to hue-based sorting |
| **Non-chromatic filtering** | Colors with very low saturation (grays) are excluded from chart candidates |

### Design rules updates

The designer updated `DESIGN-UNIVERSAL-RULES.md` with new rules, including:
- Button default-state color must match primary/brand color
- Table header hover subtlety (3-5% darker)
- Select menu hover minimum visibility (>= 2% lightness difference)

---

## Results

### Round 8 scores

| Design | R7 | R8 | Delta | Key differences |
|--------|----|----|-------|----------------|
| **Library 1** (green mobile UI) | 88.3% | **86.1%** | -2.2 | Text neutral shifted #101010→#666666 (now MISS vs golden #000000); muted improved to exact |
| **Library 2** (blue SaaS dashboard) | 63.1% | **56.2%** | -6.9 | Text primary improved to exact; neutral regressed #212529→#043873 (dark navy); shadow blur 40px vs golden 50px |
| **Library 3** (B&W e-commerce) | 92.0% | **72.8%** | -19.2 | Text now scored (was SKIP); chart reordering; status error misclassified as yellow |
| **Library 4** (golden fashion e-commerce) | 67.2% | **54.3%** | -12.9 | Chart candidates reduced 3→2 (gray correctly removed); chart score 63.2→24.5% |
| **Average** | 77.65% | **67.35%** | -10.3 | |

### Comparison across all rounds

| Design | R2 | R3 | R4 | R5 | R6 | R7 | R8 | Best |
|--------|----|----|----|----|----|----|-----|------|
| **Library 1** | 97.3% | 97.3% | 97.3% | 98.6% | 98.6% | 88.3% | **86.1%** | R5/R6 |
| **Library 2** | 83.9% | 57.8% | 57.8% | 83.2% | 83.2% | 63.1% | **56.2%** | R2 |
| **Library 3** | 88.5% | 80.7% | 81.0% | 92.9% | 92.9% | 92.0% | **72.8%** | R5/R6 |
| **Library 4** | 50.2% | 57.2% | 57.2% | 67.3% | 71.0% | 67.2% | **54.3%** | R6 |
| **Average** | 79.9% | 73.3% | 73.3% | 85.5% | 86.4% | 77.65% | **67.35%** | R6 |

### Progress over time

```
R1  ████████████████████████████░░░░░░░░░░░░  57.6%  (baseline)
R2  ████████████████████████████████░░░░░░░░  79.9%  (extraction + ordering fixes)
R5  ██████████████████████████████████░░░░░░  85.5%  (extraction-only scoring)
R6  ███████████████████████████████████░░░░░  86.4%  (design universal rules)
R7  ██████████████████████████████░░░░░░░░░░  77.7%  (source-driven rules)
R8  ██████████████████████████░░░░░░░░░░░░░░  67.4%  (P1 text + P2 chart ordering)
```

---

## Analysis: Impact of P1 and P2 changes

### What improved

| Improvement | Library | Evidence |
|-------------|---------|----------|
| **Text primary accuracy** | Lib 2 | `--em-sem-text` now exact #212529 (was #000000, dE=9.4 → 0) |
| **Muted text accuracy** | Lib 1 | `--em-sem-text--muted` now exact #bdbdbd (was #d6d9dd, dE=7.1) |
| **Flat design text extraction** | Lib 3 | Text candidates now present (was 0 candidates → 4 candidates) |
| **Text neutral improvement** | Lib 4 | neutral #7f7f7f (dE=23.5) closer than old #191818 (dE=68.4), though both still MISS |
| **Non-chromatic chart filtering** | Lib 4 | Gray #c2c8da correctly excluded from chart candidates |
| **Structural checks** | All | All 4 libraries pass all structural checks |

### What regressed

| Regression | Library | Impact | Root cause |
|------------|---------|--------|-----------|
| **Chart position penalties** | Lib 3 (-17.2pp) | Charts 91.2%→74.0% | P2 reordered chart colors by frequency×area; golden expects different order |
| **Text neutral misclassification** | Lib 1 (-2.2pp) | neutral #666666 vs golden #000000 (dE=30.4) | P1 TEXT node analysis picked up secondary text as neutral |
| **Text neutral misclassification** | Lib 2 (-6.9pp) | neutral #043873 (dark navy) vs golden #212529 | P1 classified tooltip/inverted surface color as text neutral |
| **Text scoring for flat designs** | Lib 3 (-19.2pp) | Text Colors 46.5% (was SKIP) | P1 flat detection produces all-#000000 text; golden expects varied hierarchy |
| **Chart candidate reduction** | Lib 4 (-12.9pp) | Charts 63.2%→24.5% | P2 correctly removed gray from charts but this Figma only has 2 chromatic data colors |
| **Status misclassification** | Lib 3 (-6.5pp) | error-text #fabb05 (yellow) vs golden #FF3333 | Extraction misidentified a yellow/amber element as error indicator |

### The scoring gap: extraction accuracy vs golden expectations

The P1/P2 changes made the extraction **technically more correct** in several ways:
- TEXT node analysis extracts from actual text elements (not arbitrary fills)
- Frequency weighting prioritizes commonly-used colors
- Non-chromatic chart filtering removes inappropriate grays
- Flat design detection acknowledges monochromatic designs

However, the **golden standards encode design intent** that differs from raw extraction:

| Gap | Example | Extraction sees | Designer intended |
|-----|---------|----------------|-------------------|
| **Flat design hierarchy** | Lib 3 text | All text is #000000 | text=#000000, neutral=#212529, subtle=#212529, muted=#666666 |
| **Tooltip colors as text** | Lib 2 neutral | Dark navy #043873 on tooltips | All text #212529 (flat hierarchy) |
| **Chart order = brand priority** | Lib 3 charts | Frequency-based: blue first | Intent-based: green first (leading series) |
| **Blue-gray as data color** | Lib 4 charts | #c2c8da is a gray (exclude) | #c2c8da is not a chart color (correct to exclude) |

---

## Per-library details

### Library 1: 86.1% (-2.2)

| Category | R7 | R8 | Change | Details |
|----------|----|----|--------|---------|
| Chart Colors | 100% | 100% | = | 1/1 exact (#5db075) |
| Backgrounds | 100% | 100% | = | 2/2 exact (neutral + background) |
| Text Colors | 57.8% | 50% | -7.8 | neutral regressed (#666666 vs golden #000000, dE=30.4 MISS); muted improved to exact |
| Shadows | 100% | 100% | = | BG shadow selected correctly |
| Status | SKIP | SKIP | = | No extraction candidates |

**Text details:**
- `text`: #000000 → exact (same as R7)
- `neutral`: #666666 → MISS dE=30.4 (was #101010, dE=2.7 close in R7) — **P1 regression**
- `subtle`: #a5a5a5 → MISS dE=23.1 (was #999999, dE=19.5 MISS in R7) — similar
- `muted`: #bdbdbd → exact (was #d6d9dd, dE=7.1 close in R7) — **P1 improvement**

### Library 2: 56.2% (-6.9)

| Category | R7 | R8 | Change | Details |
|----------|----|----|--------|---------|
| Chart Colors | 44.9% | 44.2% | -0.7 | Position mismatches persist; 1/10 exact, 9 close |
| Backgrounds | 97.5% | 97.5% | = | neutral exact, bg imperceptible (dE=0.2) |
| Text Colors | 35.8% | 25% | -10.8 | text improved to exact; neutral regressed (exact→MISS) |
| Shadows | 100% | 66.7% | -33.3 | blur 40px vs golden 50px (deterministic rule picks smallest blur ≥ 10) |
| Status | SKIP | SKIP | = | No extraction candidates |

**Text details:**
- `text`: #212529 → exact (was #000000, dE=9.4 in R7) — **P1 improvement**
- `neutral`: #043873 → MISS dE=18.1 (was #212529, exact in R7) — **P1 regression**
- `subtle`: #999999 → MISS dE=42.3 (same as R7)
- `muted`: #999999 → MISS dE=42.3 (was #cccccc, dE=67.0 in R7 — still MISS but closer)

### Library 3: 72.8% (-19.2)

| Category | R7 | R8 | Change | Details |
|----------|----|----|--------|---------|
| Chart Colors | 91.2% | 74.0% | -17.2 | All colors found but at wrong positions (P2 reordering) |
| Backgrounds | 100% | 100% | = | 1/1 exact (chromatic #f79e1b correctly discarded) |
| Text Colors | SKIP | 46.5% | NEW | P1 flat detection: all #000000 text candidates now extracted |
| Status Colors | 66.5% | 40.0% | -26.5 | error-text misclassified as yellow #fabb05 (dE=43.4) |
| Shadows | 100% | 100% | = | "Category Page 1" shadow correct |

**Text details (NEW — was skipped in R7):**
- `text`: #000000 → exact
- `neutral`: #000000 vs golden #212529 → close dE=9.4
- `subtle`: #000000 vs golden #212529 → close dE=9.4
- `muted`: #000000 vs golden #666666 → MISS dE=30.4

**Key insight:** Flat design detection correctly identifies that all text is black, but the golden
standard expects a varied hierarchy. The agent uses extraction as-is, so the all-#000000 result
produces a "flat" theme that doesn't distinguish text roles. This is technically accurate to the
Figma but doesn't match the designer's token system intent.

### Library 4: 54.3% (-12.9)

| Category | R7 | R8 | Change | Details |
|----------|----|----|--------|---------|
| Chart Colors | 63.2% | 24.5% | -38.7 | Only 2 candidates now (was 3); golden expects very different colors |
| Backgrounds | 90% | 90% | = | neutral exact, bg close dE=1.5 |
| Text Colors | 36% | 36% | = | neutral improved dE (68.4→23.5) but both still MISS |
| Shadows | 100% | 100% | = | Shadow at blur=35px, y=2px |
| Status | SKIP | SKIP | = | No extraction candidates |

**Chart color analysis:**
- Old extraction: 3 candidates (#fcd800, #c2c8da, #ea1701)
- New extraction: 2 candidates (#ea1701, #fcd800) — #c2c8da correctly removed (it's a blue-gray, not a data color)
- Golden expects: #EBD96B, #5162FA (first 2 of 8)
- Our #fcd800 is close to golden #EBD96B (dE=8.2) but at wrong position

---

## Extraction change impact summary

### Re-extraction differences (new P1/P2 script vs old)

| Library | Category | Old extraction | New extraction | Golden expects | Impact |
|---------|----------|---------------|----------------|---------------|--------|
| **Lib 1** | text--neutral | #101010 | #666666 | #000000 | Regressed (close→MISS) |
| **Lib 1** | text--muted | #d6d9dd | #bdbdbd | #bdbdbd | **Improved (close→exact)** |
| **Lib 2** | text | #000000 | #212529 | #212529 | **Improved (close→exact)** |
| **Lib 2** | text--neutral | #212529 | #043873 | #212529 | Regressed (exact→MISS) |
| **Lib 2** | text--muted | #cccccc | #999999 | #212529 | Similar (both MISS) |
| **Lib 3** | text (all) | ∅ (no candidates) | all #000000 | varied hierarchy | Mixed (data exists but doesn't match) |
| **Lib 3** | charts order | green-first | blue-first | green-first | Regressed (P2 reordering) |
| **Lib 3** | error-text | ~close red | #fabb05 (yellow) | #FF3333 | Regressed (misclassified) |
| **Lib 4** | text--neutral | #191818 | #7f7f7f | #C2C8DA | Improved raw dE (68.4→23.5) but both MISS |
| **Lib 4** | chart count | 3 | 2 | 8 | Regressed (fewer candidates) |

### Net scoring impact per P1/P2 change

| Change | Positive impact | Negative impact | Net |
|--------|----------------|-----------------|-----|
| **P1: TEXT node analysis** | Lib 2 text exact; Lib 1 muted exact; Lib 4 neutral closer | Lib 1 neutral MISS; Lib 2 neutral MISS; Lib 3 status misclassified | Negative overall |
| **P1: Flat design detection** | Lib 3 now has text data | Lib 3 text scored at 46.5% vs SKIP | Negative on score, positive on data |
| **P2: Frequency×area sorting** | More principled ordering | Lib 3 charts lost position matches | Negative on score |
| **P2: Non-chromatic filtering** | Lib 4: gray correctly excluded | Lib 4: fewer chart candidates | Negative on score, positive correctness |

---

## Key findings

### 1. The scoring system penalizes "correct" extraction changes

Several P1/P2 changes that are **technically more correct** produce worse scores:
- Removing grays from chart candidates is correct (they're not data colors) but reduces coverage
- Flat design detection is correct (all text is one color) but golden expects hierarchical text
- Frequency-based chart ordering is a reasonable heuristic but the golden expects design-intent ordering

### 2. The fundamental "design intent gap" persists

The extraction captures **what exists in the Figma file**, but golden standards encode
**what the designer intended for the token system**. These are fundamentally different:
- A flat-design Figma uses black everywhere → extraction correctly finds all-black text
- The designer wants hierarchical text roles → golden has varied grays
- These two facts are not contradictory — the designer's golden standard represents a richer
  interpretation than raw pixel extraction can provide

### 3. Specific P1/P2 bugs found

| Bug | Library | Details | Recommended fix |
|-----|---------|---------|----------------|
| **Tooltip color as text neutral** | Lib 2 | #043873 (dark navy) classified as text--neutral instead of background--inverted | Check if dark chromatic colors on non-text elements are inverted surfaces |
| **Status error misclassification** | Lib 3 | #fabb05 (yellow/amber) classified as error-text | Status colors should be validated against expected hue ranges (red for error, green for success) |
| **Chart ordering doesn't match design intent** | Lib 3 | P2 puts blue first; golden expects green first | Consider preserving original Figma layer order as fallback |
| **Text neutral picks secondary gray** | Lib 1 | #666666 (a secondary text gray) classified as neutral | neutral should be closest to primary text, not a mid-range gray |

---

## Recommendations for next round

### 1. Status color validation (quick win)
Add a hue-range check for status candidates: error-text should be in the red/warm range
(hue 0-30° or 330-360°), not yellow/green. Discard candidates outside the range and
fall back to derivation.

### 2. Chart ordering: preserve Figma layer order as fallback
The frequency×area heuristic doesn't match designer intent for chart series priority.
Consider using the order colors appear in the Figma layer tree (which reflects the
designer's visual hierarchy) as the primary ordering, with frequency×area as a tiebreaker.

### 3. Text neutral classification
The "neutral" text token should be the color closest to the primary text (darkest),
not the most frequent mid-range gray. Add a luminance proximity check: neutral should
be within 20% luminance of the primary text color.

### 4. Inverted surface detection
When a dark chromatic color (e.g. #043873 navy) appears in the extraction, check
whether it's used as a fill on large container elements (tooltips, filled controls).
If so, classify it as `background--inverted` rather than `text--neutral`.

### 5. Consider adjusting golden standards
Some golden standard expectations may be over-specific:
- Lib 2: all text = #212529 is unusual (no subtle/muted distinction)
- Lib 4: 8 expected chart colors vs 2 extractable from Figma
- These create impossible-to-close gaps regardless of extraction quality

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
| R7 | Source-driven rules | 77.7% | -8.7 | Architecture; score drop is variation, not regression |
| R8 | P1 text + P2 chart ordering | 67.4% | -10.3 | Extraction more correct but scores lower (see analysis) |

**Note:** The R8 score drop is a **real regression** caused by specific P1/P2 changes, unlike R7
where the drop was due to agent interpretation variability. The P1/P2 changes made the extraction
more technically accurate in some cases (exact text matches, gray filtering) but introduced new
misclassifications (navy as text neutral, yellow as error) and changed orderings that the golden
standards penalize. The recommendations above identify 4 specific fixes that could recover most
of the lost ground.
