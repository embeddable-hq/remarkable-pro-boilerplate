# Discovery & validation
Never invent component names, input names, or import symbols. Read them from the installed package, and let the build confirm.
## Discover components to extend / avoid name clashes
The boilerplate has only the **published package**, not the Pro source. Enumerate from `node_modules`:
1. **Component index** — read `node_modules/@embeddable.com/remarkable-pro/dist/meta/index.json` for the full list (`name`, `label`, `category`, `description`). Use it to (a) decide whether an existing component already does the job — step 1 of the decision tree — and (b) check your new `meta.name` doesn't collide.
2. **One component's schema** — read `node_modules/@embeddable.com/remarkable-pro/dist/meta/<Name>.meta.json` **lazily**, only for the component you're placing or extending. Read the full file (don't grep a narrow projection) so you keep `required` / `array` / sub-input `defaultValue` flags.
3. **Local components** — glob `src/embeddable.com/components/**/*.emb.ts` and read each `meta` for `name`/`label`/`category`. An empty `components/` directory is normal.
**If a `dist/meta` read fails because the file isn't there, stop and tell the user which package to install or update — never guess names or fall back to listing `.js` files.**
## Discover importable symbols
The public import surface is `node_modules/@embeddable.com/remarkable-pro/dist/index.d.ts` (it re-exports via `export *`, so a name not matching a top-level line may still be exported through a re-exported module — open the referenced module's `.d.ts` to confirm) and `@embeddable.com/remarkable-ui`'s `dist/index.d.ts` for primitives. Core SDK symbols (`loadData`, `Value`, `DataResponse`, `Dimension`, `Measure`, `Dataset`, `defineType`, `defineOption`) come from `@embeddable.com/core`; `defineComponent`, `definePreview`, `EmbeddedComponentMeta`, `Inputs`, `useTheme` from `@embeddable.com/react`. If an expected symbol isn't exported, don't import it from a deep internal path (it won't resolve for a consumer) — find the public equivalent or inline the logic.

### The installed version can lag the docs/source — verify, don't assume
The handbook and the remarkable-pro source in this workspace may be **ahead of the version actually installed** (`package.json` → `@embeddable.com/remarkable-pro`). Symbols and input keys that exist in the source may be absent in the installed build. Two real examples seen against `0.3.5`:
- **`inputs.menuOptions` did not exist** — confirm any `inputs.<key>` you spread against `node_modules/@embeddable.com/remarkable-pro/dist/components/component.inputs.constants.d.ts` for the installed version.
- **`asChartCardHeaderProps` was not exported** — `ChartCardHeaderProps` is `{ title?, description?, tooltip?, hideMenu? }`, so pass those to `ChartCard` **directly** (`title={title} description={description} tooltip={tooltip} hideMenu={hideMenu}`) rather than relying on the helper. The examples in this skill do exactly that.

When the build reports `has no exported member` or `Property '<x>' does not exist`, it's almost always this version skew — adapt to the installed surface rather than forcing the symbol.
## See what a Pro component is built from (for faithful rebuilds)
When the decision tree lands you on Pattern A *because* a Pro component nearly fits but can't be extended, mirror it instead of starting blank (principle in [SKILL.md](../SKILL.md)). Two reads make that concrete:
- **The primitive catalogue** — `node_modules/@embeddable.com/remarkable-ui/dist/index.d.ts` lists every primitive you can build on (`LineChart`, `BarChart`, `KpiChart`, table primitives, `Card`, control fields, …). Pick the one matching your need.
- **Which primitives the closest Pro component uses** — grep its compiled module for `remarkable-ui` imports:
  ```bash
  grep -oE "import\{[^}]+\}from[\"']@embeddable.com/remarkable-ui[\"']" \
    node_modules/@embeddable.com/remarkable-pro/dist/<Name>.js
  ```
  The JS is minified and local names are aliased (`LineChart as e`), but the imported primitive names are intact. If a component pulls primitives in via a shared chunk, follow the chunk it imports. Reuse those same primitives and their tokens instead of hand-rolling equivalents.
### Audit a primitive's interactions before overlaying your own
Types tell you a slot accepts `ReactNode`; they do **not** tell you the slot renders *inside* a `<button>`. Before attaching a click/keyboard handler to, or injecting interactive JSX into, any primitive surface (a column `title`/`accessor`, a dropdown `triggerComponent`, a cell, a row), read the **implementation** for handlers bound near that slot. Unlike the Pro modules above, `remarkable-ui`'s `dist/index.js` ships **readable** (non-minified) JSX, so grep it directly:
```bash
UI=node_modules/@embeddable.com/remarkable-ui/dist/index.js
# 1. What does the primitive bind?  (and where is your slot rendered?)
grep -nE 'onClick|onKeyDown|role: ?"button"|asChild|onSortChange|onRowIndexClick|onCellClick' "$UI" | grep -iC2 <Primitive>
# 2. Does your target slot sit inside an interactive element?
grep -nE 'header\.title|accessor|triggerComponent|"button"|"th"' "$UI" | grep -iC3 <Primitive>
```
If your slot renders inside an element carrying any of those handlers, it's a **trap slot** (catalogue in [events-and-state.md](events-and-state.md) → "Interactive surfaces a primitive owns"): render a non-interactive affordance there, move your control to a free element, or use the primitive's own callback. Real case: the table header `<th>` is a sort `<button>` and `header.title` is its child — so an interactive element in `title` nests buttons and breaks sorting.
### Choosing a foundation for a novel viz (the escape hatch)
When the decision tree falls through to a genuinely novel Pattern A viz (no Pro component, no `remarkable-ui` primitive wraps it), **don't default to hand-rolled SVG** — work this ladder top-down and stop at the first rung that fits. The order is about the **interaction layer** (hover/touch tooltips, legend, keyboard, resize): the higher rungs hand it to you; the lower ones make you build it yourself.
1. **A Chart.js controller already in the bundle.** Chart.js 4.x ships transitively with Pro and registers globally, including controllers `remarkable-ui` doesn't wrap — `polarArea`, `radar`, `doughnut`, plus `bar`/`line`/`scatter`/`bubble`. Many "novel" asks (radial bar, gauge, polar, radar, nightingale) are just one of these. A raw Chart.js chart inherits Pro's tooltip/legend/resize behaviour for free — and Pro's global plugins (datalabels, annotation): disable the ones you don't want (next section). Confirm the controller exists before assuming: `ls node_modules/chart.js/dist/controllers/`.
2. **HTML/CSS.** For structural or simple viz (progress bars, simple stacked layouts) where no charting library is needed. Cheap; light interaction you own.
3. **A permissively-licensed charting library.** When you need a real chart Chart.js can't draw. This **adds a third-party dependency**, which is a genuine trade-off (licensing, bundle size, maintenance) — **surface it and get the user's sign-off; ask their preference if several fit.** Prefer permissive licences: ECharts (Apache-2.0), Recharts / visx / Nivo (MIT), D3 (ISC). **Highcharts is *not* free for commercial use** — don't reach for it by default in a commercial embed.
4. **Hand-rolled SVG.** The last resort, and not robust. You now own the **entire** interaction layer: a real value reveal (the `Tooltip` primitive — *not* an SVG `<title>`), hover/touch, resize, and any legend. Only here when nothing above can express the shape.

**Decide by judgment; don't stop to ask when the call is obvious** (a Chart.js controller exists → just use it; a quick HTML/SVG shape with no new dependency → just build it). Ask the user only on a **real fork** — chiefly *adding a dependency*, or choosing among viable libraries.

**Whatever the rung, the plumbing is non-negotiable** (the prime directive, applied at the escape hatch): the renderer supplies only geometry + interaction; the *content* still comes from the Pro built-ins. Format every value through `getThemeFormatter`, localize through `i18nSetup`/`resolveI18nProps`, colour through `getChartColors`/`getDimensionMeasureColor`, and wrap in `ChartCard`. An alternative library ships its own formatting/colour/tooltip defaults — feed it Pro-formatted labels, Pro colours, and i18n strings instead, and match the **full options-theming surface** (legend/tooltip/axis/grid/label styling mapped to the `--em-chart-*` tokens, so it tracks dark mode too) — token map in [pro-builtins.md](pro-builtins.md) → "Charts: the whole `options` object is a theming surface". So it matches the dashboard rather than looking foreign.

### Audit what the library registers globally (Chart.js plugins)
The same "find out what the library already did before you build on top" rule applies to **global side-effects**, not just primitive slots. The `remarkable-ui` chart primitives call `ChartJS.register(…, ChartDataLabels, AnnotationPlugin)` (see `BarChart`/`PieChart`/`DonutChart`/`LineChart`), and Chart.js plugins register on the **shared `ChartJS` singleton** — so the moment Pro is imported, **every** Chart.js chart in the bundle inherits those plugins, including a raw one you hand-roll for a novel type (e.g. a sankey on `chartjs-chart-sankey`).

Pro's data builders (`getBarChartProData`, …) configure datalabels for *their* charts; a hand-rolled chart does not, so datalabels paints each raw datum on top of whatever your chart draws (a sankey draws its own node labels via its `labels` map → the two collide into overlapping text). **Opt out explicitly** in your chart options:
```ts
options: {
  // datalabels is globally on (Pro registered it); a hand-rolled chart must turn it off.
  // Cast to ChartOptions<'sankey'> if the plugin's option keys aren't typed for your controller.
  plugins: { datalabels: { display: false } },
}
```
Confirm what's registered before assuming — grep the readable UI dist:
```bash
grep -nE 'register\(|ChartDataLabels|AnnotationPlugin' node_modules/@embeddable.com/remarkable-ui/dist/index.js
```
**General rule:** a chart built on the shared Chart.js singleton inherits whatever Pro registered globally — audit it and disable the plugins you don't want, rather than discovering them painted over your chart.
## Validate
Run after generating (both are local-only and safe — never `embeddable:push` or `embeddable:dev`/`dev`, per root `CLAUDE.md`):
- `npm run embeddable:build` — compiles the component libraries plus every local `*.emb.ts` under `src/embeddable.com/`. This is the real check that the component registers and type-checks end to end. Fix every error it reports.
- `npm run ct` — TypeScript-only pass (`tsc --noEmit`) for a faster type check while iterating.
Components only build when they live under `src/embeddable.com/components/`. (The `examples/` in this skill are reference templates; to build-check one, copy it under `src/embeddable.com/components/` temporarily, build, then remove the copy.)
## Dev events log (if `embeddable:dev` is already running)
The dev build emits NDJSON validation events. The path is **not fixed** — read the `embeddable:dev` (or `dev`) script in `package.json` for the `--events-file=<path>` flag (e.g. `.embeddable-dev-logs/dev.events.ndjson`). Each line is a `marker` (build progress) or `issue` (validation problem); key names: `validate_start`, `validate_end`, `validation_error`, `change_detected`. Read it on request or right after editing a component, and surface the latest error(s). If the flag is absent, the log isn't configured — tell the user to add it rather than guessing a path. Don't start the dev server yourself.
