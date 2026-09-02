# Theming examples
One example per rung of the complexity ladder; each file's header comment names its rung and install path. All `.ts` files typecheck against this repo's installed `@embeddable.com/remarkable-pro` (command in [../references/verification.md](../references/verification.md)).

| Example | Strategy | Semantic tokens | Core ramp | Component tokens | Fonts | Chart palette (`charts.*`) | Presets |
|---|---|---|---|---|---|---|---|
| [atlas-light-dark/](atlas-light-dark/) | A | ✓ light + dark | radius + shadow only | **none** | Google (Figtree) | ✓ arrays + pin | ✓ |
| [aurora-deep/](aurora-deep/) | B | status only | ✓ full re-tint | ✓ curated (~35) | Google (Google Sans Code) | ✓ mono-alpha array | — |

- **atlas-light-dark/** — the shape of almost every first theme: both variants from one shared palette block, the replaced-fonts-array trap handled, one `backgroundColorMap` pin, **zero component tokens**. Also contains the **canonical provider** (`embeddable.theme.ts`) and the preset set.
- **aurora-deep/** — the deliberate deep end: brand-tinted gray ramp, mono-alpha chart palette, gradient pill cards, a curated escalation block. Its header documents what porting cost: 277 restated defaults dropped and 13 dead token names found — the maintenance trade-off in the flesh.

Install: theme files → `themes/`; the provider → repo root `embeddable.theme.ts` (its relative `./atlas.theme` import becomes `./themes/atlas.theme`); cc.yml content → **append** into `src/embeddable.com/presets/client-contexts.cc.yml`, keeping existing entries and numbering.
