# Verification & handoff
What the agent verifies itself, and the exact shape of the handoff. The agent never runs `embeddable:push` or `embeddable:dev`/`dev` — the user does.

## What the agent runs (all safe, local-only)
1. **Targeted typecheck.** `npm run ct` is the wrong tool here — `tsconfig.json` only includes `src/`, so root theme files are outside its scope. Use:
   ```bash
   npx tsc --noEmit --ignoreConfig --strict --skipLibCheck --esModuleInterop --target es2022 --lib es2022,dom,dom.iterable --module esnext --moduleResolution bundler embeddable.theme.ts themes/*.theme.ts
   ```
   (List only globs that exist — the shell (zsh) aborts with "no matches found" on an unmatched glob before tsc even runs; that's a shell error, not a compiler error. `--ignoreConfig` is required on TypeScript ≥ 6 when files are passed explicitly, and `--moduleResolution bundler` avoids the deprecated `node10` mode; on an older TS that rejects `--ignoreConfig`, drop that flag. The command resolves against the repo's real `node_modules`, so it catches wrong imports and Theme-shape mistakes.)
2. **`npm run embeddable:build`** — bundles the provider end-to-end exactly as a push would; catches wiring errors the typecheck can't (bad import paths from the config's entry point, YAML issues).
3. **The contrast gate** from [mapping.md](mapping.md) → Contrast gate, per variant, with the theme's actual hex values filled in.

Fix and re-run until all three are green **before** telling the user anything is ready.

## Smallest-diff fixes when a check or the user's visual pass fails
| Symptom | Fix |
|---|---|
| Wrong surface color somewhere | Identify which semantic slot paints it (mapping table in [mapping.md](mapping.md)); adjust that one token — resist per-component patches |
| Menus/dropdowns wrong in dark only | The neutral surface: `--em-sem-background--neutral` in the dark variant (the stock dark theme also escalates `--em-selectfield-*` — check before adding more) |
| Chart series illegible on card | Move that slot's lightness (keep hue + order), re-run the contrast pairs |
| Font not loading | The replaced-array trap: `fonts.google` must re-include every family still in use (incl. Inter); check the family name matches Google Fonts exactly. Changed the font mid-session? **Hard-reload** — the Google Fonts `<link>` injects once per page and never re-injects |
| Assigned font shows but headings/KPIs don't change | Headings have no core slot — they need the component-token escalation (`--em-markdown-h1/h2/h3-font-family`, `--em-kpichart-font-family`); see mapping.md → `typography.headings` |
| A theme edit doesn't show up / chart colors "stick" | Colors and the injected style are cached per theme hash — hard-reload, or clear sessionStorage key `embeddable` if series colors must re-deal |
| Table heatmap column ignores the palette | `--em-tablechart-heatmap-color` falls back to the token palette, not the arrays — set it to the array's first color (commented escalation) |

## Handoff template (outcome-first)
Plain text, no build narrative, no AskUserQuestion. State what was verified, then numbered options. Name the **exact** presets and what to look at in each:

> **Your Acme theme is ready** — light + dark, typechecked, `embeddable:build` green, contrast checks pass.
>
> 1. **See it**: run `npm run dev`, open a dashboard, and use the **View as** dropdown:
>    - **3. Acme Light** — card surface, font, chart palette
>    - **4. Acme Dark** — same checks on the dark ladder
> 2. **Inspect the code**: `themes/acme.theme.ts` (both variants share one palette block) and `embeddable.theme.ts` (theme keys + aliases) — or ask me about any choice.

Then **wait**. The user confirms the look and feel — that judgment is theirs; the theme isn't done until they say so. When they're happy, pushing (`npm run embeddable:push`) is their call, per the root `CLAUDE.md`.
