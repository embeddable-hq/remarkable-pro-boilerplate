/**
 * ComponentView — renders a single component entry from the registry.
 *
 * Layout within the body area:
 *   CENTER (flex: 1, scrollable): preset buttons + resizable chart frame + disclaimer
 *   RIGHT (280px, scrollable): inputs panel + clientContext + state + event log + build status
 *
 * Render pipeline (fidelity logic — DO NOT CHANGE):
 * 1. buildInputs(meta, controlValues) — produces data-mocked + user-editable inputs
 * 2. config.props(inputs, [embState, setEmbState], clientContext) — the REAL descriptor
 *    mapping, with full state/setState reactivity (setState re-renders → re-calls props)
 * 3. resolveLoadData(mapped) — replaces every loadData() sentinel with mock DataResponse
 * 4. Wire event handlers from meta.events
 * 5. Render <Component {...componentProps}> inside EmbeddableThemeContext.Provider
 */

import { useState, useMemo, useCallback, Component, type ReactNode } from 'react';
import { EmbeddableThemeContext } from '@embeddable.com/react';
import type { Theme } from '@embeddable.com/remarkable-pro';
import { ControlsPanel } from './ControlsPanel.tsx';
import { StylesPanel } from './StylesPanel.tsx';
import { ResizableFrame } from './ResizableFrame.tsx';
import { BuildStatus } from './BuildStatus.tsx';
import type { RegistryEntry, InputDef } from './registry.ts';
import { mockClientContext } from './registry.ts';
import { buildInputs, resolveLoadData } from './emb-runtime.ts';
import type { Colors } from './main.tsx';
import { SYSTEM_FONT } from './main.tsx';

// ─── Error boundary ───────────────────────────────────────────────────────────
type EBState = { error: Error | null };
class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: unknown }, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(error: Error): EBState { return { error }; }
  componentDidUpdate(prev: { resetKey?: unknown }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 12, background: '#fff0f0', color: '#c0392b', fontSize: 12,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          height: '100%', overflow: 'auto',
        }}>
          <strong>Component error:</strong>{'\n'}{String(this.state.error)}{'\n\n'}
          {this.state.error.stack ?? ''}
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Default control values (non-data inputs only) ────────────────────────────
function buildDefaults(inputs: readonly InputDef[]): Record<string, unknown> {
  const DATA_TYPES = new Set([
    'dataset', 'dimension', 'measure', 'dimensionOrMeasure',
    'dimensionSimple', 'dimensionTime', 'dimensionWithGranularitySelectField',
    'dimensionWithDateBounds', 'dimensions', 'dimensionsAndMeasures',
    'measures', 'xMeasure', 'yMeasure',
  ]);
  const out: Record<string, unknown> = {};
  for (const inp of inputs) {
    const t = typeof inp.type === 'string' ? inp.type : (inp.type?.toString?.() ?? '');
    if (DATA_TYPES.has(t)) continue; // handled by buildInputs
    if (inp.defaultValue !== undefined) {
      out[inp.name] = inp.defaultValue;
    } else if (inp.array) {
      out[inp.name] = t === 'string' ? ['Option A', 'Option B', 'Option C'] : [];
    } else {
      out[inp.name] = null;
    }
  }
  return out;
}

function formatVarValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'object') {
    try { return JSON.stringify(val); } catch { return String(val); }
  }
  return String(val);
}

type ComponentViewProps = {
  entry: RegistryEntry;
  theme: Theme;
  darkMode: boolean;
  colors: Colors;
};

export function ComponentView({ entry, theme, darkMode, colors: c }: ComponentViewProps) {
  const { Component: Comp, meta, config, events } = entry;

  // Non-data input values (user-editable via ControlsPanel)
  const [controlValues, setControlValues] = useState<Record<string, unknown>>(
    () => buildDefaults(meta.inputs),
  );

  // Embeddable state — setState re-triggers the useMemo → re-calls config.props
  const [embState, setEmbState] = useState<unknown>(undefined);

  // Event log
  const [eventLog, setEventLog] = useState<Array<{ event: string; payload: unknown; at: string }>>([]);

  // Component variables (meta.variables) — seeded from their `inputs`, updated by their `events`.
  const variables: any[] = (meta as any).variables ?? [];
  // event-driven overrides, keyed by variable name (before any event, we show the seed value)
  const [variableEventValues, setVariableEventValues] = useState<Record<string, unknown>>({});

  const handleControlChange = useCallback((name: string, value: unknown) => {
    setControlValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  // ── Build componentProps through the real config.props descriptor ─────────
  const [propsError, setPropsError] = useState<Error | null>(null);

  const componentProps = useMemo(() => {
    setPropsError(null);
    try {
      const inputs = buildInputs(meta, controlValues);

      let mapped: Record<string, unknown>;
      if (config.props) {
        mapped = config.props(
          inputs,
          [embState, setEmbState] as [unknown, (v: unknown) => void],
          mockClientContext,
        ) as Record<string, unknown>;
      } else {
        mapped = { ...inputs };
      }

      mapped = resolveLoadData(mapped);

      for (const ev of events) {
        const evName = ev.name;
        mapped[evName] = (raw: unknown) => {
          let payload = raw;
          if (config.events?.[evName]) {
            try { payload = config.events[evName](raw); } catch { /* use raw */ }
          }
          setEventLog((prev) => [
            { event: evName, payload, at: new Date().toLocaleTimeString() },
            ...prev.slice(0, 19),
          ]);
          // Update any variable whose linked event matches — like Embeddable does.
          for (const v of variables) {
            for (const ve of (v.events ?? [])) {
              if (ve.name === evName) {
                setVariableEventValues((prev) => ({
                  ...prev,
                  [v.name]: (payload as any)?.[ve.property],
                }));
              }
            }
          }
        };
      }

      return mapped;
    } catch (err) {
      setPropsError(err instanceof Error ? err : new Error(String(err)));
      return {} as Record<string, unknown>;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlValues, embState, config, meta, events]);

  const defaultWidth = (meta as any).defaultWidth ?? 600;
  const defaultHeight = (meta as any).defaultHeight ?? 400;

  const allValues = useMemo(() => {
    const dataInputVals = buildInputs(meta, controlValues);
    return { ...dataInputVals, ...controlValues };
  }, [meta, controlValues]);

  // Current value of each component variable: event override if fired, else its seed input, else default.
  const variableDisplay = variables.map((v) => {
    const seedInput: string | undefined = v.inputs?.[0];
    const seeded = seedInput ? (allValues as Record<string, unknown>)[seedInput] : undefined;
    const value = v.name in variableEventValues
      ? variableEventValues[v.name]
      : (seeded !== undefined && seeded !== null ? seeded : v.defaultValue);
    return { name: v.name as string, type: v.type as string, value };
  });

  // ── Shared style helpers ──────────────────────────────────────────────────
  const sectionLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: 0.9, color: c.textFaint, marginBottom: 8,
    fontFamily: SYSTEM_FONT,
  };

  const panelDivider: React.CSSProperties = {
    borderTop: `1px solid ${c.divider}`, marginTop: 16, paddingTop: 14,
  };

  return (
    <>
      {/* ── CENTER: chart hero ─────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        minWidth: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '28px 32px 40px',
        display: 'flex',
        flexDirection: 'column',
        background: c.bg,
      }}>
        {/* Component heading */}
        <div style={{ marginBottom: 22, flexShrink: 0 }}>
          <h1 style={{
            margin: 0, fontSize: 18, fontWeight: 700,
            color: c.text, letterSpacing: -0.3, fontFamily: SYSTEM_FONT,
          }}>
            {entry.label}
          </h1>
          <div style={{ fontSize: 11, color: c.textMuted, marginTop: 5, fontFamily: SYSTEM_FONT }}>
            Component:{' '}
            <code style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              background: c.preBg, color: c.preText,
              padding: '1px 6px', borderRadius: 4, fontSize: 11,
            }}>{entry.name}</code>
          </div>
        </div>

        {/* Chart or error */}
        {propsError ? (
          <div style={{
            padding: 14, background: '#fef2f2', color: '#991b1b', fontSize: 12,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            borderRadius: 8, border: '1px solid #fecaca',
          }}>
            <strong>config.props() error:</strong>{'\n'}{String(propsError)}{'\n\n'}
            {propsError.stack ?? ''}
          </div>
        ) : (
          <ResizableFrame
            initialWidth={defaultWidth}
            initialHeight={defaultHeight}
            darkMode={darkMode}
            colors={c}
          >
            <ErrorBoundary resetKey={`${entry.name}-${embState}`}>
              <EmbeddableThemeContext.Provider value={theme}>
                <Comp {...componentProps} />
              </EmbeddableThemeContext.Provider>
            </ErrorBoundary>
          </ResizableFrame>
        )}

        {/* Mock data disclaimer */}
        <div style={{
          marginTop: 12, fontSize: 11, color: c.textFaint,
          fontFamily: SYSTEM_FONT, fontStyle: 'italic', flexShrink: 0,
        }}>
          Rendered with mock data via config.props(). Results are not from a real database.
        </div>
      </div>

      {/* ── RIGHT: inputs + debug panel ───────────────────────────────────── */}
      <div style={{
        width: 280,
        flexShrink: 0,
        borderLeft: `1px solid ${c.inputsBorder}`,
        background: c.inputsBg,
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 14, fontFamily: SYSTEM_FONT }}>
            Inputs
          </div>
        </div>

        <div style={{ padding: '0 16px', flexShrink: 0 }}>
          <ControlsPanel
            inputs={meta.inputs}
            values={allValues}
            onChange={handleControlChange}
            colors={c}
          />
        </div>

        {/* Variables — the variables this component creates in the builder, updating live */}
        {variableDisplay.length > 0 && (
          <div style={{ padding: '0 16px', flexShrink: 0, ...panelDivider }}>
            <div style={sectionLabel}>Variables</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {variableDisplay.map((v) => (
                <div key={v.name} style={{
                  background: c.preBg, borderRadius: 5, padding: '6px 8px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: c.text, fontFamily: SYSTEM_FONT }}>
                      {v.name}
                    </span>
                    <span style={{ fontSize: 9, color: c.textFaint, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                      {v.type}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 11, color: c.preText, marginTop: 3, wordBreak: 'break-all',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}>
                    {formatVarValue(v.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Styles — CSS variable tokens this component uses */}
        <div style={{ padding: '0 16px', flexShrink: 0, ...panelDivider }}>
          <div style={sectionLabel}>Styles</div>
          <StylesPanel
            componentName={entry.name}
            darkMode={darkMode}
            colors={c}
          />
        </div>

        {/* clientContext */}
        <div style={{ padding: '0 16px', flexShrink: 0, ...panelDivider }}>
          <div style={sectionLabel}>clientContext (mock)</div>
          <pre style={{
            fontSize: 10, color: c.preText, margin: 0,
            background: c.preBg, padding: 8, borderRadius: 5,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            overflowX: 'auto',
          }}>
            {JSON.stringify(mockClientContext, null, 2)}
          </pre>
        </div>

        {/* Embeddable state */}
        {embState !== undefined && (
          <div style={{ padding: '0 16px', flexShrink: 0, ...panelDivider }}>
            <div style={sectionLabel}>Component state</div>
            <pre style={{
              fontSize: 10, color: c.preText, margin: 0,
              background: c.preBg, padding: 8, borderRadius: 5,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              overflowX: 'auto',
            }}>
              {JSON.stringify(embState, null, 2)}
            </pre>
          </div>
        )}

        {/* Event log */}
        {events.length > 0 && (
          <div style={{ padding: '0 16px', flexShrink: 0, ...panelDivider }}>
            <div style={sectionLabel}>Event log</div>
            {eventLog.length === 0 ? (
              <div style={{ fontSize: 11, color: c.textFaint, fontFamily: SYSTEM_FONT, fontStyle: 'italic' }}>
                No events yet. Interact with the component.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                {eventLog.map((e, i) => (
                  <div key={i} style={{
                    fontSize: 10, borderRadius: 4, padding: '4px 8px', wordBreak: 'break-all',
                    background: darkMode ? '#172030' : '#eff6ff',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}>
                    <span style={{ color: c.activeBorder, fontWeight: 700 }}>{e.event}</span>
                    <span style={{ color: c.textMuted, marginLeft: 6 }}>{e.at}</span>
                    <div style={{ color: c.text, marginTop: 2 }}>{JSON.stringify(e.payload)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Build Status — docked into right panel */}
        <div style={{ padding: '0 16px 20px', marginTop: 'auto', flexShrink: 0, ...panelDivider }}>
          <BuildStatus colors={c} darkMode={darkMode} />
        </div>
      </div>
    </>
  );
}
