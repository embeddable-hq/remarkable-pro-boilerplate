# Component discovery

Embeddable's components come from one or more **component libraries** (npm packages). The skill is library-agnostic — never hardcode a specific package. Always start by reading the project's configuration.

## Where to look

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

## `include` / `exclude`

When an entry uses the object form:

- If `include` is set, **restrict** candidates to those component names.
- If `exclude` is set, **drop** those component names from candidates.
- If both are unset (or the entry is a bare string), all components in the library are eligible.

Apply these filters before showing or proposing any component to the user.

## Reading meta efficiently

1. **At the start of work**, read `index.json` once for each enabled library. This gives the full discovery surface (`name`, `label`, `category`, `description?`).
2. **Use the index for narrowing**: `category` groups (e.g. `Bar Charts`, `Dropdowns - dates`), `description` (when present) explains intent. Pick candidate components by scanning these fields.
3. **Read the per-component file** `node_modules/<package-name>/meta/<componentName>.meta.json` only for the specific components you're going to place. Each file contains the full input/event schema needed to write a valid widget.
4. **Do not bulk-load** — reading every per-component meta inflates context for no benefit.

## Per-component meta shape

```jsonc
{
  "name": "BarChartDefaultPro",
  "label": "Bar Chart - Default",
  "category": "Bar Charts",
  "defaultWidth": 600,
  "defaultHeight": 400,
  "inputs": [
    {
      "name": "<input name>",
      "type": "<input type>",
      "label": "<UI label>",
      "required": false,
      "array": false,
      "defaultValue": "...",
      "category": "<UI grouping>",
      "supportedTypes": ["string"],   // when relevant — e.g. for sub-inputs that only apply to certain dimension types
      "inputs": [/* sub-inputs */]
    }
  ],
  "events": [
    {
      "name": "onChange",
      "label": "...",
      "properties": [
        { "name": "value", "label": "...", "type": "timeRange" }
      ]
    }
  ],
  "variables": [/* pre-configured variables some components expose */]
}
```

`inputs` is the source of truth for which inputs your widget can use, their types, whether they're required, whether they're arrays, and what sub-inputs they support. `events` is the source of truth for what `SET_VARIABLE` event configurations are valid. **Never invent input or event names** — read the meta and use what's there.

## When meta is missing

If `node_modules/<package-name>/meta/` does not exist for a library that's listed in `componentLibraries`:

1. Stop generation immediately — do not invent component, input, or event names.
2. Tell the user which package's metadata is missing and ask them to update the package (e.g. `npm install <package>@latest`) so it ships with the `meta/` directory.
3. Resume only once the directory is present.
