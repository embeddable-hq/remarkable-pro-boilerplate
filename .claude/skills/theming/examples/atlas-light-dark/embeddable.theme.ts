// Example: the canonical multi-theme provider — a pure, synchronous lookup from
// clientContext.theme to a brand variant, with the generic 'light'/'dark' keys kept
// as aliases (they're a host-app contract; existing embeds must stay themed).
// Install at the repo root as embeddable.theme.ts; the import below then becomes
// './themes/atlas.theme' (this copy uses './atlas.theme' so the example typechecks in place).
import { defineTheme } from '@embeddable.com/core';
import { DeepPartial, Theme } from '@embeddable.com/remarkable-pro';
import { atlasDark, atlasLight } from './atlas.theme';

// The clientContext contract host apps embed with:
//   <em-beddable client-context='{"theme":"atlas-dark"}'>
type ClientContext = {
  theme?: string; // key into the lookup below; unknown keys fall back to light
  timezone?: string; // applied by the library automatically — never wire it here
  // Hosts may also pass language/locale keys — mapping those into theme.i18n /
  // theme.formatter is localization, out of the theming skill's scope.
};

const themes: Record<string, DeepPartial<Theme>> = {
  // 'light'/'dark' are a host-app contract — keep them resolving (aliased to the brand).
  light: atlasLight,
  dark: atlasDark,
  atlas: atlasLight,
  'atlas-dark': atlasDark,
};

const themeProvider = (clientContext: ClientContext, parentTheme: Theme): Theme => {
  const visual = themes[clientContext?.theme ?? 'light'] ?? themes['light'] ?? {};
  return defineTheme(parentTheme, visual) as Theme;
};

export default themeProvider;
