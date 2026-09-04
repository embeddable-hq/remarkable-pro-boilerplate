# Intake: extracting the Brand Sheet from any source
Four paths, one output: a filled [Brand Sheet](brand-sheet.md). Pick by what the user *has*, run the matching procedure, converge. Mixing is normal (a website for colors + an interview answer for the font).

## Pick the intake
| The user has… | Path |
|---|---|
| A Figma file / design mockups | A. Figma |
| A live product or marketing site | B. Website |
| A tokens file, Tailwind config, CSS variables, style guide export | C. Token file |
| Nothing but opinions | D. Interview |

## A. Figma
No Figma API integration in v1, and **any file works — it does not need to be a design-system file**: a dashboard mock is the best input (surfaces layered, a mocked chart palette to harvest), a design-system file merely the most precise. **If a Figma MCP tool is connected**, use it instead of screenshots: read local variables/styles first (exact values → map as a token file, path C); if the file has none — typical for a plain dashboard design — read the *nodes* instead: page/card fills, text fills, primary-button fill + corner radius, font names, and the mocked charts' series fills (those map straight onto `charts.palette`, in their order). Then go to Convergence. Otherwise work from what the user can share in chat:

1. **Ask for screenshots** of the most *product-like* screens — a dashboard, a settings page, a data table. Full screens beat isolated components: you need to see surfaces layered (page → card → menu).
2. **Ask if they can paste exported variables/styles** (Figma → local variables / styles can be copied out as text or JSON via plugins). If yes, treat the paste as a token file (path C) for exact values; use screenshots only for hierarchy.
3. **Read screenshots structurally, not decoratively:**
   - `surfaces.card` = the background of the main content containers; `surfaces.page` = what's behind them.
   - `text.primary` = body/heading text color on those cards; ignore hero/marketing display text.
   - `brand.primary` = the color of primary buttons and active states — **not** illustration colors.
   - `typography.family` = ask for the font name if it isn't obvious ("what font is this?" is one of the five interview questions, never a guess).
   - `shape.radius` = card and button corners — estimate against nearby known sizes (a ~36px button, a table row) and state it as approximate; land on the nearest preset step rather than defending a pixel guess. `depth.shadow` = whether cards float or sit flat (border-instead-of-shadow goes in `notes`).
4. Colors sampled off screenshots are approximations (compression, scaling). Say so in the sheet's provenance notes; exact hexes only from pasted values.
5. **A dashboard design defines the *look*, not the result.** Theming reproduces its colors, type, and shape; matching its widget layout is `dashboard-as-code`, and a component the library doesn't have is `build-component`. If the mock implies either, say so when presenting the Brand Sheet — don't let it read as a promise to clone the design.

## B. Website
Prefer the **product/app** over the marketing site — marketing pages run hotter (gradients, display type) than dashboards should. If only marketing is reachable, sample its *chrome* (nav, footer, buttons), not its hero.

1. **Prefer browser tooling with computed styles** — it beats fetching by a wide margin (page-to-markdown fetchers like WebFetch strip `<link>`/`<style>`/class attributes). Load the page and, via the JS console tool, read `getComputedStyle` off the real elements: `document.body` (page bg, text, font stack), `header`/`nav`, the primary CTA (`a`/`button` matching /get started|sign up|demo|try/i → bg, color, border-radius, font), plus a `document.styleSheets` sweep collecting every `:root { --* }` custom property (wrap per-sheet access in try/catch — cross-origin sheets throw).
   - Sites often ship their whole design system as `:root` variables (embeddable.com does — full primary + neutral ramps). When they do, switch to token-file mapping (path C) with exact values.
2. **No browser tooling?** Fetch the **raw** HTML (`curl`) and its linked stylesheets, then mine the CSS text for `:root` blocks, Google Fonts `<link>`s / `@font-face`, and button/link rules. Use a markdownifying fetcher only for content questions, never for style extraction. Tailwind fingerprints (utility class soup) → ask the user for their `tailwind.config` (path C) rather than reverse-engineering.
3. **Sample deliberately, few things:** header/nav background, body background (`surfaces.page`), card/panel background (`surfaces.card`), primary button background (`brand.primary`), link color, body `font-family` stack, button `border-radius`.
4. **Screenshot to confirm** the sampled values against what the site actually looks like — CSS variables can be overridden per-theme/section, and a custom heading font (e.g. a self-hosted family with no public files) is a *decision* to surface on the sheet, not something to silently substitute.
5. Note provenance in the sheet ("primary from the Sign-up button on acme.com").

## C. Token file
Parse, then map. Accept CSS custom properties, Tailwind config, W3C design-tokens JSON, Style Dictionary output, or a pasted Figma-variables export.

| Convention | → Brand Sheet field |
|---|---|
| `primary` / `brand` / `accent` scales | `brand.primary` = the ~500 step (the one used on buttons); extras → `secondary`/`accent` |
| `neutral` / `gray` / `slate` scale | lightest steps → `surfaces.*`; darkest → `text.primary`; keep the whole ramp in `notes` for Strategy B |
| `background` / `surface` / `card` | `surfaces.card` and `surfaces.page` (card = the elevated one) |
| `success` / `error` / `danger` (+ `-bg`/`-text` pairs) | `status` |
| `font-family` / `fontFamily.sans` | `typography.family` (+ `mono` is irrelevant unless they ask) |
| `radius` / `borderRadius` | `shape.radius` (map the *card/button* step, not the max) |
| categorical / chart / dataviz palette | `charts.palette` verbatim, in their order |

Rules: with a 50-token file, extract the ~10 the sheet needs — don't mirror their whole system into `notes`. If both a `500` and a `600` look like "the brand color", pick the one their buttons use; if unknowable, that's a legitimate (single) question. Semantic names beat numeric guesses (`--color-action` > `--blue-500`).

## D. Interview
Exactly five questions, asked as **one** message. Every answer maps straight onto the sheet; everything else takes defaults.

1. Brand color(s)? (1–3 hexes, or "like <well-known brand>")
2. Light, dark, or both? (default: both, light-first)
3. Font — or keep Inter? (name + Google/self-hosted)
4. Rounded or sharp corners?
5. Chart colors: colorful mix, or shades of your brand color?

## Convergence (every path ends here)
1. Fill the sheet; unknowns take the [defaults policy](brand-sheet.md) — **never ask a question a screenshot, stylesheet, or token file already answered**, and never ask about a field with a default.
2. Record provenance for non-obvious picks (one clause each).
3. Present the sheet in the confirmation format ([brand-sheet.md](brand-sheet.md)) and wait for the yes. This is the workflow's only gate.
