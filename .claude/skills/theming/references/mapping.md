# Mapping: Brand Sheet → theme tokens
Deterministic recipes from a confirmed [Brand Sheet](brand-sheet.md) to `themes/<brand>.theme.ts`. Authoritative token names + defaults: `node_modules/@embeddable.com/remarkable-ui/dist/global.css` (readable via `tr ';' '\n' < …/global.css | grep -- '--em-sem-'`) and, for pro-only tokens, `node_modules/@embeddable.com/remarkable-pro/dist/theme/styles/styles.constants.d.ts`. **Verify names against those files — a wrong token name fails silently.**

## Strategy choice
- **A. Semantic-level (default).** Override the 25 `--em-sem-*` tokens + font family + radius/shadow core tokens. The shape of the stock [`dark-theme.ts`](../../../../dark-theme.ts) and of `examples/atlas-light-dark/`. Right for virtually every first theme.
- **B. Deep core-ramp re-tint.** Additionally re-point the 12-step gray ramp at brand-tinted neutrals and add a *curated* component layer. The shape of `examples/aurora-deep/`. Only when the sheet demands brand-tinted neutrals throughout or a radical shape/typography change — and it knowingly accepts the maintenance cost below.

## Mapping table (Strategy A, light variant)
| Brand Sheet field | Token(s) | Notes |
|---|---|---|
| `surfaces.card` | `--em-sem-background` | The primary themed surface — `--em-card-background` defaults to it. Default `#f7f7f8`. |
| `surfaces.raised` | `--em-sem-background--neutral` | Menus, select triggers, table cells. Default `#ffffff`. |
| hover-ladder (derive) | `--em-sem-background--light` / `--subtle` / `--muted` | Soft emphasis / hover / pressed + lines. Derive by mixing card toward `text.primary` at ≈ 6% / 10% / 18% — or re-point at core grays like the defaults (`0100`/`0200`/`0300`). |
| (derive) | `--em-sem-background--inverted` | Tooltip + selected-item background. Use `text.primary` or the darkest neutral. |
| `text.primary` | `--em-sem-text`, `--em-sem-text--neutral` | `--neutral` is the stronger step (default black); same hue, darker. |
| (derive) | `--em-sem-text--muted` | Axes, legends, subtitles. ≈ 55–60% mix of text toward card (default `#5c5c66`). Must still pass 3:1 on card. |
| (derive) | `--em-sem-text--subtle` | Disabled only. ≈ 30% (default `#b8b8bd`). |
| (derive) | `--em-sem-text--inverted` | Text on inverted surfaces — pair with `--em-sem-background--inverted`. |
| `status` | `--em-sem-status-{error,success}-{background,text}` | Only when the sheet overrides; pattern: pale tinted background + dark saturated text (≥ 4.5:1 on its own background). |
| `surfaces.page` | **no token** | Goes to `cc.yml` `canvas.background` + a handoff note: the page behind cards is the host app's CSS. |
| `charts.palette` | `theme.charts.backgroundColors` (array — **not** `styles`) | See Chart palettes below. Omit entirely if the sheet keeps the default palette. |
| `typography` | `--em-core-font-family--base` (+ `--code`) | Value is a CSS family string: `"'Figtree'"`. Loading is separate — see Fonts. |
| `typography.headings` | `--em-markdown-h1-font-family`, `--em-markdown-h2-font-family`, `--em-markdown-h3-font-family`, `--em-kpichart-font-family` | These are component tokens — a **legitimate escalation** (no core heading slot exists). Comment that. |
| `shape.radius` | `--em-core-border-radius--{100,150,200,300,400}` | See radius table. Step `400` **is the card corner** (`--em-card-border-radius` reads it); only `500` is the pill — leave that one. |
| `depth.shadow` | `--em-core-shadow-color` | `none` → `transparent`; `soft` → default hue at ~12% alpha (default `#21212940` = 25%); `default` → leave. |

Radius presets (defaults `.25/.375/.5/.75/2rem` = 4/6/8/12/**32px**; `--400` is the **card** — the most visible corner on a dashboard, and its shipped default is already a very round 32px; `--500` stays the pill). The shipped default sits between `medium` and `large`:
| Preset | `--100` | `--150` | `--200` | `--300` | `--400` (card) |
|---|---|---|---|---|---|
| sharp | `0px` | `0px` | `2px` | `2px` | `2px` |
| small | `2px` | `3px` | `4px` | `6px` | `8px` |
| medium | `3px` | `5px` | `6px` | `10px` | `16px` |
| large | `6px` | `9px` | `12px` | `18px` | `48px` |

An exact per-surface request ("cards 24px, buttons square") escalates to `--em-card-border-radius` / `--em-button-border-radius` instead of distorting the whole scale — with a comment.

## The component-token escalation rule
Component tokens pin **today's** component set. New library components never read them but inherit semantic/core automatically; names drift across releases and a renamed token **fails silently**. Custom components built by the `build-component` skill define their own `--em-*` tokens *falling back to semantic* — a semantic-first theme covers those for free too.

So: use a component token only when **(a)** the user names a specific visible problem and **(b)** semantic/core genuinely can't express the fix. When you do:
- comment *why* on the line ("menus need a distinct surface in dark — semantic neutral is taken by cells");
- group them under a `// Component overrides (escalations)` block at the end of the theme file;
- re-verify the block after every `embeddable:upgrade` (names may have moved);
- to theme one *custom* component, read its fallback chain in its own source — don't guess; its keys need the `as Record<string, string>` cast.

## Targeted edits (extend mode)
For "make X look different" against an existing theme:
1. **Find the token behind the element**: `tr ';' '\n' < node_modules/@embeddable.com/remarkable-ui/dist/global.css | grep -- '--em-<component>-'`. The value shows which semantic token it inherits. Component prefixes (verified against the installed library): `card`, `chart` (axes/labels/tooltip text), `charttabs`, `tablechart`, `kpichart`, `piechart`/`linechart`/`barchart`/`scatterchart`/`bubblechart`, `selectfield`, `textfield`, `field`, `daterangepicker`, `button`, `buttonicon`, `ghostbutton`, `ghostbuttonicon`, `actionicon`, `switch`, `tooltip`, `markdown`, `divider`, `skeleton`. Pro-only prefixes (defined in `remarkable-pro/dist/theme/styles/styles.constants.d.ts`, mostly builder/filter surfaces): `filterbuilder`, `filter`, `canvas-overlay` (the drilldown/configurator overlay — not the page), `drilldown`.
2. **Fix at the highest layer that matches the complaint**: "everything feels cramped/gray/sharp" → core or semantic; "just the table headers" → that one component token (escalation rules apply).
3. Smallest diff wins; keep their file layout and naming. Re-run the contrast gate only for changed colors.

## Strategy B recipe (deep restyle)
1. Re-point the 12 gray-ramp stops `--em-core-color-gray--{0000..1000}` at brand-tinted neutrals. Keep the direction (0000 lightest → 1000 darkest); keep steps perceptually ordered.
2. The semantic layer inherits automatically in light (its defaults reference the ramp) — override semantic tokens only where the inherited pick is wrong, and fully re-point them in the dark variant (like `dark-theme.ts` does).
3. Add the *curated* component layer the restyle actually demands (aurora: gradient card, pill radius, tinted table borders) — never bulk-copy defaults; every line should change something.
4. Fonts/radius/shadow as in Strategy A.

## Chart palettes
**Leave the default palette alone unless the sheet overrides it** — it's professionally balanced. Two derivation modes when it does:

**hue-rotation** (colorful, brand-anchored). From `brand.primary` in HSL (hue `H`); slot 1 is the brand hex itself:
- Slot hues: `H + [0, 150, 300, 90, 240, 30, 180, 330, 120, 270]` (mod 360) — a +150° walk, so adjacent slots always differ by 150° and the 10 hues spread evenly.
- Light-variant bands (validated): S ≈ 70, L ≈ 48 — but pull the high-luminance band (H 40–200: yellows through cyans) down to L ≈ 36 so every slot holds ≥ 3:1 on white. Ambers just outside the band land ≈ 2.8 — acceptable for large fills.
- Dark variant: **same hues, same order**, S − 8, L + 12 (high-luminance band L ≈ 52, rest ≈ 60).
- Worked output of exactly this recipe: `examples/atlas-light-dark/atlas.theme.ts`.
**mono-alpha** (brand monochrome — the aurora look): one brand hue, alpha ramp `80% → 10%` across slots 1–10 (`rgb(17 17 66 / 80%)` …). Caveats: only reads over a consistent card color, adjacent categories blur past ~6 series; consider solid `borderColors` for definition.

**Harvested palettes** (from a screenshot's chart, a Figma mock's series fills, or a token file's dataviz scale): keep the values verbatim, in their order. One exception: a harvested color that fails the 3:1 large-fill floor on the card gets its lightness pulled down **at constant hue** just far enough to pass — and the adjustment is disclosed on the Brand Sheet (original → adjusted), never applied silently.

How a series color resolves at runtime (`remarkable-pro` `styles.utils.ts` → `getDimensionMeasureColor`): builder per-field pick → `backgroundColorMap`/`borderColorMap` pin → **`theme.charts.backgroundColors` / `borderColors` arrays** → the `--em-sem-chart-color--1..10` CSS tokens (the library's built-in default palette).
- **Themes customize via the arrays**: `charts: { backgroundColors: [ /* all 10 */ ] }` per variant. `borderColors` is optional (it falls back to `backgroundColors`) — supply it only when strokes should differ from fills. Arrays **replace** the parent wholesale and may be any length (the palette cycles); generate all 10.
- **Don't override the `--em-sem-chart-color--N` tokens in themes** — they're the default *source*, not the customization surface. One consequence to know: `--em-tablechart-heatmap-color` defaults to `var(--em-sem-chart-color--1)`, so an array-only palette leaves heatmap tables on the library's first default color — if heatmaps are in use, set that single token to the palette's first color (a commented escalation).

**Pinning:** `theme.charts.backgroundColorMap.dimensionValue: { 'model.dimension.Value': '#hex' }` (measures: `backgroundColorMap.measure: { 'model.measure': '#hex' }`). A background pin also covers the border when no border pin exists (and vice versa) — pin once, both apply. Builder-selected colors beat the map.

**Assignment & caching:** unpinned colors bind to dimension values in first-seen order and the assignment is cached in `sessionStorage` (key `embeddable`), keyed by a hash of the **whole theme object** — so light and dark cache separately (identical array order keeps "Germany" on the same hue in both), and *any* theme edit re-deals colors on the next load. If colors look "stuck" while iterating, clear that sessionStorage key or hard-reload.

## Dark from light
The stock `dark-theme.ts` (as shipped — create mode migrates and removes it, so the table below is the durable record) is the canonical worked example for the *surface/text* moves (its chart-**token** overrides predate the array API; new themes put palettes in `charts.backgroundColors`):
| Token | Light default | Dark |
|---|---|---|
| `--em-sem-background` | `0050` `#f7f7f8` | `0900` `#212129` |
| `--em-sem-background--neutral` | `0000` white | `1000` black |
| `--light` / `--subtle` / `--muted` | `0100` / `0200` / `0300` | `0800` / `0800` / `0700` |
| `--em-sem-background--inverted` | `0900` | `0000` |
| `--em-sem-text` / `--neutral` | `0900` / `1000` | `0000` / `0000` |
| `--em-sem-text--muted` / `--subtle` | `0700` / `0400` | `0300` / `0500` |
| status backgrounds / text | pale bg + dark text | dark-tinted bg (`rgb(80 22 22)`) + light text (`rgb(255 134 134)`) |
| `--em-core-shadow-color` | `#21212940` | `rgb(0 0 0 / 50%)` |
| chart colors | light-band palette | same hues/order, brighter |

For a branded theme, apply the same *moves* to the brand's values (swap ladder direction, invert text, lift chart lightness) rather than copying these grays. Keep both variants in one file sharing a `palette` const so order stays locked.

## Fonts
Two halves — **loading** (`theme.fonts`) and **assignment** (`theme.styles`); either alone does nothing visible.
```ts
fonts: {
  // defineTheme REPLACES this array — re-include Inter (base UI font) or drop it deliberately.
  google: [{ name: 'Inter' }, { name: 'Figtree', weights: '400..700' }],
  // Self-hosted: one entry per weight file.
  // custom: [{ family: 'BrandFont', src: 'https://…/brand-400.woff2' },
  //          { family: 'BrandFont', src: 'https://…/brand-700.woff2', descriptors: { weight: '700' } }],
},
styles: { '--em-core-font-family--base': "'Figtree'" }
```
`name` must match the Google Fonts family exactly; `weights` is a range `'100..900'` or list `'400;700'` (default `'100..900'`). `source: system` → no `fonts` entry at all, just the style token. Never load fonts via `embeddable.lifecycle.ts`.

## Contrast gate
Run before handoff, per variant. Required pairs: `text`/card ≥ **4.5**, `text--muted`/card ≥ **3**, each status text on its own background ≥ **4.5** — **for pairs the theme sets**; inherited library pairs are exempt (the shipped light success pair is 3.26:1 — known, don't "fix" it unless the user raises it) — and each chart color vs card ≥ **3** (target — flag anything < 2.5, don't block on 2.5–3 for large fills).
Run the bundled script with the generated theme's hex values (one `'fg,bg,min,label'` arg per pair; exits 1 on any failure):
```bash
node .claude/skills/theming/scripts/contrast-gate.mjs '#212129,#ffffff,4.5,text/card' '#5c5c66,#ffffff,3,muted/card'
```
On failure: keep the hue, move lightness of the foreground (or the surface, if several pairs fail on it) until the pair passes; re-run.
