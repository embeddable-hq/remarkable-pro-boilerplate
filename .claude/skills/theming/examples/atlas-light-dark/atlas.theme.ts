// Example: semantic-level brand theme (Strategy A) — the shape of almost every first theme.
// Light + dark are derived from ONE shared block so the chart-color ORDER stays locked across
// variants (colors bind deterministically to dimension values — same order = stable colors).
// ZERO component tokens: semantic + core covers every component, including ones the library
// adds in future releases and custom components built with semantic fallback chains.
// Install as themes/atlas.theme.ts (imported by embeddable.theme.ts).
import { DeepPartial, Theme } from '@embeddable.com/remarkable-pro';

// Chart palette: hue-rotation (+150° walk) from the brand blue #2563eb (H≈217) — the recipe in
// the theming skill's references/mapping.md. Slot 1 is the brand color itself. The dark array
// keeps the same hues in the same order, lifted for the dark card.
const chartLight = [
  '#2563eb', '#d03925', '#1c9c6b', '#d025bc', '#4d9c1c',
  '#3925d0', '#d08e25', '#1c8d9c', '#d02566', '#1c9c2b',
];
const chartDark = [
  '#5a8ad8', '#d8695a', '#39d096', '#d85ac9', '#73d039',
  '#695ad8', '#d8a85a', '#39bfd0', '#d85a8a', '#39d04a',
];

// Pin a color to a data value: '{model}.{dimension}.{Value}' (demo Spotify schema). Pinned
// values keep their color regardless of palette position; builder per-field picks still win.
const pinnedColors = {
  dimensionValue: { 'music_artists.genre.Pop': '#2563eb' },
};

// Tokens identical in both variants. Each variant is applied ALONE by the provider, so shared
// values must appear in both — hence one const, spread twice.
const sharedStyles = {
  // Typography: this ASSIGNS the family; `fonts` below LOADS it. Either alone does nothing.
  '--em-core-font-family--base': "'Figtree'",
  // Shape: the "medium" radius preset — tighter than the library's very round 32px default
  // card. Step 400 is the CARD corner (--em-card-border-radius reads it); only step 500 is
  // the pill — that one stays inherited.
  '--em-core-border-radius--100': '3px',
  '--em-core-border-radius--150': '5px',
  '--em-core-border-radius--200': '6px',
  '--em-core-border-radius--300': '10px',
  '--em-core-border-radius--400': '16px',
};

const fonts = {
  // defineTheme REPLACES arrays: Inter (the library's base font) must be re-included here,
  // or it silently stops loading the moment Figtree is added.
  google: [{ name: 'Inter' }, { name: 'Figtree', weights: '400..700' }],
};

export const atlasLight: DeepPartial<Theme> = {
  fonts,
  charts: {
    // Palettes are customized HERE — the backgroundColors array — not by overriding the
    // --em-sem-chart-color--N tokens (those are only the library's built-in fallback).
    // Resolution: builder pick → colorMap pins → these arrays → CSS tokens.
    // borderColors is optional and falls back to backgroundColors.
    backgroundColors: chartLight,
    backgroundColorMap: pinnedColors,
  },
  styles: {
    ...sharedStyles,
    // Surfaces — card is THE primary themed surface (--em-card-background inherits it).
    '--em-sem-background': '#ffffff',
    '--em-sem-background--neutral': '#ffffff', // menus, select triggers, table cells
    '--em-sem-background--light': '#eef1f6', // soft emphasis (action icons, table borders)
    '--em-sem-background--subtle': '#e6eaf2', // hover
    '--em-sem-background--muted': '#d4dae6', // pressed, stronger lines
    '--em-sem-background--inverted': '#1a1d29', // tooltips, selected items
    // Text
    '--em-sem-text': '#1a1d29',
    '--em-sem-text--neutral': '#0d0f16',
    '--em-sem-text--muted': '#5b6272', // axes, legends, subtitles — 6.1:1 on the card
    '--em-sem-text--subtle': '#9aa1b1', // disabled only
    '--em-sem-text--inverted': '#ffffff',
    // Status: library defaults kept — they sit fine on this brand. (Doctrine: override the minimum.)
    // Depth: soft shadow (default hue at ~12% alpha instead of 25%).
    '--em-core-shadow-color': '#2121291f',
  },
};

export const atlasDark: DeepPartial<Theme> = {
  fonts,
  charts: {
    // Same hues, same ORDER as light, lifted for the dark card (value→color stability).
    backgroundColors: chartDark,
    backgroundColorMap: pinnedColors,
  },
  styles: {
    ...sharedStyles,
    // Surfaces — same ladder, inverted (see references/mapping.md → "Dark from light").
    '--em-sem-background': '#1c1f2a',
    '--em-sem-background--neutral': '#12141b',
    '--em-sem-background--light': '#272b39',
    '--em-sem-background--subtle': '#272b39',
    '--em-sem-background--muted': '#333949',
    '--em-sem-background--inverted': '#f4f6f8',
    // Text
    '--em-sem-text': '#f2f4f8',
    '--em-sem-text--neutral': '#ffffff',
    '--em-sem-text--muted': '#a8aec0',
    '--em-sem-text--subtle': '#6a7186',
    '--em-sem-text--inverted': '#1c1f2a',
    // Status: the library defaults are light-mode pale tints — dark needs its own pairs.
    '--em-sem-status-error-background': '#501616',
    '--em-sem-status-error-text': '#ff8686',
    '--em-sem-status-success-background': '#103225',
    '--em-sem-status-success-text': '#6ee3aa',
    // Depth
    '--em-core-shadow-color': '#00000080',
  },
};
