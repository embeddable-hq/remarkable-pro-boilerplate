---
name: theming
description: Use when the user wants to style, theme, brand, restyle, or white-label their Embeddable dashboards — any change to how dashboards LOOK, workspace-wide. Covers extracting a brand from Figma files or screenshots, an existing website/app, a design-token file (Tailwind config, CSS variables, style guide), or a verbal description; generating light/dark theme files (`themes/*.theme.ts` of CSS `--em-*` tokens); chart color palettes and per-value color pins; fonts (Google or self-hosted); corner radius, shadows, status colors; chart appearance (legend position, per-chart-type Chart.js options); wiring the theme provider (`embeddable.theme.ts`) and builder "View as" presets (`client-contexts.cc.yml`). Triggers on "match our brand", "make it look like our app/site", "dark mode", "change the chart colors", "use our font", "rounder corners", "white-label", "hide the legend", or any work on `embeddable.theme.ts`, `dark-theme.ts`, or `themes/*.theme.ts` — even when the user just pastes a screenshot or URL and says "make it look like this". NOT for translations/locales, export menus, or date-range options (functional config, out of scope here); per-widget styling on one dashboard → `dashboard-as-code`; styling custom components from inside their TSX → `build-component`.
---
# Theming (styling)
Generate and edit workspace **styling** for `@embeddable.com/remarkable-pro`: take the brand from **any source** (Figma exports, an existing website, a design-token file, or a short interview), condense it into a **Brand Sheet** the user confirms, then map it deterministically onto theme files, provider wiring, and builder presets. A theme is a `DeepPartial<Theme>` that `defineTheme` deep-merges onto the library's base theme (`remarkableTheme`, exported from the package root) — override the minimum; everything else inherits.
On `embeddable:push` the theme ships with the workspace bundle; published dashboards pin versions, so a pushed theme change reaches a live embed only when its dashboard is re-published.

## Doctrine: first themes are core + semantic only
All styling flows through three layers of `--em-*` CSS tokens (defaults: `node_modules/@embeddable.com/remarkable-ui/dist/global.css`; pro-only additions: `node_modules/@embeddable.com/remarkable-pro/dist/theme/styles/styles.constants.d.ts`): **core** (~80 primitives — gray ramp, font families/sizes, radius, spacing, shadows), **semantic** (25 — surfaces, text, status, `--em-sem-chart-color--1..10`; every component maps onto these), **component** (~750 per-component knobs). A first theme overrides **semantic tokens plus a few core ones** (font family, radius) and stops there:
- ~25 semantic overrides repaint every component — including components the library adds in future releases **and** custom components built by the `build-component` skill (their tokens fall back to semantic).
- Component tokens pin **today's** component set: new components never see them, and names drift across releases and **fail silently** when renamed.
- **Escalation rule:** touch a component token only for a named, visible problem that semantic/core can't express. Comment why, group them at the end of the theme file, and re-verify them after `embeddable:upgrade`. A deliberate deep restyle (Strategy B in [references/mapping.md](references/mapping.md)) accepts this maintenance cost knowingly.

The component-*author* view of the same token system (fallback chains inside TSX) is [../build-component/references/theming.md](../build-component/references/theming.md) — different audience, don't mix them up.

## Entry modes: create vs extend
- **Extend** — a theme already exists and the request is a tweak or addition ("rounder corners", "add a dark variant", "swap the chart palette", "the table headers look wrong"). **No intake, no Brand Sheet.** Make the smallest-diff edit at the right layer ([references/mapping.md](references/mapping.md) → Targeted edits), reuse their existing values (derive dark from *their* light, not a fresh palette), and keep their file layout — migrate to `themes/` only with consent.
- **Create** — no real theme yet (the light branch is empty boilerplate), or an explicit rebrand. Full workflow below.

## Every source converges on the Brand Sheet
Never write tokens straight off a screenshot, a website, or a pasted token dump. Fill the Brand Sheet ([references/brand-sheet.md](references/brand-sheet.md)), present it compactly, and get one yes. That is the only **design** gate — after it, no more look-and-feel questions; omitted fields take the sheet's documented defaults. (The Safety-rules confirmations — renaming clientContext keys, dropping shared presets, migrating files — still apply.)

## File locations
| File | Role |
|---|---|
| `embeddable.theme.ts` (repo root) | The provider: `themeProvider(clientContext, parentTheme)` — the theme lookup map |
| `themes/<brand>.theme.ts` | One file per brand, exporting the light and dark variants from one shared palette |
| `src/embeddable.com/presets/client-contexts.cc.yml` | "View as" presets shown in the builder |
| `dark-theme.ts` (repo root) | Legacy single-theme file — when restructuring, migrate its content into `themes/` and don't leave both wired |
| `embeddable.lifecycle.ts` | **Not** a theming surface: unwired in this repo's config, and fonts go through `theme.fonts`, never this hook |

## Critical wiring facts
1. `defineTheme` deep-merges objects but **replaces arrays** — `fonts.google`, `charts.backgroundColors`. When adding a Google font, re-include `{ name: 'Inter' }` (the base UI font) or replace it deliberately.
2. Chart palettes are customized via the **`theme.charts.backgroundColors` array**, not by overriding the `--em-sem-chart-color--N` tokens (those are only the library's built-in fallback — resolution order in [references/mapping.md](references/mapping.md)). Colors bind to dimension values in **first-seen order, cached in sessionStorage per theme** (the cache key hashes the whole theme object): keep the array order identical across light/dark variants so "Germany" keeps its hue in both.
3. Non-catalogued `--em-*` keys (e.g. a custom component's tokens) work at runtime — the injector iterates all keys — but the closed `ThemeStyles` type blocks them at compile time: add `as Record<string, string>` on the `styles` object.
4. The provider runs on every theme change in builder and embeds — keep it **pure and synchronous** (no fetches, no globals). `clientContext.timezone` is applied by the library automatically; never wire it.
5. The **page behind the cards is not a token** — it's the host app's CSS; in the builder it's the preset's `canvas.background`. (The `--em-canvas-*` tokens style the drilldown/configurator *overlay*, not the page.) The Brand Sheet's `surfaces.page` lands there, not in `styles`.
6. Changing `fonts.google` mid-session does nothing until a **hard reload** — the Google Fonts `<link>` injects once per page and never re-injects.

## Workflow
Create mode runs 1–9; extend mode runs 1–2 then jumps to the relevant step and finishes with 8–9.
1. **Read the current state.** `embeddable.theme.ts`, `dark-theme.ts`, `themes/`, `client-contexts.cc.yml`, and any custom components under `src/embeddable.com/components/`. Never clobber existing customizations.
2. **Pick the entry mode** (above). Extend → jump to the matching branch of the Theme tree below (style/tokens → mapping.md §Targeted edits; palettes → mapping.md §Chart palettes; legend / Chart.js behavior → chart-behavior.md); smallest-diff edits, then verify + hand off.
3. **Establish source + scope.** Which intake path fits what the user has? One clarifying exchange max — the Brand Sheet's defaults settle everything else. Always derive a dark variant alongside light (cheap to drop later).
4. **Extract the Brand Sheet** per [references/intake.md](references/intake.md). Present it; **wait for confirmation**.
5. **Map to theme files** per [references/mapping.md](references/mapping.md) → `themes/<brand>.theme.ts` exporting `<brand>Light` / `<brand>Dark` from one shared palette block. Strategy A (semantic) unless the sheet demands a deep restyle. Run the contrast gate. Migrate any `dark-theme.ts` content while you're here.
6. **Wire the provider** per [references/provider-and-presets.md](references/provider-and-presets.md) — the theme lookup map with aliases and fallbacks.
7. **Append "View as" presets** — naming and curation rules in [references/provider-and-presets.md](references/provider-and-presets.md).
8. **Verify** per [references/verification.md](references/verification.md): targeted tsc (**not** `npm run ct` — wrong scope), `npm run embeddable:build` (safe), contrast check. Fix until green.
9. **Hand off, outcome-first.** Template in [references/verification.md](references/verification.md): state what's verified, enumerate the exact presets to click in `npm run dev`, then wait for the user's visual confirmation. The agent never runs `embeddable:push` or `dev`.

## The Theme tree — open only the branch you need
The styling surface of the `Theme` object. Route by key; read just that reference:
```
Theme
├─ styles         --em-* tokens: surfaces, text, status, radius, shadows, font assignment → mapping.md
├─ fonts          loading Google / self-hosted font files                                 → mapping.md §Fonts
├─ charts
│  ├─ backgroundColors / borderColors / *ColorMap — palettes + per-value pins             → mapping.md §Chart palettes
│  └─ legendPosition / <variant>.options — legend placement, Chart.js appearance          → chart-behavior.md
└─ clientContext  the embed's INPUT, reflected read-only — never authored in a theme      → provider-and-presets.md
```
`Theme` also carries `defaults` (export menu, date ranges, comparisons, cell-style rules), `i18n`, and `formatter` — **functional configuration, deliberately out of this skill's scope**; if the user asks for those, say so rather than improvising.
Workflow docs (not Theme keys): [references/brand-sheet.md](references/brand-sheet.md) (the contract + defaults policy) · [references/intake.md](references/intake.md) (Figma / website / token-file / interview extraction) · [references/verification.md](references/verification.md) (checks + handoff).

Official docs (mechanics; this skill adds the intake → mapping workflow): https://docs.embeddable.com/component-libraries/remarkable-pro/theming

## Examples
Complete, typechecked files — read on demand, copy and adapt (see [examples/README.md](examples/README.md) for the matrix and install notes):
- [examples/atlas-light-dark/](examples/atlas-light-dark/) — semantic-level brand theme: light + dark from one palette, Google font, **zero component tokens**, plus the canonical provider and presets.
- [examples/aurora-deep/](examples/aurora-deep/) — deliberate deep restyle: core-ramp re-tint + curated component tokens, maintenance trade-off stated.

## Safety rules
- **Never run `embeddable:push` or `embeddable:dev`/`dev`** (root `CLAUDE.md`). `embeddable:build` is safe and local.
- **Don't rely on `npm run ct` for theme files** — `tsconfig.json` only includes `src/`, so root theme files need the targeted tsc command in [references/verification.md](references/verification.md).
- **clientContext keys are a host-app contract.** Host apps pass `theme: 'dark'` (etc.) at embed time — renaming or removing a theme key breaks their live embeds. Confirm first and keep old keys working as aliases.
- `client-contexts.cc.yml` is builder-only (safe to edit) but shared with the team — append and renumber; never drop entries without asking.
- Never edit `node_modules` or `global.css`; base-theme changes belong upstream in remarkable-ui/-pro.

## Out of scope
- **Languages/translations, locales, number/date formats** (`theme.i18n`, `theme.formatter`) and **option lists** (`theme.defaults`: export menu, date-range presets, comparison periods, table cell-style rules) — functional configuration, not styling; no skill covers them today, so flag it to the user instead of winging it.
- Styling **custom components** from inside their TSX (component-token fallback chains) → the `build-component` skill.
- Dashboards / `*.embeddable.yml`, including **per-widget styling via builder inputs** (one chart's color pick, one legend toggle, per-field formatting) → `dashboard-as-code`. The dividing line: theming owns how things look *everywhere*; how one widget looks on one dashboard is a widget input. Cube models → `create-models`. Security-context presets (`*.sc.yml`) — no skill yet.
- Library styling defects → report upstream per [../build-component/references/reporting-upstream.md](../build-component/references/reporting-upstream.md); don't patch around them here.
