/**
 * StylesPanel — shows the CSS variables referenced by a component, with
 * current resolved values, colour swatches, and editable inputs that apply
 * overrides live via document.documentElement.style.setProperty().
 *
 * Sections:
 *   Component  — tokens NOT starting with --em-sem- or --em-core-
 *   Semantic   — tokens starting with --em-sem-
 *   Core       — tokens starting with --em-core- (collapsed / de-emphasised)
 */

import { useState, useEffect, useCallback } from 'react';
import type { Colors } from './main.tsx';
import { SYSTEM_FONT } from './main.tsx';
import { tokensForComponent } from './component-styles-scan.ts';

type StylesPanelProps = {
  componentName: string;
  darkMode: boolean;
  colors: Colors;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function readToken(token: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}

function looksLikeColor(value: string): boolean {
  if (!value) return false;
  const v = value.trim();
  return (
    v.startsWith('#') ||
    v.startsWith('rgb') ||
    v.startsWith('hsl') ||
    /^[a-zA-Z]+$/.test(v)   // named colours like "white", "red"
  );
}

function classify(token: string): 'component' | 'semantic' | 'core' {
  if (token.startsWith('--em-sem-')) return 'semantic';
  if (token.startsWith('--em-core-')) return 'core';
  return 'component';
}

// ── Sub-components ─────────────────────────────────────────────────────────────

type TokenRowProps = {
  token: string;
  colors: Colors;
  overrides: Record<string, string>;
  onOverride: (token: string, value: string) => void;
};

function TokenRow({ token, colors: c, overrides, onOverride }: TokenRowProps) {
  // Read current live value — either from our inline override or from the theme.
  const liveValue = readToken(token);
  const inputValue = overrides[token] ?? liveValue;
  const isColor = looksLikeColor(liveValue);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: '4px 6px',
      alignItems: 'start',
      padding: '6px 0',
      borderBottom: `1px solid ${c.divider}`,
    }}>
      {/* Token name */}
      <div style={{
        fontSize: 10,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        color: c.preText,
        wordBreak: 'break-all',
        lineHeight: 1.4,
        gridColumn: '1 / -1',
      }}>
        {token}
      </div>

      {/* Value + swatch */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
        {isColor && (
          <div style={{
            width: 14,
            height: 14,
            borderRadius: 3,
            background: liveValue || 'transparent',
            border: `1px solid ${c.divider}`,
            flexShrink: 0,
          }} />
        )}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onOverride(token, e.target.value)}
          style={{
            fontSize: 10,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            padding: '2px 5px',
            borderRadius: 4,
            border: `1px solid ${c.divider}`,
            background: c.preBg,
            color: c.text,
            minWidth: 0,
            width: '100%',
            boxSizing: 'border-box',
            outline: 'none',
          }}
          placeholder="(unset)"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

type SectionProps = {
  label: string;
  tokens: string[];
  colors: Colors;
  overrides: Record<string, string>;
  onOverride: (token: string, value: string) => void;
  defaultOpen?: boolean;
  muted?: boolean;
};

function TokenSection({ label, tokens, colors: c, overrides, onOverride, defaultOpen = true, muted = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (tokens.length === 0) return null;

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          background: 'none',
          border: 'none',
          padding: '4px 0',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
        }}
      >
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          color: muted ? c.textFaint : c.textMuted,
          fontFamily: SYSTEM_FONT,
        }}>
          {label} ({tokens.length})
        </span>
        <span style={{ fontSize: 9, color: c.textFaint, marginLeft: 'auto' }}>
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div style={{ opacity: muted ? 0.65 : 1 }}>
          {tokens.map((tok) => (
            <TokenRow
              key={tok}
              token={tok}
              colors={c}
              overrides={overrides}
              onOverride={onOverride}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function StylesPanel({ componentName, darkMode, colors: c }: StylesPanelProps) {
  const tokens = tokensForComponent(componentName);

  // Track overrides: token → value the user set
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  // Re-read values when component or dark mode changes (theme vars will differ)
  // Also force a re-render so resolved values refresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    // Revert any existing overrides so we start fresh per component / theme.
    // (Don't auto-remove — user may switch component and back.)
    setTick((t) => t + 1);
  }, [componentName, darkMode]);

  const handleOverride = useCallback((token: string, value: string) => {
    document.documentElement.style.setProperty(token, value);
    // Clear the sessionStorage colour cache so palette re-resolves on next render.
    try { sessionStorage.removeItem('embeddable'); } catch { /* ignored */ }
    setOverrides((prev) => ({ ...prev, [token]: value }));
  }, []);

  const handleReset = useCallback(() => {
    for (const token of Object.keys(overrides)) {
      document.documentElement.style.removeProperty(token);
    }
    try { sessionStorage.removeItem('embeddable'); } catch { /* ignored */ }
    setOverrides({});
    setTick((t) => t + 1);
  }, [overrides]);

  const componentTokens = tokens.filter((t) => classify(t) === 'component');
  const semanticTokens  = tokens.filter((t) => classify(t) === 'semantic');
  const coreTokens      = tokens.filter((t) => classify(t) === 'core');

  const hasOverrides = Object.keys(overrides).length > 0;

  if (tokens.length === 0) {
    return (
      <div style={{
        fontSize: 11,
        color: c.textFaint,
        fontFamily: SYSTEM_FONT,
        fontStyle: 'italic',
      }}>
        No style variables referenced.
      </div>
    );
  }

  return (
    <div>
      <div style={{ maxHeight: 420, overflowY: 'auto', overflowX: 'hidden' }}>
        <TokenSection
          label="Component"
          tokens={componentTokens}
          colors={c}
          overrides={overrides}
          onOverride={handleOverride}
          defaultOpen
        />
        <TokenSection
          label="Semantic"
          tokens={semanticTokens}
          colors={c}
          overrides={overrides}
          onOverride={handleOverride}
          defaultOpen
        />
        <TokenSection
          label="Core"
          tokens={coreTokens}
          colors={c}
          overrides={overrides}
          onOverride={handleOverride}
          defaultOpen={false}
          muted
        />
      </div>

      {hasOverrides && (
        <button
          onClick={handleReset}
          style={{
            marginTop: 10,
            padding: '4px 10px',
            fontSize: 11,
            fontFamily: SYSTEM_FONT,
            borderRadius: 5,
            border: `1px solid ${c.divider}`,
            background: c.preBg,
            color: c.textMuted,
            cursor: 'pointer',
            display: 'block',
            width: '100%',
          }}
        >
          Reset styles ({Object.keys(overrides).length} override{Object.keys(overrides).length !== 1 ? 's' : ''})
        </button>
      )}
    </div>
  );
}
