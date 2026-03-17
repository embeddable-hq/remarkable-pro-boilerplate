# Theming Agent — Scoring Analysis (All Libraries)

**Date:** 2026-03-17
**Pipeline:** extract-figma-tokens.ts → agent interpretation → score-theme.ts

---

## Overall Results

| Design | Score | Chart | Backgrounds | Text | Status | Shadows | Structural |
|--------|-------|-------|-------------|------|--------|---------|------------|
| **Library 1** (green mobile UI) | **80.4%** | 100% | 81.8% | 50% | 74.8% | 100% | PASS |
| **Library 2** (blue SaaS dashboard) | **51.4%** | 27% | 93.2% | 46% | 51.3% | 33.3% | PASS |
| **Library 3** (B&W e-commerce) | **51.8%** | 0% | 95% | 72% | 0% | 100% | FAIL |
| **Library 4** (golden fashion e-commerce) | **46.8%** | 17.7% | 70.5% | 39% | 41.5% | 100% | PASS |
| **Average** | **57.6%** | 36.2% | 85.1% | 51.8% | 41.9% | 83.3% | — |

---

## Root Cause Analysis

There are two distinct layers of problems: **extraction** (getting tokens from Figma) and
**interpretation** (the agent mapping tokens to theme variables).

### Problem 1: Extraction targets wrong Figma nodes (CRITICAL)

The extraction script uses the `node-id` parameter from the Figma URL to scope its traversal.
For Libraries 2 and 3, the URLs pointed to **cover/overview pages**, not the actual design screens:

| Design | Node targeted | Nodes scanned | Colors found | Chart candidates |
|--------|--------------|---------------|--------------|-----------------|
| Library 1 | Full document (`0-1`) | 2,709 | 36 | 9 |
| Library 2 | Overview page (`103-52141`) | 46 | 9 | 6 (Figma logo colors!) |
| Library 3 | Cover page (`39-1402`) | 43 | 4 | 0 |
| Library 4 | Design root (`2-2`) | 610 | 39 | 8 |

**Library 2** extracted only Figma brand icons (`#1abcfe`, `#0acf83`, `#a259ff`) instead of the
actual blue SaaS palette (`#37A3FF`, `#FFBF60`, `#00CA75`). **Library 3** extracted only 4 colors
from a title card — zero chart colors.

**Impact:** This alone accounts for most of the score loss. Even a perfect interpretation agent
cannot recover from missing input data.

**Fix:** The extraction script should:
1. Default to the **full document** when the node-id points to a cover/overview page
2. Detect low-yield extractions (< 10 colors) and automatically retry with the root node
3. Allow the user to specify `--node=root` to override the URL's node-id
4. Add a warning when the extraction seems too sparse for theming

### Problem 2: Chart color classification is too aggressive (CRITICAL)

Even when the extraction captures enough nodes (Libraries 1 and 4), the `chartColorCandidates`
heuristic is unreliable:

| Design | Candidates extracted | Golden expected | Overlap |
|--------|---------------------|-----------------|---------|
| Library 1 | 9 (correct set) | 1 (`#5db075`) | 100% |
| Library 2 | 6 (Figma logo colors) | 5 (`#37A3FF`, etc.) | 0% |
| Library 3 | 0 | 8 (`#00C12B`, etc.) | 0% |
| Library 4 | 8 (all yellows) | 8 (`#EBD96B`, `#5162FA`, etc.) | 1 exact |

**Library 4** illustrates a subtle failure: the extraction found 8 "chart-like" colors, but
they're all yellow/gold variants from a single brand palette. The actual chart palette uses
diverse hues (blue, cyan, orange, purple, green, red) that only appear deeper in the Figma
document or not at all.

**Fix:**
- Improve color diversity detection — reject candidate sets with < 3 distinct hues
- When the Figma only shows one brand color, the agent should generate a complementary palette
- Cross-reference chart candidates against node context (e.g., ignore decorative/icon fills)

### Problem 3: Text color hierarchy is inverted (HIGH)

Across all 4 designs, the agent consistently mis-orders `muted` vs `subtle`:

| Design | text--muted agent | text--muted golden | text--subtle agent | text--subtle golden |
|--------|------------------|-------------------|-------------------|---------------------|
| Library 1 | `#666666` | `#bdbdbd` | `#999999` | `#666666` |
| Library 2 | `#1a3453` | `#212529` | `#1a3453` | `#212529` |
| Library 3 | `#1a1a1a` | `#666666` | `#1a1a1a` | `#212529` |
| Library 4 | `#7f7f7f` | `#C2C8DA` | `#8e8e8e` | `#C2C8DA` |

The agent treats `muted` as darker (more prominent) than `subtle`. The designer consistently
assigns `muted` as the **lightest** (least visible) text and `subtle` as a mid-emphasis role.

**Fix:** Update `.cursor/rules/theming-agent.mdc` with explicit ordering:
```
Text prominence (darkest → lightest):
  text → text--neutral → text--subtle → text--muted
```

### Problem 4: Background token semantics (MEDIUM)

The agent tends to swap `background` and `background--neutral`:

| Design | Agent's --background | Golden's --background |
|--------|---------------------|----------------------|
| Library 1 | `#ffffff` | `#fafafa` (card surface) |
| Library 4 | `#ffffff` | `#F4F6F5` (card surface) |

The designer treats `--em-sem-background` as the card/widget surface (slightly tinted) and
`--em-sem-background--neutral` as the page container (often pure white). The agent assumes
the opposite.

**Fix:** Update agent rules: "In most designs, `--em-sem-background` is the card surface
(may be off-white or tinted), while `--em-sem-background--neutral` is the outermost page
container (often pure white)."

### Problem 5: Status colors not in Figma (MEDIUM)

The golden standards define status colors that don't appear in the Figma extraction:

| Design | Error text (golden) | In extracted tokens? |
|--------|-------------------|--------------------|
| Library 1 | `#d92d20` | No |
| Library 2 | `#FF5758` | No |
| Library 3 | `#FF3333` | No |
| Library 4 | `#D50015` | No |

Designers bring in standard error/success colors from their design system knowledge. The Figma
files often don't contain explicit error/success states.

**Fix:**
- Add common default error/success colors to the agent rules as fallbacks
- When no status colors are found, prompt the user rather than guessing

### Problem 6: Inverted background heuristic (LOW)

The agent occasionally picks a dark UI element color (e.g., iOS status bar `#24262b`) instead
of pure `#000000` for `--em-sem-background--inverted`. Designers consistently expect `#000000`.

**Fix:** Default to `#000000` for inverted unless the design explicitly shows a different
dark surface for tooltips/overlays.

---

## Improvement Roadmap

### Phase 1: Extraction fixes (highest ROI)

These are the blocking issues — without good input data, the agent can't succeed:

| # | Fix | Expected impact | Effort |
|---|-----|----------------|--------|
| 1.1 | Auto-detect cover/overview nodes and retry with root | +15-20% on Libraries 2 & 3 | Medium |
| 1.2 | Add `--node=root` CLI flag to bypass URL node-id | Immediate workaround | Low |
| 1.3 | Warn on sparse extraction (< 10 colors) | Developer UX | Low |
| 1.4 | Improve chart color candidate diversity filter | +5-10% on Library 4 | Medium |
| 1.5 | Filter candidates by node context (ignore icons, OS chrome) | +5% across all | Medium |

### Phase 2: Agent rule improvements (high ROI)

These fix the interpretation layer — how the agent maps tokens to theme variables:

| # | Fix | Expected impact | Effort |
|---|-----|----------------|--------|
| 2.1 | Define text prominence ordering (muted = lightest) | +10-12% on Libraries 1 & 3 | Low |
| 2.2 | Define background semantics (background = card, neutral = page) | +2-5% on Libraries 1 & 4 | Low |
| 2.3 | Add default status color fallbacks | +3-5% on Libraries 1, 3, 4 | Low |
| 2.4 | Default inverted to `#000000` | +1-2% on Library 1 | Low |

### Phase 3: Advanced extraction (future)

| # | Fix | Expected impact | Effort |
|---|-----|----------------|--------|
| 3.1 | Fetch full document when node extraction is sparse | Best-of-both-worlds | High |
| 3.2 | Cross-page color frequency analysis | Better background/text classification | High |
| 3.3 | Component-aware extraction (identify chart components vs UI) | Much better chart colors | High |

---

## Projected Scores After Improvements

| Design | Current | After Phase 1 | After Phase 1+2 |
|--------|---------|--------------|-----------------|
| Library 1 | 80.4% | 80.4% | ~93-95% |
| Library 2 | 51.4% | ~70-75% | ~85-90% |
| Library 3 | 51.8% | ~65-70% | ~80-85% |
| Library 4 | 46.8% | ~60-65% | ~80-85% |
| **Average** | **57.6%** | **~69-72%** | **~85-89%** |

Phase 2 fixes (agent rules) are all low-effort and can be done immediately. Phase 1 fixes
(extraction) require code changes but have the highest overall impact.

---

## Key Takeaway

**The extraction script is the bottleneck, not the agent's interpretation logic.** When the
extraction produces good data (Library 1, where the full document was scanned), the agent
scores 80.4%. When the extraction targets the wrong node (Libraries 2 & 3), scores drop to
~50%. Fixing the extraction script's node selection is the single highest-ROI improvement.

The agent's interpretation also needs work — particularly the muted/subtle ordering — but
this is a quick fix in the rules file and would bring Library 1 from 80% to ~95%.
