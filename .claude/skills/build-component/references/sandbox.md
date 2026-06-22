# Sandbox — local high-fidelity renderer

## What it is
`sandbox/` is a Vite + React app that renders custom Embeddable components locally with high fidelity:
- Calls the **real `config.props()`** from each `.emb.ts` descriptor
- Replaces `loadData()` sentinels with mock data (time-series or category rows)
- Drives the real theme pipeline (`themeProvider` → `EmbeddableThemeContext`)
- Exposes meta-driven input controls, a styles panel (live `--em-*` token editing), dark mode toggle, resizable frame, and a build-status panel

It pairs with `embeddable:build` as the two-part "ready to push" gate: **looks right in the sandbox + build green = good to push**.

## Scaffold the sandbox (first time only)
The sandbox ships as source-only inside the skill at `.claude/skills/build-component/sandbox-template/`. If `sandbox/` doesn't exist in the repo yet:

```bash
cp -r .claude/skills/build-component/sandbox-template sandbox
cd sandbox && npm install
```

All deps install into `sandbox/node_modules`; the boilerplate's `package.json` is untouched.

## Run the sandbox
```bash
cd sandbox
npm run dev          # Vite on :5210 + build-status API on :5211
```

**Do NOT kill ports 5210 / 5211 via `kill -9`** — those may already be the user's `npm run dev`. Only start `npm run dev` inside `sandbox/`.

- Pick a component in the **left sidebar** (auto-discovered from all `*.emb.ts` files)
- Edit inputs in the **right panel** (meta-driven controls, live)
- Drag the frame corner or click preset buttons (**Narrow / Default / Wide / Tall**) to resize
- Toggle **Dark** in the top-right to check dark-mode rendering
- Click **Run** in the Build Status panel (bottom-right) to trigger `embeddable:build` and `tsc` without leaving the sandbox

## Verify (after embeddable:build is green)
**Structural** correctness — registration, types, props/events wiring — comes from the build gate, not the sandbox. This is the agent's responsibility:

```bash
npm run embeddable:build   # repo root; the authoritative push gate
npx tsc --noEmit           # the boilerplate's `ct` script has a tsconfig typo — call tsc directly
```

**Visual / UX** correctness — layout, resize behaviour, theming, whether the inputs feel right — is verified by the **user** in the live sandbox. Once the build is green, start it and hand off (next section):

```bash
cd sandbox
npm run dev          # Vite on :5210
```

**If a new component doesn't appear:** the sandbox watches `src/embeddable.com/components/` and auto-reloads when a `.emb.ts` is added, so it normally shows up on its own. If it doesn't (rare), restart `npm run dev`.

## User confirmation step (before push)
Once the build is green and the sandbox is running, tell the user:

> The sandbox is running at `http://localhost:5210`. Please open it, select **[ComponentName]** from the sidebar, and confirm:
> - It renders with correct layout, data, and theme
> - It resizes gracefully (try the **Narrow** and **Wide** presets)
> - The input controls on the right match the expected meta inputs
>
> Let me know when you're satisfied and I'll mark the component complete.

Wait for explicit confirmation before considering the component done. The agent does **not** run `embeddable:push`; the user does.

## Fidelity notes
The sandbox calls the real `config.props()` and the real theme pipeline. Key gaps (full detail in `sandbox/README.md`):
- `loadData()` returns generated mock data, not a real database — loading states never appear and values aren't real (but the mock **does** respond to the request shape; see below)
- `useEmbeddableState` cross-component variable sharing returns `{}` — cross-widget events are logged but don't propagate
- Event callbacks log to the event log panel rather than updating real Embeddable variables

These gaps don't affect typical build-and-review workflows.

### What the mock honors
The generator applies the request **in memory** so state-driven behaviour renders correctly: it respects `orderBy` (sort), the common `filters` operators (`equals`/`notEquals`, `contains`/`startsWith`/`endsWith`, `gt`/`gte`/`lt`/`lte`, `set`/`notSet` — incl. the `notNull`/`isNull` spellings — and `inDateRange`), and `limit`/`offset` (pagination), applied **filter → sort → page**. So a sort toggle reorders, a committed filter narrows the rows, and page 2 shows different rows — i.e. any functionality whose state drives `loadData` (sorting, filtering, pagination, drill-downs, search-re-query, dynamic measures, granularity changes) can be verified, not just rendered.

It does **not** compute real aggregates, joins, or `GROUP BY`, and its value pools are cardinality-bounded (≈24 entities / ~30 table rows), so measure magnitudes aren't grounded and deep pagination / high-cardinality filters run out. A filter on a member that isn't in the `select` is skipped (the mock only holds selected columns). This verifies your component's **wiring** — does state drive the query and re-render correctly — not data **correctness**; for that, run `embeddable:dev` against real cubes.

## Adding new components
Drop a `*.emb.ts` + `index.tsx` into `src/embeddable.com/components/<Name>/`. The sandbox auto-discovers it via `import.meta.glob` — no edits to `registry.ts` required. A small Vite plugin (`sandbox-watch-components` in `vite.config.ts`) watches the components directory and reloads the page when a `.emb.ts` is added or removed, so new components appear on their own without a restart.
