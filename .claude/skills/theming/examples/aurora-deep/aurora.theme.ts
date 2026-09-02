// Example: deliberate deep restyle (Strategy B) — brand-tinted core ramp + a CURATED component
// layer. This is the expensive kind of theme: component tokens pin today's component set and
// need re-verification after every library upgrade. Case in point: this file is a port of a
// 380-token theme from this repo's git history (bf3c763) — 277 of those tokens just restated
// library defaults (dropped), and 13 referenced token names that NO LONGER EXIST in the current
// library and were failing silently (dropped). What's left is the actual restyle.
// The original loaded its font via an embeddable.lifecycle.ts <link> hack — replaced here with
// theme.fonts, the supported mechanism. Install as themes/aurora.theme.ts.
// LIGHT-ONLY BY DESIGN: this demonstrates the Strategy B mechanics, not a shippable brand —
// a real brand theme still ships both variants (derive dark per mapping.md → "Dark from light",
// re-pointing the semantic layer at the ramp's dark stops).
import { DeepPartial, Theme } from '@embeddable.com/remarkable-pro';

export const auroraTheme: DeepPartial<Theme> = {
  fonts: {
    // Inter re-included: defineTheme replaces this array (see references/mapping.md → Fonts).
    google: [{ name: 'Inter' }, { name: 'Google Sans Code', weights: '300..800' }],
  },
  charts: {
    // Mono-alpha palette: ONE brand hue, alpha 80% → 10% (see mapping.md; reads best ≤ 6
    // series, needs the consistent card background below). Customized via this array — the
    // --em-sem-chart-color--N tokens are only the library's built-in fallback.
    backgroundColors: [
      'rgb(17 17 66 / 80%)', 'rgb(17 17 66 / 70%)', 'rgb(17 17 66 / 60%)',
      'rgb(17 17 66 / 50%)', 'rgb(17 17 66 / 40%)', 'rgb(17 17 66 / 30%)',
      'rgb(17 17 66 / 25%)', 'rgb(17 17 66 / 20%)', 'rgb(17 17 66 / 15%)',
      'rgb(17 17 66 / 10%)',
    ],
  },
  styles: {
    // ── Core: the Strategy B move — re-tint the gray ramp toward indigo. The whole semantic
    // layer (surfaces, text) inherits these automatically; no semantic overrides needed in
    // light mode. Endpoints 0000 (white) / 1000 (black) keep their defaults.
    '--em-core-color-gray--0050': 'rgb(244 244 248)',
    '--em-core-color-gray--0100': 'rgb(239 239 244)',
    '--em-core-color-gray--0200': 'rgb(223 223 232)',
    '--em-core-color-gray--0300': 'rgb(206 206 221)',
    '--em-core-color-gray--0400': 'rgb(190 190 210)',
    '--em-core-color-gray--0500': 'rgb(126 126 165)',
    '--em-core-color-gray--0600': 'rgb(93 93 142)',
    '--em-core-color-gray--0700': 'rgb(68 68 117)',
    '--em-core-color-gray--0800': 'rgb(56 56 108)', // keep every stop distinct — perceptual order
    '--em-core-color-gray--0900': 'rgb(42 42 91)',
    '--em-core-font-family--base': "'google sans code'",

    // ── Semantic: status — alpha-tint backgrounds instead of the library's opaque pastels.
    '--em-sem-status-error-background': 'rgb(232 0 0 / 10%)',
    '--em-sem-status-error-text': 'rgb(191 0 0)',
    '--em-sem-status-success-background': 'rgb(0 178 123 / 10%)',
    '--em-sem-status-success-text': 'rgb(0 127 88)',

    // ── Component overrides (escalations) — each line is a deliberate part of the aurora look
    // that semantic/core cannot express. Re-verify this whole block after embeddable:upgrade.
    // The signature: cards are a mint→sky gradient pill.
    '--em-card-background': 'linear-gradient(180deg, #CEFFEE 0%, #B6EEFF 100%)',
    '--em-card-border-radius': '48px',
    '--em-card-padding': 'var(--em-core-spacing--1000)',
    '--em-card-header-gap': 'var(--em-core-spacing--0300)',
    // Over a gradient, hover states need alpha tints, not opaque grays.
    '--em-actionicon-background': 'rgb(68 68 117 / 0%)',
    '--em-actionicon-background--hover': 'rgb(68 68 117 / 10%)',
    '--em-actionicon-background--active': 'rgb(68 68 117 / 25%)',
    '--em-actionicon-color--disabled': 'rgb(68 68 117 / 25%)',
    '--em-actionicon-icon-size': 'var(--em-core-size--0600)',
    '--em-actionicon-width': 'var(--em-core-size--0800)',
    '--em-ghostbutton-background--hover': 'rgb(255 255 255 / 50%)',
    '--em-ghostbutton-background--active': 'rgb(255 255 255 / 75%)',
    // Light tooltip instead of the default inverted one.
    '--em-chart-tooltip-background': 'var(--em-sem-background--neutral)',
    '--em-chart-tooltip-title-color': 'var(--em-sem-text--neutral)',
    '--em-chart-tooltip-gap': 'var(--em-core-spacing--0400)',
    '--em-chart-tooltip-padding': 'var(--em-core-spacing--0500)',
    // Tables sit transparent on the gradient, indigo rules and tinted hovers.
    '--em-tablechart-border-color': 'rgb(68 68 117)',
    '--em-tablechart-cell-background': 'rgb(255 255 255 / 0%)',
    '--em-tablechart-cell-background--hover': 'rgb(68 68 117 / 10%)',
    '--em-tablechart-header-background': 'rgb(255 255 255 / 0%)',
    '--em-tablechart-header-background--hover': 'rgb(68 68 117 / 10%)',
    // Inputs: solid white fields with a strong border hold their own on the gradient.
    '--em-textfield-background': 'rgb(255 255 255)',
    '--em-textfield-border-color': 'var(--em-sem-text--muted)',
    '--em-textfield-border-width': 'var(--em-core-border-width--050)',
    '--em-textfield-border-radius': 'var(--em-core-border-radius--300)',
    '--em-textfield-height': 'var(--em-core-size--1200)',
    '--em-selectfield-trigger-border-color': 'var(--em-sem-background--inverted)',
    '--em-selectfield-trigger-border-width': 'var(--em-core-border-width--050)',
    '--em-selectfield-trigger-border-radius': 'var(--em-core-border-radius--300)',
    '--em-selectfield-trigger-height': 'var(--em-core-size--1200)',
    '--em-selectfield-category-border-radius': 'var(--em-core-border-radius--500)',
    // Switch: on/off surfaces swapped relative to the default.
    '--em-switch-background--off': 'var(--em-sem-background--inverted)',
    '--em-switch-background--on': 'var(--em-sem-background--subtle)',
  },
};
