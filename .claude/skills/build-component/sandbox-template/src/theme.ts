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
  return themeProvider(clientContext, remarkableTheme) as Theme;
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
