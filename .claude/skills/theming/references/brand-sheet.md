# The Brand Sheet
The single intermediate artifact of this skill. Every intake path ([intake.md](intake.md)) fills it; the token mapping ([mapping.md](mapping.md)) consumes it. It exists so the user confirms **design intent once**, in plain color-and-font terms, instead of reviewing 30 token names — and so nothing is invented mid-generation. Present it, get one yes, then build without further questions.

## Schema
Fields marked *(derive)* have documented derivation recipes in [mapping.md](mapping.md) — never ask the user for them.

```yaml
name: acme                    # kebab-case; names themes/<name>.theme.ts and the clientContext theme keys
                              # (a brand literally named "embeddable" works but shadows the root
                              #  provider filename — prefer a product/company variant)
variants: light + dark        # always both (dark is derived; cheap to drop); default variant: light

surfaces:
  card: '#ffffff'             # THE primary themed surface — maps to --em-sem-background, which cards inherit
  page: '#f4f6f8'             # NOT a token: the canvas *behind* cards → cc.yml canvas.background + host-page guidance
  raised: (derive)            # menus, dropdown panels, table cells → --em-sem-background--neutral
  hover-ladder: (derive)      # --light / --subtle / --muted: soft emphasis, hover, pressed/lines

text:
  primary: '#212129'          # --em-sem-text (and --neutral, slightly stronger)
  muted: (derive)             # axes, legends, subtitles → --em-sem-text--muted
  subtle: (derive)            # disabled → --em-sem-text--subtle
  on-inverted: (derive)       # text on inverted surfaces (tooltips, selected items) → --em-sem-text--inverted

brand:
  primary: '#2563eb'          # 1–3 colors; seed the chart palette and any accent decisions
  secondary: null
  accent: null

status: (lib defaults)        # success/error background+text pairs; override only if the brand has its own

charts:
  palette: (derive)           # 10 explicit colors, or derive: hue-rotation (colorful) | mono-alpha (brand monochrome)
  pinned: {}                  # optional: '{model}.{dimension}.{Value}': '#hex' — values that must keep a color

typography:
  family: Figtree             # base UI font; "keep Inter" = no typography changes at all
  source: google              # google | woff2 (self-hosted URLs) | system
  weights: '400..700'
  headings: null              # optional distinct display family (markdown h1/h2, KPI numbers)

shape:
  radius: default             # sharp | small | medium | default | large — scales the core radius steps
                              # (the shipped default card corner is 32px — quite round; "medium" is the
                              #  most common request for tighter-but-still-rounded cards)

depth:
  shadow: default             # none | soft | default → --em-core-shadow-*

notes: null                   # anything unusual: gradients, borders-instead-of-shadows, density, "no rounded corners on tables"
```

## Defaults policy
Every omitted field has a default; **never ask about a field that has one** unless the user's material contradicts it. This is what keeps the interview at five questions and screenshots free of follow-ups.

| Field | Default when absent |
|---|---|
| `variants` | light + dark, default light |
| `surfaces.card` / `surfaces.page` | white card on a light-gray page (light); derived dark ladder (dark) |
| `surfaces.raised`, `hover-ladder` | derived from card + text per [mapping.md](mapping.md) |
| `text.*` beyond `primary` | derived per [mapping.md](mapping.md) |
| `text.primary` | near-black `#212129` (light) / near-white (dark) |
| `status` | library defaults — they sit well on most brands; don't touch |
| `charts.palette` | `derive: hue-rotation` seeded from `brand.primary` |
| `typography` | keep Inter — emit **no** font config at all |
| `shape.radius` / `depth.shadow` | library defaults |

## Presentation format (the confirmation gate)
Show the *filled* sheet as a compact fenced block — only fields that differ from defaults, hex values and one-word choices, ≤ 15 lines. State where each value came from when it wasn't explicit ("primary from your header background"). Then exactly one question, e.g.:

```
Brand Sheet — acme
  card #ffffff · page #f4f6f8 · text #212129
  brand primary #2563eb (from your primary buttons)
  charts: hue-rotation from #2563eb, 10 slots
  font: Figtree (Google), 400..700
  radius: medium · shadow: soft
  variants: light + dark (dark derived)
```

> Generate the theme from this? Anything to adjust?

On yes: build everything, no further questions. On adjustments: patch the sheet, re-show only if the change was ambiguous.
