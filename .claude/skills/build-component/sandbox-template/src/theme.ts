/**
 * Theme pipeline — replicates exactly what the Embeddable runtime does.
 *
 * 1. Import themeProvider (default export of embeddable.theme.ts)
 * 2. Import remarkableTheme (parent theme from @embeddable.com/remarkable-pro)
 * 3. Compute: theme = themeProvider(clientContext, remarkableTheme)
 * 4. Inject theme.styles into :root via a <style> tag with id="remarkable-ui-embeddable-style"
 *    — same id the runtime uses so behaviour is identical.
 *
 * Call injectThemeStyles(theme) once on mount, and again when clientContext changes.
 */

import themeProvider from '@boilerplate/embeddable.theme.ts';
import { remarkableTheme } from '@embeddable.com/remarkable-pro';
import type { Theme } from '@embeddable.com/remarkable-pro';

export { remarkableTheme };

export function buildTheme(clientContext: Record<string, unknown>): Theme {
  const theme = themeProvider(clientContext, remarkableTheme) as Theme;
  // The boilerplate themeProvider only branches on clientContext.theme (dark mode); it does NOT
  // propagate language/locale. The real Embeddable runtime injects both from clientContext, so do
  // the same here — writing the ACTUAL Theme fields:
  //   - theme.i18n.language    → drives i18nSetup(theme) / i18n string lookup (Pro's en/de catalogue)
  //   - theme.formatter.locale → drives getThemeFormatter number/date formatting (e.g. de-DE → 1.234,5)
  // (Data values and a component's own hardcoded strings are never translated — that's expected.)
  if (typeof clientContext.language === 'string') {
    theme.i18n.language = clientContext.language;
  }
  if (typeof clientContext.locale === 'string') {
    theme.formatter.locale = clientContext.locale;
  }
  return theme;
}

export function injectThemeStyles(theme: Theme): void {
  const styles = (theme as unknown as { styles?: Record<string, string> }).styles ?? {};
  const css = `:root { ${Object.keys(styles).map((k) => `${k}: ${styles[k]};`).join(' ')} }`;

  let el = document.getElementById('remarkable-ui-embeddable-style');
  if (!el) {
    el = document.createElement('style');
    el.id = 'remarkable-ui-embeddable-style';
    document.head.appendChild(el);
  }
  el.textContent = css;
}
