# Provider wiring & "View as" presets
`embeddable.theme.ts` is the single runtime entry point: the platform calls `themeProvider(clientContext, parentTheme)` on every theme change, in the builder and in embeds. Keep it pure and synchronous (no fetches, no globals).

## The canonical provider
Working copy: `examples/atlas-light-dark/embeddable.theme.ts`. Shape:

```ts
import { defineTheme } from '@embeddable.com/core';
import { DeepPartial, Theme } from '@embeddable.com/remarkable-pro';
import { acmeDark, acmeLight } from './themes/acme.theme';

// The clientContext contract this workspace supports at embed time:
//   <em-beddable client-context='{"theme":"acme-dark"}'>
type ClientContext = {
  theme?: string;    // key into the lookup below; unknown keys fall back to light
  timezone?: string; // applied by the library automatically — never wire it here
  // Hosts may also pass language/locale keys — mapping those into theme.i18n /
  // theme.formatter is localization, out of this skill's scope.
};

const themes: Record<string, DeepPartial<Theme>> = {
  light: acmeLight,
  dark: acmeDark, // alias the generic keys to the brand — existing embeds passing 'dark' stay themed
  acme: acmeLight,
  'acme-dark': acmeDark,
};

const themeProvider = (clientContext: ClientContext, parentTheme: Theme): Theme => {
  const visual = themes[clientContext?.theme ?? 'light'] ?? themes['light'] ?? {};
  return defineTheme(parentTheme, visual) as Theme;
};

export default themeProvider;
```

## Rules
- **Unknown theme keys fall back to `light`** — never throw on unexpected clientContext.
- **`clientContext` keys are a host-app contract.** Hosts already embed with `theme: 'dark'` etc. Keep `'light'`/`'dark'` resolving to something sensible (aliased to the brand variants as above). Renaming/removing a key needs explicit user confirmation; prefer adding aliases.
- **`clientContext` is input, never a theming surface.** It flows one way: the host embed (or a builder preset) passes it in, and the library reflects that same object into `theme.clientContext` (validating `timezone`) so components can read it. By construction `theme.clientContext` ≡ what was passed in — themes and providers only ever *read* it. Never define or modify it in a theme object or provider output; writing to it is the only way the reflection can diverge from the real input (charts' `loadData` reads the real input directly).
- **Timezone is automatic**: validated against IANA ids (invalid → UTC) and applied by the library. Nothing to wire, nothing to style.
- **Migrating the legacy layout:** when introducing `themes/`, move the content of a wired `dark-theme.ts` into it (usually superseded by the brand dark variant; keep it as `themes/legacy-dark.theme.ts` only if the user wants the old look reachable), update the provider imports, and remove the old file — never leave both wired. Tell the user what moved.
- **Multi-tenant tinting** (per-customer colors at embed time) can read further clientContext keys (e.g. `clientContext.colors`) and merge them as one more `defineTheme` layer on top of the variant — same pure-function rules apply. Keep the per-tenant surface small (a primary color, a chart palette), not a whole theme.

## "View as" presets — `src/embeddable.com/presets/client-contexts.cc.yml`
Builder-only (never affects embeds); each entry appears in the builder's Client Context "View as" dropdown. **Strict schema** — exactly these keys per entry: `name` (required), `clientContext` (required, free-form), `variables` (optional key→value record — **preserve verbatim if a teammate's entry has one**), `canvas` (optional):

```yaml
- name: 3. Acme Light               # required
  clientContext:                    # required, free-form — must match the provider's contract
    theme: acme
  canvas:                           # optional; background echoes the theme's PAGE surface
    background: "#f4f6f8"           # (surfaces.page from the Brand Sheet lands here)
- name: 4. Acme Dark
  clientContext:
    theme: acme-dark
  canvas:
    background: "#16161c"
```

Conventions:
- **Naming:** `N. <Brand> <Variant>`, continuing the file's existing numbering (`1. Light Theme` / `2. Dark Theme` stay).
- **Curation, not cross-product:** one preset per theme variant. Keep the file ≤ ~8 entries — it's a dropdown, not a test matrix.
- **Append and renumber; never drop or rewrite existing entries without asking** — the file is shared with the whole team.
- `canvas.background` is how the user previews cards against something like their real page color — always set it from `surfaces.page`.
