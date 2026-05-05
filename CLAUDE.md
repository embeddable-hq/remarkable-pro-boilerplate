# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A boilerplate workspace for Embeddable — a fully-customizable embedded analytics platform. This repo pulls in the pre-built `@embeddable.com/remarkable-pro` component library, supplies configuration, theming, data models, presets, and (optionally) custom components and dashboards, and pushes the result to the Embeddable cloud. It produces no application of its own — once pushed, the content becomes available in the no-code dashboard builder and can be embedded in customer apps.

## How Embeddable works

**Components.** The Embeddable SDK (`@embeddable.com/sdk-core`, `@embeddable.com/sdk-react`) turns any React component into an Embeddable component. A component is a regular React file plus a companion `<ComponentName>.emb.ts` descriptor that declares the component's `meta` (inputs that become props in the no-code builder), the events it emits, and the mapping from inputs to React props. `@embeddable.com/remarkable-pro` is a ready-made library of such components — this repo uses it directly. Custom components can also live under `src/embeddable.com/components/`.

**Data models.** `*.cube.yml` files under `src/embeddable.com/models/` are Cube definitions (dimensions, measures, joins, `sql_table`). Cube runs in the Embeddable cloud and queries the customer's database; components consume the resulting datasets to render charts.

**Build & push.** `embeddable:build` walks the component libraries listed in `embeddable.config.ts` plus any local `*.emb.ts` files and compiles them. `embeddable:push` uploads the compiled bundle and all YAML (cubes, presets, dashboards) to the workspace, where each becomes a new immutable *version* (model version, component version, dashboard version).

**Publish & embed.** Dashboards are built in the no-code builder or as code (see `*.embeddable.yml` below) and then *published*. Publishing pins specific component/model/dashboard versions, so future pushes never disturb live embeds. The end user embeds a published dashboard in their own app via the `<em-beddable>` web component, authenticated by a short-lived token generated server-side from the workspace API key, the dashboard ID, and a `securityContext`. A working server-side token-generation example lives in `src/embeddable.com/scripts/embedding-preview.cjs`.

**Two runtime contexts:**
- `securityContext` — set at token generation, forwarded to Cube.js for row-level security.
- `clientContext` — passed as a prop on the `<em-beddable>` web component (e.g. `locale`, `language`, `theme`), forwarded both to `themeProvider` and to the components themselves.

## Workspaces: primary vs preview

A workspace is the cloud unit that holds models, components, and dashboards.

- **Primary workspace** — shared across the user's organization. `embeddable:push` writes here, and real customer embeds load from here.
- **Preview workspace** — per-user sandbox opened by `embeddable:dev`. Local `*.ts`/`*.tsx` files are served by the dev server with hot reload; YAML changes sync to the preview workspace as new versions. Uses the same DB connections as primary, but is isolated so experiments don't affect anyone else.

Auth for `embeddable:push` is either `-k <api_key>` (per-workspace API key) or a session established via `embeddable:login`.

## Commands

- `npm run dev` — runs `embeddable dev` with `NODE_OPTIONS=--max-old-space-size=4096`. Starts the local dev server and opens the user's preview workspace.
- `npm run embeddable:login` — authenticates the Embeddable CLI.
- `npm run embeddable:push` — pushes `src/embeddable.com/` content (cubes, presets, components, dashboards) to the workspace.
- `npm run embeddable:build` — non-watch build.
- `npm run embeddable:upgrade` — bumps every `@embeddable/*` dep to latest with `npm-check-updates`.
- `npm run embedding-preview` — serves `src/embeddable.com/scripts/embedding-preview.html` on `localhost:8080` for testing iframe embeds.
- `npm run reinstall` — nukes `node_modules` and `package-lock.json`, reinstalls from scratch (use this if deps get into a weird state).
- `npm run ct` — typecheck (`tsc --noEmit`).

There is no test suite or lint script. Prettier config lives in `.prettierrc.json`.

## Confirm before running

Always confirm with the developer before running:

- `npm run embeddable:push` — writes to the **shared primary workspace**, visible to the whole organization and used by real customer embeds.
- `npm run embeddable:upgrade` and `npm run reinstall` — modify `package.json` / `package-lock.json` / `node_modules`.
- Any `src/embeddable.com/scripts/connection-*.cjs` script — these CRUD live database connections via the REST API.

Don't run these automatically — ask the developer to run them themselves:

- `npm run embeddable:login` — opens a browser auth flow with a verification code; launching it unprompted is jarring and security-sensitive.
- `npm run dev` — long-running watcher / dev server; if Claude starts it, the process can be left holding the port after the conversation ends.

Everything else (`embeddable:build`, `embedding-preview`, `ct`) is local-only and safe to run without confirmation.

## Region

`embeddable.config.ts` declares `region: "US"`. EU workspaces need this set to `'EU'`, and the `starterEmbeddables` list varies by region. The standalone connection scripts (`src/embeddable.com/scripts/connection-*.cjs`) carry a hardcoded `BASE_URL` that must match the region: `api.us.embeddable.com` vs `api.eu.embeddable.com`.

## Repository layout

### Root configuration

- [embeddable.config.ts](embeddable.config.ts) — region, plugins (`@embeddable.com/sdk-react`), component libraries to load (`@embeddable.com/remarkable-pro`), and `starterEmbeddables` (demo dashboard UUIDs that are cloned into the workspace on first push so a new user has something to play with against the demo Spotify DB). The commented-out `previewBaseUrl` / `pushBaseUrl` / `audienceUrl` / `authDomain` / `authClientId` block is for Embeddable-internal dev environments — do not enable without reason.
- [embeddable.theme.ts](embeddable.theme.ts) — exports `themeProvider(clientContext, parentTheme) => Theme`. Branches on `clientContext.theme === 'dark'` to merge [dark-theme.ts](dark-theme.ts) (a `DeepPartial<Theme>` of CSS variables like `--em-sem-background`, `--em-sem-chart-color--N`). Light theme is the parent theme with no overrides — add inline overrides in the empty object.
- [embeddable.lifecycle.ts](embeddable.lifecycle.ts) — runtime hooks. The only supported hook today is `onThemeUpdated`, which fires when the theme changes (e.g. to inject `<link>` font tags) and may return a cleanup function.

### `src/embeddable.com/`

- `components/` — custom React components and their `*.emb.ts` descriptors. Currently empty; this repo relies on `@embeddable.com/remarkable-pro`.
- `models/cubes/*.cube.yml` — Cube.js data models. The example set models a Spotify-for-artists schema (`music_artists`, `tracks`, `daily_listens`) over the demo DB that is auto-attached to every new workspace.
- `models/views/` — Cube views (empty, just a `.gitkeep`).
- `presets/*.cc.yml` — client-context presets used in the no-code builder to simulate different `clientContext` values (e.g. dark theme, locale) while previewing.
- `presets/*.sc.yml` — security-context presets used in the builder to simulate row-level security ("view as…"). Each entry has a `securityContext`, optional `filters` applied as Cube member filters, and an `environment` selecting which DB connection to use.
- `*.embeddable.yml` — *dashboard-as-code*. Each file describes a dashboard (layout, widgets, input mappings) declaratively. On push the file becomes a new dashboard version; existing published dashboards are unaffected because publishing pins versions. One example file is checked in as a reference.
- `scripts/connection-*.cjs` — standalone Node scripts that hit the Embeddable REST API (`/api/v1/connections`) to CRUD database connections. They carry placeholder `apiKey` and credential blocks — fill in before running, e.g. `node src/embeddable.com/scripts/connection-create.cjs`.
- `scripts/embedding-preview.{html,cjs}` — local HTML harness for iframe embedding tests, served by `npm run embedding-preview`. The `.cjs` file is a working example of server-side token generation.
- `types/css.d.ts` — module declaration shim for CSS imports.
