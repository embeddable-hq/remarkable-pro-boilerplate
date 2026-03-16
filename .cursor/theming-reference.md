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

#### Backgrounds
| Token | Role | Components affected |
|-------|------|-------------------|
| `--em-sem-background` | Primary interactive/hover surfaces | Card background, TextField, hover states |
| `--em-sem-background--inverted` | Dark/inverted surfaces | Tooltips, filled selects, switch off state |
| `--em-sem-background--light` | Light emphasis, secondary | Filled inputs, date range bg, grid lines, disabled buttons |
| `--em-sem-background--muted` | Pressed/low-emphasis | Select border, active buttons |
| `--em-sem-background--neutral` | Default container surfaces | Table headers/cells, select triggers/dropdowns, loaders |
| `--em-sem-background--subtle` | Hover/soft emphasis | Active inputs, switch on, hover buttons |

#### Text
| Token | Role | Components affected |
|-------|------|-------------------|
| `--em-sem-text` | Primary text | Titles, labels, values, icons, all primary content |
| `--em-sem-text--inverted` | Text on dark backgrounds | Selected items, tooltip titles, primary buttons |
| `--em-sem-text--muted` | Secondary/supporting text | Subtitles, descriptions, axes, legends, secondary buttons bg |
| `--em-sem-text--neutral` | Neutral emphasis | Loading indicators, category labels, active primary buttons |
| `--em-sem-text--subtle` | Disabled/low-contrast | Disabled states, subtle grid lines |

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
| Primary background | `styles['--em-sem-background']` | Usually the card/widget bg |
| Page/canvas background | `styles['--em-sem-background--neutral']` | The container/page surface |
| Primary text color | `styles['--em-sem-text']` | Darkest text |
| Secondary text color | `styles['--em-sem-text--muted']` | Lighter text for subtitles |
| Disabled text | `styles['--em-sem-text--subtle']` | Lightest text |
| Error color | `styles['--em-sem-status-error-text']` | Red tones |
| Success color | `styles['--em-sem-status-success-text']` | Green tones |
| Font family | NOT SUPPORTED | Custom fonts cannot be loaded through theming |
| Border radius (global) | `styles['--em-core-border-radius--200']` | Adjust the 200 scale step |
| Card border radius | `styles['--em-card-border-radius']` | Component-level override |
| Card padding | `styles['--em-card-padding']` | Component-level override |
| Dark mode surfaces | `styles['--em-sem-background']` etc. | Invert the gray scale references |

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
    '--em-sem-text': '#1a1a2e',
    '--em-sem-text--muted': '#6b7280',
    '--em-sem-text--subtle': '#9ca3af',
    '--em-sem-background': '#ffffff',
    '--em-sem-background--neutral': '#f9fafb',
    '--em-sem-background--light': '#f3f4f6',
    '--em-sem-background--muted': '#e5e7eb',
    '--em-sem-background--subtle': '#f3f4f6',
    '--em-sem-background--inverted': '#1f2937',
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
