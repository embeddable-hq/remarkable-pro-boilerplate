# Component discovery

Embeddable components come from **two sources**, both walked at build time and both producing first-class candidates for any widget:

1. **Component libraries** declared in `embeddable.config.ts` (npm packages with a `meta/` directory).
2. **Local components** under `src/embeddable.com/components/` (`*.emb.ts` files exporting a `meta` const).

The skill stays library-agnostic — never hardcode a specific package, and never assume one source is "primary" and the other a fallback. Always check both before proposing components.

## Source 1: component libraries

`embeddable.config.ts` exports a config with a `componentLibraries` field whose entries are either bare package names or filter objects:

```ts
componentLibraries?: string[] | ComponentLibraryConfig[];
type ComponentLibraryConfig = {
  name: string;
  include?: string[];
  exclude?: string[];
};
```

For each enabled entry, the metadata for that library lives at:

```
node_modules/<package-name>/meta/
├─ index.json                       # discovery: array of { name, label, category, description? }
└─ <componentName>.meta.json        # full schema: inputs, events, variables, defaultWidth, defaultHeight
```

### `include` / `exclude`

When an entry uses the object form:

- If `include` is set, **restrict** candidates from this library to those component names.
- If `exclude` is set, **drop** those component names from candidates.
- If both are unset (or the entry is a bare string), all components in the library are eligible.

These filters apply to library entries only — they don't affect local components.

### Reading library meta efficiently

1. **At the start of work**, read `index.json` once for each enabled library. This gives the full discovery surface (`name`, `label`, `category`, `description?`).
2. **Use the index for narrowing**: `category` groups (e.g. `Bar Charts`, `Dropdowns - dates`), `description` (when present) explains intent. Pick candidate components by scanning these fields.
3. **Read the per-component file** `node_modules/<package-name>/meta/<componentName>.meta.json` only for the specific components you're going to place.
4. **Do not bulk-load** — reading every per-component meta inflates context for no benefit.

### When a library's meta is missing

If `node_modules/<package-name>/meta/` does not exist for a library that's listed in `componentLibraries`:

1. Stop generation immediately — do not invent component, input, or event names from that library.
2. Tell the user which package's metadata is missing and ask them to update the package (e.g. `npm install <package>@latest`) so it ships with the `meta/` directory.
3. Resume only once the directory is present.

(This applies to libraries only. An empty `src/embeddable.com/components/` directory is normal — see below — and is not an error.)

## Source 2: local components

Components defined in this repo are equally available as widget components. They live under `src/embeddable.com/components/` and are paired files:

```
src/embeddable.com/components/
└─ <ComponentName>/
   ├─ <ComponentName>.emb.ts        # exports `meta` and `defineComponent(...)` — Embeddable descriptor
   └─ index.tsx                     # the React component itself (or another file)
```

Use a glob — `src/embeddable.com/components/**/*.emb.ts` — to enumerate. The exact directory shape is by convention; the only structural requirement is the `*.emb.ts` suffix.

### `meta` shape

Each `.emb.ts` exports a `meta` const with the same shape as a library `<componentName>.meta.json`. Example:

```ts
import { EmbeddedComponentMeta } from '@embeddable.com/react';

export const meta = {
  name: 'SimpleTable',                  // referenced from widget YAML as `component: SimpleTable`
  label: 'Simple Table',
  category: 'Charts: essentials',
  defaultWidth: 900,
  defaultHeight: 400,
  inputs: [
    {
      name: 'ds',
      type: 'dataset',
      label: 'Dataset to display',
      category: 'Chart data',
    },
    {
      name: 'columns',
      type: 'dimensionOrMeasure',
      label: 'Columns',
      array: true,
      config: { dataset: 'ds' },
      category: 'Chart data',
      inputs: [
        { name: 'label', type: 'string', label: 'Label name' },
        {
          name: 'dateFormat',
          type: 'string',
          label: 'Date format',
          supportedTypes: ['time'],
          defaultValue: 'yyyy-MM-dd',
        },
      ],
    },
  ],
  // events: [...]   // optional
  // variables: [...] // optional
  // classNames: [...] // optional, styling-only
} as const satisfies EmbeddedComponentMeta;
```

The fields available — `name`, `label`, `category`, `defaultWidth`, `defaultHeight`, `inputs[]` (with `type`, `required`, `array`, `defaultValue`, `category`, `supportedTypes`, nested `inputs` for sub-inputs), optional `events[]`, optional `variables[]` — are identical to the library JSON schema. Everything in [`widgets.md`](widgets.md) about inputs, sub-inputs, and events applies unchanged.

The `name` field is the only thing widget YAML references (`component: <name>`).

### Reading local components efficiently

There is no separate index file — each `.emb.ts` *is* its own metadata source.

1. **At the start of work**, glob `src/embeddable.com/components/**/*.emb.ts`. For each file, read the `meta` const block (look for `export const meta = {...}`) to get `name`, `label`, `category`. This is your discovery surface.
2. **Use category/label** to narrow candidates the same way you do with library components.
3. **For components you actually place**, read the same `.emb.ts` again (or fully the first time) for the complete `inputs`/`events`/`variables` schema.
4. **Don't load sibling React files** (`index.tsx`, etc.) — Claude doesn't need them to author YAML; only the `meta` const matters.

### No `include`/`exclude` for local components

`componentLibraries` filters apply only to library entries. **Every** `*.emb.ts` under `src/embeddable.com/components/` is eligible — there is no equivalent filter for local components. If the user wants to hide one, they remove or rename the file.

### Empty directory is normal

`src/embeddable.com/components/` may contain only a `.gitkeep`, or be missing entirely. That's fine — it just means no local candidates. Don't warn the user; just use the library candidates.

## Combining both sources

When ranking or proposing components, build the **union** of:

- Library candidates (after applying each library's `include`/`exclude`).
- All local candidates from `src/embeddable.com/components/**/*.emb.ts`.

Local components have the same standing as library components — they're not fallbacks.

### Name collisions

If a local `*.emb.ts` declares `meta.name` equal to a library component's `name`, the resolution is ambiguous in YAML — `component: <name>` could mean either. Don't guess: surface the conflict to the user and ask which one they want before generating the widget. Suggest renaming the local component as the cleanest fix if they want both to remain.

## Never invent

`inputs` is the source of truth for which inputs your widget can use, their types, whether they're required, whether they're arrays, and what sub-inputs they support. `events` is the source of truth for what `SET_VARIABLE` and `DRILLDOWN` event configurations are valid. **Never invent input or event names** — read the meta (whether from JSON or `.emb.ts`) and use what's there.
