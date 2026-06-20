# Component sandbox

A local Vite + React app for eyeballing the custom Embeddable components in this
repo before you push them. It renders each component through its **real `.emb.ts`
descriptor** with mock data, so what you see closely matches the cloud builder.

## Run

```bash
cd sandbox
npm install          # first time only
npm run dev          # Vite on http://localhost:5210
```

Then:
- Pick a component in the **left sidebar** (auto-discovered from every
  `src/embeddable.com/components/**/*.emb.ts`).
- Edit its inputs live in the **right panel** (generated from `meta.inputs`).
- Resize via the frame corner or the **Narrow / Default / Wide / Tall** presets.
- Toggle **Dark** (top-right) to check dark-mode rendering.
- Toggle **Lang** (top-right) between English and Deutsch to check translations.
- The **Build Status** panel runs `embeddable:build` / `tsc` without leaving the page.

## What it reproduces faithfully
- The real `config.props()` mapping, including internal `[state, setState]` reactivity.
- `loadData()` calls (replaced with typed mock rows — present-anchored, granularity-aware time series, or category rows).
- The real theme pipeline (`themeProvider` → `EmbeddableThemeContext`), with light/dark and English/German toggles. German uses Pro's shipped `de` translations, so i18n-wired strings (`resolveI18nProps`, `i18n.t`) actually translate — a string that *doesn't* change is either hardcoded (a bug) or custom copy with no translation yet.
- Auto-discovery: drop a new `*.emb.ts` + `index.tsx` under
  `src/embeddable.com/components/<Name>/` and it appears automatically — the sandbox
  watches for added/removed component files and reloads. No registry edits.

## What it fakes (don't rely on these)
- **Data is static mock data** — loading states never appear, and values aren't from a real database.
- **`useEmbeddableState` returns `{}`** — cross-component variable sharing isn't simulated.
- **Events log to the panel** instead of writing to the Embeddable variable bus.
- **No dataset/dimension/measure picker** — data inputs are bound to mock objects.

## How it works (brief)
`@embeddable.com/react` is aliased to a shim (`src/shims/react-shim.ts`) that captures
each `defineComponent(Component, meta, config)` call. `src/registry.ts` eagerly imports
every `*.emb.ts` via `import.meta.glob`, and `ComponentView.tsx` runs the captured
`config.props()`, swaps `loadData()` sentinels for mock data, and renders the component
inside the theme provider.
