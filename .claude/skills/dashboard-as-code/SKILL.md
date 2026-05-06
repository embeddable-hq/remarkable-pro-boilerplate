---
name: dashboard-as-code
description: Use when the user wants to create, scaffold, or edit an Embeddable dashboard — `*.embeddable.yml` files describing layout, widgets, datasets, variables, events, custom canvas templates, and starter canvas. Triggers on phrases like "create a dashboard", "add a widget", "wire a date filter", "make a custom canvas template", or any work on a `.embeddable.yml` file under `src/embeddable.com/embeddables/`.
---

# Dashboard-as-code

Generate and edit Embeddable dashboards declaratively as `*.embeddable.yml` files. On `embeddable:push`, each file becomes a new dashboard version in the workspace; publishing pins that version for live embeds, so subsequent pushes never disturb anything that's already published.

## File location

`src/embeddable.com/embeddables/<name>.embeddable.yml`. New embeddables go in this directory. The filename is cosmetic — the workspace identifier is `embeddables[].name`.

## Top-level skeleton

```yaml
embeddables:
  - name: <stable-key>          # workspace identifier — treat as immutable
    title: <human-readable>     # shown in the no-code builder
    description: <repo-only>    # documentation; not stored on the server
    variables: [...]            # reactive values shared between widgets
    datasets: [...]             # data sources used by widgets
    widgets: [...]              # main canvas (static for end users)
    customCanvas: {...}         # optional: end-user-buildable canvas
```

## Workflow when generating or editing

1. **Discover available components from both sources.** Components come from (a) `componentLibraries` declared in `embeddable.config.ts` and (b) local `*.emb.ts` files under `src/embeddable.com/components/`. Walk both:
   - **Libraries**: each entry is either a string (`<package-name>`) or `{ name, include?, exclude? }`. For each enabled library, read `node_modules/<package-name>/dist/meta/index.json` (`name`, `label`, `category`, `description?`) and apply per-library `include`/`exclude` filters. **If a library's `dist/meta/` directory is missing, tell the user which package needs to be updated and stop — never guess at component or input names.**
   - **Local**: glob `src/embeddable.com/components/**/*.emb.ts` and read each file's `meta` const for `name`, `label`, `category`. An empty `components/` directory is normal — not an error.
   - Build the union as your candidate set. If a local `meta.name` collides with a library component's `name`, surface the ambiguity to the user instead of picking one.
   - Details: [references/component-discovery.md](references/component-discovery.md).
2. **Read meta lazily.** Only for the components actually being placed: read `node_modules/<package-name>/dist/meta/<componentName>.meta.json` for library components, or read the corresponding `*.emb.ts` (focus on the `meta` const; ignore the `defineComponent` call and any sibling React files) for local components. Don't bulk-load.
3. **Read the data models.** Inspect relevant `src/embeddable.com/models/cubes/*.cube.yml` to confirm cube/dimension/measure names exist and are typed correctly. Only join-related cubes can be referenced together inside one widget.
4. **Generate or edit the YAML** under `src/embeddable.com/embeddables/`. Use the references for any non-trivial section.
5. **Check validation feedback** if `embeddable:dev` is running — see "Dev events log" below.

## Reference index

- [references/datasets.md](references/datasets.md) — dataset shape, filter operators with type rules.
- [references/variables.md](references/variables.md) — variable types, `defaultValue` semantics, `array`, the `noFilter` rule.
- [references/widgets.md](references/widgets.md) — widget anatomy, the 12-column grid, inputs, sub-inputs, events, `SET_VARIABLE`.
- [references/custom-canvas.md](references/custom-canvas.md) — `customCanvas`, templates with `key` lifecycle, icon catalog, `starterCanvas`.
- [references/component-discovery.md](references/component-discovery.md) — enumerating `componentLibraries` and reading their meta.

## Examples

Read these on demand when scaffolding a new file:

- [examples/minimal.embeddable.yml](examples/minimal.embeddable.yml) — single chart, one dataset, no variables.
- [examples/with-date-filter.embeddable.yml](examples/with-date-filter.embeddable.yml) — date range picker → bar chart wired through one variable.
- [examples/custom-canvas-template.embeddable.yml](examples/custom-canvas-template.embeddable.yml) — main canvas + customCanvas with two templates and a starter canvas.
- [examples/drill-down.embeddable.yml](examples/drill-down.embeddable.yml) — two embeddables in one file: parent with a `DRILLDOWN` event that opens the target with overrides from both an event property and a parent variable.

## Dev events log

When the user is running `embeddable:dev`, the build can emit NDJSON events to a log file. The path is **not fixed** — read `package.json` and look at the `embeddable:dev` (or `dev`) script for the `--events-file=<path>` flag, e.g.

```json
"embeddable:dev": "embeddable dev --events-file=.embeddable-dev-logs/dev.events.ndjson"
```

If the flag is absent, the log is not configured for this project — tell the user how to enable it (add the flag) rather than guessing a path.

The format is NDJSON; each line is either a `marker` (build cycle progress) or an `issue` (validation problem). Key event names: `validate_start`, `validate_end`, `validation_error`, `change_detected`. Read the log on user request ("check for errors") or right after Claude itself edits a `*.embeddable.yml`. Surface the latest error(s); on widget overlap errors, propose new coordinates that fit the grid.

## Safety rules

- **`embeddables[].name`** is the workspace identifier. Renaming or deleting it removes the dashboard from the workspace, which breaks any live embeds pointing at it. It also breaks every `DRILLDOWN` event that targets it — before renaming, grep `embeddable: <old-name>` across `src/embeddable.com/embeddables/` and update or warn. Never change or delete the name without explicit user confirmation.
- **`customCanvas.templates[].key`** is the stable identifier that end-user-created widgets and `starterCanvas.widgets[].template` bind to. Changing or removing a `key` deletes every dependent widget. Treat `key` as effectively immutable. `name` and `description` are cosmetic and safe to edit. See [references/custom-canvas.md](references/custom-canvas.md).
- **Don't run `embeddable:push`** automatically — that's the user's call (root `CLAUDE.md`).
- **Don't start `embeddable:dev`** automatically — the user starts it themselves (root `CLAUDE.md`).

## Out of scope

- Custom variable types — only the built-in types listed in `references/variables.md` are covered.
- Custom components, theme customization, cube model generation, presets (`*.cc.yml`/`*.sc.yml`) — separate skills will handle these.
