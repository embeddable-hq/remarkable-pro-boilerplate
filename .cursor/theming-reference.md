# Embeddable Remarkable Pro — Theming Reference

This is the comprehensive reference for theming Remarkable Pro components via `embeddable.theme.ts`.
The agent should use this file as its primary knowledge source when generating or editing theme files.

## Architecture

### File: `embeddable.theme.ts`

```ts
import { defineTheme } from '@embeddable.com/core';
import { Theme, DeepPartial } from '@embeddable.com/remarkable-pro';

const themeProvider = (clientContext: any, parentTheme: Theme): Theme => {
  const newTheme: DeepPartial<Theme> = {
    // overrides go here
  };
  return defineTheme(parentTheme, newTheme) as Theme;
};

export default themeProvider;
```

- `defineTheme(parentTheme, childTheme)` deep-merges overrides with built-in defaults.
- Only override what you need — everything else inherits from `parentTheme`.
- The `Theme` type has these top-level keys: `styles`, `charts`, `i18n`, `formatter`, `defaults`.

### Theme type shape

```ts
type Theme = {
  i18n: ThemeI18n;          // language + translations (i18next Resource)
  charts: ThemeCharts;      // chart colors, color maps, legend position, per-chart options
  styles: ThemeStyles;      // CSS design tokens (552 variables)
  formatter: ThemeFormatter; // locale, number/date formatting
  defaults: ThemeDefaults;  // date ranges, comparison periods, menu options
};
```

---

## Token Layers (CSS Variables in `theme.styles`)

Remarkable uses a 3-layer token system. All tokens live in `theme.styles` as CSS variable strings.

### Layer 1: Core Tokens (`--em-core-*`)

Raw design primitives. Most teams do NOT override these.

| Category | Pattern | Example |
|----------|---------|---------|
| Border radius | `--em-core-border-radius--{scale}` | `--em-core-border-radius--200` = `8px` |
| Border width | `--em-core-border-width--{scale}` | `--em-core-border-width--025` = `1px` |
| Gray scale | `--em-core-color-gray--{scale}` | `--em-core-color-gray--0900` = `rgb(33 33 41)` |
| Font family | `--em-core-font-family--{name}` | `--em-core-font-family--base` = `inter` |
| Font size | `--em-core-font-size--{size}` | `--em-core-font-size--md` = `16px` |
| Font weight | `--em-core-font-weight--{weight}` | `--em-core-font-weight--bold` = `700` |
| Line height | `--em-core-line-height--{size}` | `--em-core-line-height--md` = `16px` |
| Shadow | `--em-core-shadow-*` | `--em-core-shadow-blur` = `40px` |
| Size scale | `--em-core-size--{scale}` | `--em-core-size--0800` = `32px` |
| Spacing scale | `--em-core-spacing--{scale}` | `--em-core-spacing--0400` = `16px` |

**Full gray scale (light → dark):**
- `--em-core-color-gray--0000` = `rgb(255 255 255)` (white)
- `--em-core-color-gray--0050` = `rgb(247 247 248)`
- `--em-core-color-gray--0100` = `rgb(237 237 241)`
- `--em-core-color-gray--0200` = `rgb(228 228 234)`
- `--em-core-color-gray--0300` = `rgb(210 210 213)`
- `--em-core-color-gray--0400` = `rgb(184 184 189)`
- `--em-core-color-gray--0500` = `rgb(144 144 152)`
- `--em-core-color-gray--0600` = `rgb(114 114 121)`
- `--em-core-color-gray--0700` = `rgb(92 92 102)`
- `--em-core-color-gray--0800` = `rgb(49 49 61)`
- `--em-core-color-gray--0900` = `rgb(33 33 41)`
- `--em-core-color-gray--1000` = `rgb(0 0 0)` (black)

### Layer 2: Semantic Tokens (`--em-sem-*`) — PRIMARY THEMING LAYER

These describe **what a value is used for**, not what color it is. This is where most theming work happens.

#### Backgrounds (ordered lightest → darkest)
| Token | Role | Components affected |
|-------|------|-------------------|
| `--em-sem-background--neutral` | Page / outermost container (often pure white) | Table headers/cells, select triggers/dropdowns, loaders |
| `--em-sem-background` | Card / widget surface (may be slightly off-white) | Card background, TextField, hover states |
| `--em-sem-background--light` | Secondary surfaces | Filled inputs, date range bg, grid lines, disabled buttons |
| `--em-sem-background--subtle` | Hover / soft emphasis | Active inputs, switch on, hover buttons |
| `--em-sem-background--muted` | Pressed / low-emphasis | Select border, active buttons |
| `--em-sem-background--inverted` | Dark / inverted surfaces (default: #000000) | Tooltips, filled selects, switch off state |

#### Text (ordered darkest → lightest)
| Token | Role | Components affected |
|-------|------|-------------------|
| `--em-sem-text` | Primary text (darkest) | Titles, labels, values, icons, all primary content |
| `--em-sem-text--neutral` | Near-primary emphasis | Loading indicators, category labels, active primary buttons |
| `--em-sem-text--subtle` | Mid-emphasis (medium gray) | Disabled states, placeholders, subtle grid lines |
| `--em-sem-text--muted` | Lowest emphasis (lightest gray) | Subtitles, descriptions, axes, legends, secondary buttons bg |
| `--em-sem-text--inverted` | Text on dark backgrounds (white) | Selected items, tooltip titles, primary buttons |

#### Status
| Token | Role |
|-------|------|
| `--em-sem-status-error-background` | Negative status backgrounds (KPI negative trend bg) |
| `--em-sem-status-error-text` | Error text, error borders, negative KPI trend |
| `--em-sem-status-success-background` | Positive status backgrounds (KPI positive trend bg) |
| `--em-sem-status-success-text` | Positive status text (KPI positive trend) |

#### Chart Colors (semantic)
| Token | Default |
|-------|---------|
| `--em-sem-chart-color--1` through `--em-sem-chart-color--10` | 10 chart series colors |

These provide CSS-variable-based chart colors. They are used by the heatmap and can be referenced by other tokens. For array-based chart colors, use `theme.charts.backgroundColors` instead.

### Layer 3: Component Tokens (`--em-{component}-*`)

Fine-grained per-component overrides. Use only when you need to deviate from the global theme for a specific component.

**Components with tokens:** actionicon, barchart, button, buttonicon, card, chart (shared), daterangepicker, divider, field, filter, ghostbutton, ghostbuttonicon, kpichart, linechart, markdown, overlay, piechart, selectfield, skeleton, switch, tablechart, textfield, tooltip.

Component tokens reference semantic or core tokens by default. Override them only for targeted component-specific tweaks.

---

## Chart Colors (`theme.charts`)

### Simple array (most common)

```ts
charts: {
  backgroundColors: ['#2563EB', '#DC2626', '#16A34A', '#F59E0B', '#8B5CF6', '#EC4899'],
  borderColors: ['#1D4ED8', '#B91C1C', '#15803D', '#D97706', '#7C3AED', '#DB2777'],
}
```

- `backgroundColors` = fills (bars, areas, pie segments)
- `borderColors` = strokes (outlines, line strokes)
- Values can be hex, rgb(a), or hsl(a)
- Colors cycle if more categories than colors
- Same category gets same color across charts (deterministic assignment)

### Color map (explicit value → color)

```ts
charts: {
  backgroundColorMap: {
    dimensionValue: {
      'customers.country.United States': '#2563EB',
    },
    measure: {
      'customers.count': '#ffe292',
    },
  },
}
```

### Legend position

```ts
charts: {
  legendPosition: 'top' | 'right' | 'bottom' | 'left',
}
```

---

## Fonts

**Custom fonts are NOT currently supported through theming.**

While core tokens like `--em-core-font-family--base` exist in the type system, there is no mechanism to load custom font files through the theme. The embedded components render inside an iframe/web component where the host page's fonts are not automatically available. The default font is Inter.

Do NOT include font-family overrides in generated themes. If a Figma file uses a custom font, note it in the summary but do not attempt to apply it.

---

## Figma-to-Theme Mapping Guide

When extracting design tokens from a Figma file, map them as follows:

| Figma concept | Theme location | Notes |
|---------------|---------------|-------|
| Brand/chart colors (palette) | `charts.backgroundColors` | Array of hex/rgb colors |
| Chart stroke colors | `charts.borderColors` | Slightly darker variants of background |
| Card/widget background | `styles['--em-sem-background']` | Card surface (may be off-white) |
| Page/canvas background | `styles['--em-sem-background--neutral']` | Outermost container (often pure white) |
| Primary text color | `styles['--em-sem-text']` | Darkest text |
| Near-primary text | `styles['--em-sem-text--neutral']` | Nearly as dark as primary |
| Mid-emphasis text | `styles['--em-sem-text--subtle']` | Medium gray for placeholders |
| Low-emphasis text | `styles['--em-sem-text--muted']` | Lightest gray for descriptions, legends |
| Dark/inverted surface | `styles['--em-sem-background--inverted']` | Default `#000000` for tooltips |
| Error color | `styles['--em-sem-status-error-text']` | Default `#d92d20` if absent |
| Success color | `styles['--em-sem-status-success-text']` | Default from brand green or `#16a34a` |
| Font family | NOT SUPPORTED | Custom fonts cannot be loaded through theming |
| Border radius (global) | `styles['--em-core-border-radius--200']` | Adjust the 200 scale step |
| Card border radius | `styles['--em-card-border-radius']` | Component-level override |
| Card padding | `styles['--em-card-padding']` | Component-level override |
| Dark mode surfaces | `styles['--em-sem-background']` etc. | Invert the gray scale references |

---

## Palette Derivation (ONLY for missing tokens)

**Extraction candidates are the primary source of truth.** Use them as-is first. Only after
mapping all available candidates, check which of the 15 semantic color tokens are still
unset. Apply these derivation formulas ONLY to those genuinely missing tokens.

**Do NOT re-derive tokens that already have extraction values.** The extraction saw the
actual Figma file — trust its values over computed interpolations.

### Inputs

Before deriving, identify these anchor colors from the extraction (used only for gaps):

| Anchor | Source | Fallback |
|--------|--------|----------|
| **Primary text** | Darkest `textColorCandidate`, or darkest color with luminance < 0.05 | `#000000` |
| **Card background** | `backgroundCandidates['--em-sem-background']` or lightest neutral | `#FAFAFA` |
| **Page background** | `backgroundCandidates['--em-sem-background--neutral']` or pure white | `#FFFFFF` |
| **Brand chromatics** | `chartColorCandidates` (the palette's vivid accent colors) | — |

### Formulas

All interpolation uses **linear interpolation in sRGB space** on each channel independently.
`mix(a, b, t)` means `a + (b − a) × t` per channel, where `t = 0` returns `a` and `t = 1` returns `b`.

#### Text hierarchy (derive only tokens missing from extraction)

Starting anchors: `textColor` (primary text) and `cardBg` (card background).
**Skip any token that already has an extraction value.**

```
--em-sem-text           = textColor                      (use extraction value)
--em-sem-text--neutral  = mix(cardBg, textColor, 0.90)   (90% toward text)
--em-sem-text--subtle   = mix(cardBg, textColor, 0.55)   (55% toward text)
--em-sem-text--muted    = mix(cardBg, textColor, 0.30)   (30% toward text)
--em-sem-text--inverted = pageBg or #FFFFFF               (lightest surface)
```

Example: if extraction provides `text`, `neutral`, and `subtle` — use those three as-is
and only derive `muted` and `inverted`.

This preserves the hue/warmth of `textColor` through derived values.

#### Background hierarchy (derive only tokens missing from extraction)

Starting anchors: `pageBg` (page background) and `cardBg` (card background).
**Skip any token that already has an extraction value.**

The "step color" is the darker direction — derived from the primary text at low opacity.

```
stepColor = mix(cardBg, textColor, 0.08)  — a hint of text darkness

--em-sem-background--neutral  = pageBg                           (purest surface)
--em-sem-background           = cardBg                           (card surface)
--em-sem-background--light    = mix(cardBg, stepColor, 0.40)     (~3-5% darker)
--em-sem-background--subtle   = mix(cardBg, stepColor, 1.0)      (~8% darker)
--em-sem-background--muted    = mix(cardBg, stepColor, 2.0*)     (~15% darker)
--em-sem-background--inverted = darkest design element or #000000
```

*For `--muted`, clamp the result so it stays darker than `--subtle` but not too heavy.
In practice: take `--subtle` and mix it 50% further toward the text color.

#### Status colors (only when `statusColorCandidates` is empty)

1. **Classify palette warmth**: compute the average hue of all chromatic `chartColorCandidates` (saturation > 20%).
   - Warm (hue 0–60 or 300–360): error red = `#D92D20`
   - Cool (hue 120–270): error red = `#DC2626`
   - Neutral / mixed: error red = `#D92D20`
2. **Success text**: reuse the greenest chart color (hue 90–170). If none, pick `#16A34A` for vivid palettes or `#5DB075` for muted palettes.
3. **Status backgrounds**: blend the status text color at 8% over the card background:
   ```
   statusBg = mix(cardBg, statusTextColor, 0.08)
   ```

#### Chart palette expansion (only when fewer than 6 extracted chart colors)

1. Convert existing colors to HSL.
2. Compute the average saturation (`S_avg`) and lightness (`L_avg`).
3. Identify hue gaps by sorting existing hues and finding the largest gaps.
4. Fill gaps by placing new colors at the midpoints, using `S_avg` and `L_avg`.
5. Ensure every pair of colors has ≥ 30° hue separation.
6. Target 8 total colors.
7. `borderColors[i]` = `backgroundColors[i]` with lightness reduced by 15%.

### Worked Example

**Input**: Warm green palette from Figma extraction:
- Chart candidates: `#5DB075`, `#FFB84E`, `#5162FA`
- Extracted backgrounds: `neutral` → `#FFFFFF`, `background` → `#FAFAFA` (only 2 of 6)
- Extracted text: `text` → `#000000`, `subtle` → `#666666` (only 2 of 5)
- Status candidates: empty
- Card background anchor: `#FAFAFA`
- Page background anchor: `#FFFFFF`

**Step 1 — Text tokens (use extraction, derive only gaps):**
```
text           = #000000                            (EXTRACTED — keep as-is)
text--neutral  = mix(#FAFAFA, #000000, 0.90)  ≈ #191919   (DERIVED — missing)
text--subtle   = #666666                            (EXTRACTED — keep as-is)
text--muted    = mix(#FAFAFA, #000000, 0.30)  ≈ #B2B2B2   (DERIVED — missing)
text--inverted = #FFFFFF                             (DERIVED — missing)
```

**Step 2 — Background tokens (use extraction, derive only gaps):**
```
stepColor = mix(#FAFAFA, #000000, 0.08) ≈ #E7E7E7

background--neutral  = #FFFFFF          (EXTRACTED — keep as-is)
background           = #FAFAFA          (EXTRACTED — keep as-is)
background--light    = mix(#FAFAFA, #E7E7E7, 0.40) ≈ #F3F3F3   (DERIVED — missing)
background--subtle   = mix(#FAFAFA, #E7E7E7, 1.0)  ≈ #E7E7E7   (DERIVED — missing)
background--muted    = mix(#E7E7E7, #000000, 0.08)  ≈ #D5D5D5   (DERIVED — missing)
background--inverted = #000000                                    (DERIVED — missing)
```

**Step 3 — Status colors (all derived — no extraction candidates):**
Palette hues: `#5DB075` → ~140° (green), `#FFB84E` → ~37° (amber), `#5162FA` → ~235° (blue).
Average hue ≈ 137° — mixed/slightly cool.
- Error text: `#D92D20` (standard warm red)
- Error background: `mix(#FAFAFA, #D92D20, 0.08)` ≈ `#FDE8E5`
- Success text: `#5DB075` (greenest chart color, hue 140°)
- Success background: `mix(#FAFAFA, #5DB075, 0.08)` ≈ `#EEF7F1`

**Step 4 — Chart expansion (3 → 8):**
Existing hues: 140°, 37°, 235°. Gaps: 37→140 (103°), 140→235 (95°), 235→37 (162°).
Fill the largest gaps:
- Gap 235→37: insert at ~316° (magenta) and ~358° (red)
- Gap 37→140: insert at ~88° (lime-green)
- Gap 140→235: insert at ~188° (teal)
- Add one more at ~270° (purple)

Result (8 colors, all ≥30° apart):
```
#5DB075, #FFB84E, #5162FA, #E84E8A, #F76C5E, #8CC63F, #2BBCB3, #A35FE0
```
Border colors: each darkened 15%.

---

## Rules for the Agent

1. **Always use semantic tokens** (`--em-sem-*`) as the primary theming layer.
2. **Never modify core tokens** (`--em-core-*`) unless the user explicitly asks to redefine design foundations (spacing scale, typography scale, gray palette).
3. **Use component tokens** (`--em-{component}-*`) only for targeted per-component tweaks.
4. **Chart colors go in `theme.charts`**, not in `theme.styles` (except `--em-sem-chart-color--N` which are CSS variable equivalents).
5. **Do NOT set font tokens** — custom fonts are not supported through theming.
6. **Always produce valid TypeScript** that matches `DeepPartial<Theme>`.
7. **Preserve the themeProvider function signature** — don't change the exports or imports.
8. **Values can be**: hex (`#fff`), rgb (`rgb(255 255 255)`), rgba, hsl, hsla, or `var(--em-core-*)` references.
9. When creating a dark theme, **invert the gray scale**: backgrounds use high numbers (0700-1000), text uses low numbers (0000-0300).
10. When asked about border radius or spacing, modify the core scale tokens, not individual component tokens (unless specifically asked).

---

## Example: Complete Brand Theme

```ts
import { defineTheme } from '@embeddable.com/core';
import { Theme, DeepPartial } from '@embeddable.com/remarkable-pro';

const brandTheme: DeepPartial<Theme> = {
  charts: {
    backgroundColors: [
      '#2563EB', '#DC2626', '#16A34A', '#F59E0B',
      '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
    ],
    borderColors: [
      '#1D4ED8', '#B91C1C', '#15803D', '#D97706',
      '#7C3AED', '#DB2777', '#0D9488', '#EA580C',
    ],
  },
  styles: {
    '--em-sem-background--neutral': '#ffffff',
    '--em-sem-background': '#f9fafb',
    '--em-sem-background--light': '#f3f4f6',
    '--em-sem-background--subtle': '#e5e7eb',
    '--em-sem-background--muted': '#d1d5db',
    '--em-sem-background--inverted': '#000000',

    '--em-sem-text': '#1a1a2e',
    '--em-sem-text--neutral': '#374151',
    '--em-sem-text--subtle': '#6b7280',
    '--em-sem-text--muted': '#9ca3af',
    '--em-sem-text--inverted': '#ffffff',

    '--em-sem-status-error-text': '#dc2626',
    '--em-sem-status-error-background': '#fef2f2',
    '--em-sem-status-success-text': '#16a34a',
    '--em-sem-status-success-background': '#f0fdf4',
  },
};

const themeProvider = (clientContext: any, parentTheme: Theme): Theme => {
  return defineTheme(parentTheme, brandTheme) as Theme;
};

export default themeProvider;
```
