# Design Universal Rules

Standalone design quality rules derived from designer evaluations of AI-generated themes.
Rules are organized by the scoring rubric categories and evolve incrementally as new evaluation rounds are completed.

---

## Visual Match

_Rules for achieving high fidelity to the source Figma design._

1. Cross-reference every primary interactive element (buttons, links, active/hover states) against the Figma design before finalizing the theme.
2. Brand/accent color tinting must be limited to designated semantic tokens (`--em-sem-background--subtle`, `--em-sem-background--muted`) — never applied to component surfaces like tables, dropdowns, or menus.

---

## Primary Color

_Rules for correctly identifying and applying the brand's primary color._

1. The button default-state color MUST exactly match the primary/brand color hex value from the Figma design. This was the single most recurring failure (Rounds #2, #3, #4).
2. After generating a theme, explicitly verify button background tokens against the Figma primary color. If using Figma tokens, map the primary action color to the button background token, not just to `--em-sem-background--inverted`.

---

## Palette Harmony

_Rules for generating chart and accent color palettes that work well together._

1. Secondary interactive elements (select menus, secondary buttons) should share the color relationships visible in the Figma design (e.g., if Figma shows a yellow secondary button, the select menu highlight should use that same yellow).
2. Avoid generating accent palettes in isolation — always cross-check that secondary/tertiary colors are actually present in the Figma file.

---

## Contrast

_Rules for ensuring text/background contrast meets readability standards._

1. All hover and focus states must maintain a minimum **4.5:1** contrast ratio (WCAG AA) between foreground text and background.
2. Select menu item hover states require both distinct visual differentiation AND readable text — test light-text-on-light-bg and dark-text-on-dark-bg edge cases.
3. Action icons must remain clearly visible in all states (default, hover, active, disabled).

---

## Component Consistency

_Rules for maintaining consistent styling across all component types._

1. Table backgrounds MUST default to white (`#ffffff`) or the base `--em-sem-background` value. Never set table backgrounds to a brand-tinted color.
2. Select menu / dropdown backgrounds MUST be white or the neutral background token. Brand colors must not bleed into dropdown surfaces.
3. When brand colors are warm (yellow, amber, gold), be especially cautious about `--em-sem-background--neutral/--light/--muted` bleeding into tables and select menus — verify these components explicitly.

---

## Charts

_Rules for chart-specific color and styling accuracy._

1. Chart color palettes should be distinguishable from each other and from the background at both full and reduced opacity.
2. When the Figma design defines explicit chart/series colors, use them directly rather than generating derivatives.

---

## General

_Cross-cutting rules that apply to multiple categories._

1. Brand color should NOT be used as a tint for every background token. Reserve brand-tinted backgrounds for `--em-sem-background--subtle` at most.
2. After generating any theme, run a "neutral surface audit": confirm that tables, select menus, cards, and modals use neutral (white/gray) backgrounds unless the Figma design explicitly shows otherwise.
3. When the primary brand color is a warm hue (yellow, amber, gold), extra vigilance is needed — warm tints are the most common source of "yellowish table/menu" defects.
