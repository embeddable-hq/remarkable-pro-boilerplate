# Theming & CSS variables
How a custom component stays on-theme and exposes two levels of override, the way the Pro components do.

## The three-layer model (and why component tokens matter)
Remarkable uses a three-layer CSS-variable hierarchy:
1. **Core** — raw primitives (`--em-core-color-gray--0900`, `--em-core-spacing--0300`).
2. **Semantic** — meaningful base tokens that reference core (`--em-sem-text`, `--em-sem-background--subtle`, `--em-sem-chart-color--1`).
3. **Component** — per-component tokens whose **value references a semantic/core token** (`'--em-filterbuilder-gap': 'var(--em-core-spacing--0300)'`).

Pro components paint themselves with **their own component tokens**, never base tokens directly. That is deliberate — it gives consumers two override levels:
- Override a **base** token in `embeddable.theme.ts` → **sweeping** change everywhere that token is used.
- Override a **component** token → **targeted** change to just that one component.

**Custom components should follow the same model** — don't hard-code base tokens into the component; define component tokens that default to base tokens, and paint with the component tokens.

## How to do it (self-contained — works in any repo, no scaffolding)
The skill generates **only the component files**. It does not touch the consumer's theme provider or add a styles registry — so the whole pattern lives inside the component, via one inline fallback chain:

```tsx
// component token  ->  base token  ->  literal
fill: 'var(--em-funnel-bar-color, var(--em-sem-chart-color--1, #4b86ff))'
```
- component token unset → falls back to the **base** token (themed)
- base token unset → falls back to the literal

That single line already provides **both override levels**, with zero wiring in any repo:
- Override the **base** token (`--em-sem-chart-color--1`) in `theme.styles` → **sweeping** (type-safe everywhere).
- Override the **component** token (`--em-funnel-bar-color`) in `theme.styles` → **targeted** (custom key → needs a cast, see below).

**Overriding is a consumer action (not scaffolded by the skill)** — in their `embeddable.theme.ts`:
```ts
return defineTheme(parentTheme, {
  styles: {
    '--em-sem-chart-color--1': 'rgb(75 134 255)',            // sweeping  (type-safe)
    '--em-funnel-bar-color': 'var(--em-sem-chart-color--5)', // targeted  (custom key -> cast)
  } as Record<string, string>,
} as DeepPartial<Theme>) as Theme;
```

> **Optional — central defaults.** A repo *may* centralise its component-token defaults in a constants object merged into its theme provider (this boilerplate does, in `src/embeddable.com/components/component.styles.ts` + `embeddable.theme.ts`). That is a per-repo convenience — **not required, and the skill never generates it**; the inline fallback above is the portable mechanism. If a repo does centralise, merge defaults *before* overrides in the theme provider, and **never inject from `embeddable.lifecycle.ts`** (`onThemeUpdated` runs *after* the theme is applied and would clobber a consumer's override).

## Chrome-token fallback chain — worked example
A real component uses the three-token chain for every chrome colour. Here is the full set for a hypothetical ranked-bar chart:

```tsx
// In the React component's render (inline style or style object):

// Bar fill — data value colour (NOT a chrome token; use getDimensionMeasureColor instead).
// Single object arg, all fields required; keep the palette fallback (see pro-builtins.md):
const chartColors = getChartColors();
const barColor =
  getDimensionMeasureColor({ dimensionOrMeasure: measure, theme, color: 'background',
    value: `${measure.name}`, index, chartColors }) || chartColors[index % chartColors.length];

// Label text — three-level chrome token chain:
const labelColor = 'var(--em-rankedbar-label-color, var(--em-sem-text--muted, #6b7280))';

// Axis line — muted border:
const axisColor  = 'var(--em-rankedbar-axis-color, var(--em-sem-background--subtle, #e5e7eb))';

// Card background (usually inherited from ChartCard, but if overridden):
const bgColor    = 'var(--em-rankedbar-bg, var(--em-sem-background, #ffffff))';

// Hover highlight (a semi-transparent overlay over the bar):
const hoverColor = 'var(--em-rankedbar-hover, var(--em-sem-background--light, rgba(0,0,0,0.06)))';
```

Rules visible in the example:
- **Data colours** (`barColor`) come from `getDimensionMeasureColor` — never a CSS token.
- **Every chrome token** has a three-level chain: component token → semantic base token → literal hex.
- The semantic tokens (`--em-sem-text--muted`, `--em-sem-background--subtle`, etc.) are real — verify against the list below; wrong names fail silently.
- The literal fallback is the **last resort** and makes the component usable even outside the Embeddable theme injection.
- Consumers override either level in `theme.styles`; the component doesn't need to know.

## Use real base-token names (verify, don't guess)
`theme.styles` is typed `ThemeStyles = Styles & StylesRemarkablePro`, both **auto-generated from `global.css`** — closed `Record<Keys, string>` with no index signature. The authoritative names live in `node_modules/@embeddable.com/remarkable-ui/dist` (core + semantic) and `…/remarkable-pro/dist/theme/styles/styles.constants.d.ts` (Pro component tokens); `dark-theme.ts` is a real sample. Common **semantic** base tokens:
- Text: `--em-sem-text`, `--em-sem-text--inverted`, `--em-sem-text--muted`, `--em-sem-text--neutral`, `--em-sem-text--subtle`
- Surfaces: `--em-sem-background`, `--em-sem-background--inverted`, `--em-sem-background--light`, `--em-sem-background--muted`, `--em-sem-background--neutral`, `--em-sem-background--subtle`
- Palette accents: `--em-sem-chart-color--1` … `--em-sem-chart-color--10` — fine for incidental accents, but **do not use these for data *value* colours**; value colours come from the theme palette via `getChartColors()` + `getDimensionMeasureColor` (see [pro-builtins.md](pro-builtins.md)).
- Status: `--em-sem-status-success-text`, `--em-sem-status-success-background`, `--em-sem-status-error-text`, `--em-sem-status-error-background`

**Names that do NOT exist (common mistakes):** `--em-sem-border`, `--em-sem-text--inverse` (it's `--inverted`), `--em-sem-background--brand`, `--em-sem-status-warning`, `--em-sem-status-danger`. A wrong name silently uses your literal fallback and is **not** overridable. Always include the literal fallback anyway.

## Type-safe component-token overrides
**Custom keys work at runtime today — no upstream change needed.** Verified against the compiled SDK: `defineTheme` is `mergician(parentTheme, childTheme)` (a generic deep-merge that preserves unknown keys), and the theme applier writes the stylesheet by iterating `Object.keys(styles)` into a single `:root { … }` `<style>` — there is no known-token allowlist. So any `--em-*` key you place in `theme.styles` is injected and takes effect.

The closed `ThemeStyles` type only blocks it at **compile time**: a *custom* component token (`--em-funnel-bar-color`) isn't a known key, so setting it through `theme.styles` needs the `as Record<string, string>` cast (already in `embeddable.theme.ts`). `injectCssVariables(record)` (exported from `@embeddable.com/remarkable-pro`) is an alternative runtime entry point. **Base-token** overrides are type-safe as-is; only the new custom keys need the cast.

To make custom component tokens first-class (type-safe in `theme.styles`, no cast), add a template-literal index signature to the styles type **upstream** — a one-line change for the library team in `remarkable-pro/src/theme/styles/styles.types.ts`:
```ts
export type ThemeStyles = Styles & StylesRemarkablePro & { [key: `--em-${string}`]: string };
```
This keeps autocomplete for the known tokens while admitting any `--em-*` consumer token. (Equivalently it can live on `Styles` in remarkable-ui.) The trade-off is slightly weaker typo-checking on style keys; scope it to a dedicated extension slot if that matters. Until that lands, the cast in `embeddable.theme.ts` is the supported path.

## Per-chart Chart.js overrides (primitive-based charts only)
Components built on the Chart.js primitives also get typed per-component option overrides via `theme.charts.<componentKey>?.options` (e.g. `theme.charts.pieChartPro`). Hand-rolled SVG/HTML components don't have an entry there; they theme entirely through the component/base CSS tokens above.
