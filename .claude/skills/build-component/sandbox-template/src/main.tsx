/**
 * Remarkable Sandbox — main entry point.
 *
 * Layout: three-column — [sidebar | chart hero | inputs]
 *   - App owns the header + sidebar (left column).
 *   - ComponentView renders the center (chart) + right (inputs) columns as an
 *     internal 2-column grid, filling the remaining space.
 *
 * Theme pipeline:
 *   themeProvider(clientContext, remarkableTheme) → theme
 *   theme.styles injected into :root via <style id="remarkable-ui-embeddable-style">
 *   EmbeddableThemeContext.Provider value={theme} wraps each component render
 *
 * Font override:
 *   The Remarkable components read var(--em-core-font-family--base) which defaults
 *   to 'inter' (a font the sandbox doesn't load). We override it on :root after
 *   injecting theme styles so component titles match the sandbox chrome.
 *   Production uses Inter — this is a deliberate cosmetic sandbox divergence.
 *
 * See README.md for how to run the sandbox, what it reproduces, and its limits.
 */

import '@embeddable.com/remarkable-pro/dist/remarkable-pro.css';
import { i18n } from '@embeddable.com/remarkable-pro';
import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { registry, componentNames, mockClientContext } from './registry.ts';
import { buildTheme, injectThemeStyles } from './theme.ts';
import { ComponentView } from './ComponentView.tsx';

export const SYSTEM_FONT = `system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

/** Languages offered by the sandbox toggle. Remarkable Pro ships `en` and `de` translations. */
export const LANGUAGES = [
  { code: 'en', label: 'English', locale: 'en-US' },
  { code: 'de', label: 'Deutsch', locale: 'de-DE' },
] as const;

/** Inject the font override after the theme style tag so it wins the cascade. */
function injectFontOverride() {
  let el = document.getElementById('sandbox-font-override');
  if (!el) {
    el = document.createElement('style');
    el.id = 'sandbox-font-override';
    document.head.appendChild(el);
  }
  el.textContent = `:root { --em-core-font-family--base: ${SYSTEM_FONT}; }`;
}

// ── Inject theme synchronously BEFORE first render ──────────────────────────
// getChartColors() reads CSS vars from the DOM at render time. If styles aren't
// injected yet, it returns empty strings which get cached in sessionStorage.
// We must inject before React renders to avoid that race.
const _initialTheme = buildTheme({ ...mockClientContext });
injectThemeStyles(_initialTheme);
injectFontOverride();
// Clear any stale sessionStorage color cache from previous runs with wrong vars.
try { sessionStorage.removeItem('embeddable'); } catch { /* ignored */ }

/** Colour tokens for light/dark. Passed down to avoid prop-drilling ad-hoc strings. */
export type Colors = {
  bg: string;
  sidebarBg: string;
  sidebarBorder: string;
  headerBg: string;
  headerBorder: string;
  inputsBg: string;
  inputsBorder: string;
  text: string;
  textMuted: string;
  textFaint: string;
  activeText: string;
  activeBg: string;
  activeBorder: string;
  hoverBg: string;
  divider: string;
  preText: string;
  preBg: string;
  frameOutline: string;
  badgeBg: string;
  badgeText: string;
  buildBg: string;
  buildBorder: string;
  buildText: string;
};

function makeColors(dark: boolean): Colors {
  return dark ? {
    bg:           '#0f1117',
    sidebarBg:    '#13161d',
    sidebarBorder:'#1e2330',
    headerBg:     '#13161d',
    headerBorder: '#1e2330',
    inputsBg:     '#13161d',
    inputsBorder: '#1e2330',
    text:         '#e2e8f0',
    textMuted:    '#8892a0',
    textFaint:    '#4b5563',
    activeText:   '#93c5fd',
    activeBg:     '#172030',
    activeBorder: '#3b82f6',
    hoverBg:      '#1a1f2b',
    divider:      '#1e2330',
    preText:      '#9ca3af',
    preBg:        '#0d1117',
    frameOutline: '#2d3748',
    badgeBg:      '#172030',
    badgeText:    '#93c5fd',
    buildBg:      '#13161d',
    buildBorder:  '#1e2330',
    buildText:    '#e2e8f0',
  } : {
    bg:           '#f6f7f9',
    sidebarBg:    '#ffffff',
    sidebarBorder:'#e5e7eb',
    headerBg:     '#ffffff',
    headerBorder: '#e5e7eb',
    inputsBg:     '#ffffff',
    inputsBorder: '#e5e7eb',
    text:         '#111827',
    textMuted:    '#6b7280',
    textFaint:    '#9ca3af',
    activeText:   '#1d4ed8',
    activeBg:     '#eff6ff',
    activeBorder: '#3b82f6',
    hoverBg:      '#f9fafb',
    divider:      '#e5e7eb',
    preText:      '#374151',
    preBg:        '#f3f4f6',
    frameOutline: '#d1d5db',
    badgeBg:      '#eff6ff',
    badgeText:    '#1d4ed8',
    buildBg:      '#ffffff',
    buildBorder:  '#e5e7eb',
    buildText:    '#111827',
  };
}

function App() {
  const [selectedName, setSelectedName] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('c') ?? componentNames[0];
  });
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState<string>('en');

  const lang = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];
  const clientContext = {
    ...mockClientContext,
    language: lang.code,
    locale: lang.locale,
    ...(darkMode ? { theme: 'dark' } : {}),
  };
  const theme = buildTheme(clientContext);
  const c = makeColors(darkMode);

  // Switch language. i18nSetup(theme) reads theme.i18n.language but initialises i18next only once,
  // so we also call changeLanguage directly and remount the component (via the key below) so it
  // re-runs i18n.t / resolveI18nProps in the chosen language. Pro ships real en/de strings, so
  // chrome (empty/error/menu text, etc.) translates; a string that does NOT change is either
  // hardcoded (a bug to fix) or custom copy with no translation yet.
  const selectLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setLanguage(code);
  };

  useEffect(() => {
    injectThemeStyles(theme);
    injectFontOverride();
    // Clear color cache so getDimensionMeasureColor re-picks colors with new theme vars
    try { sessionStorage.removeItem('embeddable'); } catch { /* ignored */ }
  }, [darkMode]);

  const entry = registry.find((e) => e.name === selectedName) ?? registry[0];

  const selectComponent = (name: string) => {
    setSelectedName(name);
    const url = new URL(window.location.href);
    url.searchParams.set('c', name);
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: c.bg,
      fontFamily: SYSTEM_FONT,
      color: c.text,
      overflow: 'hidden',
    }}>
      {/* ── Top header ──────────────────────────────────────────────────────── */}
      <header style={{
        background: c.headerBg,
        borderBottom: `1px solid ${c.headerBorder}`,
        padding: '0 20px',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Logo mark */}
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ flexShrink: 0 }}>
            <rect width="22" height="22" rx="6" fill="#3b82f6"/>
            <path d="M6 15.5V7l5 4 5-4v8.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 650, color: c.text, letterSpacing: -0.2 }}>
            Remarkable Sandbox
          </span>
          <span style={{
            fontSize: 11, color: c.textMuted, marginLeft: 2,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{
              display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
              background: '#22c55e',
            }} />
            local dev · mock data
          </span>
        </div>

        {/* Right-side controls: language + theme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Language selector — Pro ships en/de; switching shows real translation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: c.textFaint }}>Lang</span>
            <div style={{ display: 'flex', border: `1px solid ${c.frameOutline}`, borderRadius: 6, overflow: 'hidden' }}>
              {LANGUAGES.map((l) => {
                const active = l.code === language;
                return (
                  <button
                    key={l.code}
                    onClick={() => selectLanguage(l.code)}
                    title={`Render in ${l.label}`}
                    style={{
                      padding: '3px 9px', fontSize: 11, border: 'none', cursor: 'pointer',
                      fontFamily: SYSTEM_FONT,
                      background: active ? c.activeBg : 'transparent',
                      color: active ? c.activeText : c.textMuted,
                      fontWeight: active ? 700 : 400,
                    }}
                  >
                    {l.code.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dark/Light toggle */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            fontSize: 12, color: c.textMuted, userSelect: 'none',
          }}>
            <span style={{ color: !darkMode ? c.text : c.textMuted, fontWeight: !darkMode ? 500 : 400 }}>Light</span>
            <div
              onClick={() => setDarkMode((d) => !d)}
              style={{
                width: 38, height: 21, borderRadius: 11,
                background: darkMode ? '#3b82f6' : '#d1d5db',
                position: 'relative', cursor: 'pointer',
                transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 2.5, left: darkMode ? 19 : 2.5,
                width: 16, height: 16, borderRadius: 8,
                background: '#fff', transition: 'left 0.18s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
              }} />
            </div>
            <span style={{ color: darkMode ? c.text : c.textMuted, fontWeight: darkMode ? 500 : 400 }}>Dark</span>
          </label>
        </div>
      </header>

      {/* ── Body: sidebar + content ──────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        minHeight: 0,
        overflow: 'hidden',
      }}>

        {/* ── LEFT: component sidebar ────────────────────────────────────────── */}
        <nav style={{
          width: 216,
          flexShrink: 0,
          background: c.sidebarBg,
          borderRight: `1px solid ${c.sidebarBorder}`,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: '14px 0 20px',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: 0.9, color: c.textFaint,
            padding: '0 16px 10px',
          }}>
            Components
          </div>
          {registry.map((e) => {
            const active = e.name === entry.name;
            return (
              <button
                key={e.name}
                onClick={() => selectComponent(e.name)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 16px 7px 14px',
                  fontSize: 13,
                  fontFamily: SYSTEM_FONT,
                  border: 'none',
                  borderLeft: `2px solid ${active ? c.activeBorder : 'transparent'}`,
                  background: active ? c.activeBg : 'transparent',
                  color: active ? c.activeText : c.textMuted,
                  cursor: 'pointer',
                  fontWeight: active ? 600 : 400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: '1.3',
                  transition: 'background 0.1s, color 0.1s',
                }}
              >
                {e.label}
              </button>
            );
          })}
        </nav>

        {/* ── CENTER + RIGHT: ComponentView renders both ─────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', overflow: 'hidden' }}>
          <ComponentView key={`${entry.name}:${language}`} entry={entry} theme={theme} darkMode={darkMode} colors={c} />
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
