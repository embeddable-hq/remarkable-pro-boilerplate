import libraryThemeProvider0 from '@embeddable.com/remarkable-pro/dist/embeddable-theme-4271d.js'
import localThemeProvider from '/Users/r/Projects/remarkable-pro-boilerplate/embeddable.theme.ts';

import { defineTheme } from '@embeddable.com/core';

const parentProviders = [
  libraryThemeProvider0
];

export default function combinedThemeProvider(clientContext) {
  let parentTheme = {};

  // 1. Sequentially call each library's theme, merging the result
  for (const provider of parentProviders) {
    if (typeof provider === 'function') {
      const partial = provider(clientContext, parentTheme);

      // Merge into parentTheme
      parentTheme = defineTheme(parentTheme, partial);
    }
  }

  if (typeof localThemeProvider === 'function') {
    return localThemeProvider(clientContext, parentTheme);
  }

  return parentTheme;
}