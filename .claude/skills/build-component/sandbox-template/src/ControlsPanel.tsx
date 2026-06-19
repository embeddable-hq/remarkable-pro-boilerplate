/**
 * ControlsPanel — generates UI controls from meta.inputs.
 *
 * Control mapping:
 *   type 'string'  → text input (or multi-line if array)
 *   type 'number'  → number input
 *   type 'boolean' → checkbox toggle
 *   type 'color'   → color picker
 *   type object with granularity options → select dropdown
 *   dataset / dimension / measure / dimensionOrMeasure → bound to fixed mock; shows read-only badge
 *   array: true (string) → comma-separated text (split on edit)
 *
 * Data inputs (dataset, dimension, measure, dimensionOrMeasure, dimensionSimple, dimensionTime,
 * dimensionWithGranularitySelectField) are controlled by the sandbox mock data model and shown
 * as read-only badges, not editable controls.
 */

import type { InputDef } from './registry.ts';
import type { Colors } from './main.tsx';
import { SYSTEM_FONT } from './main.tsx';

// Input type names that are bound to the mock data model (not user-editable)
const DATA_INPUT_TYPES = new Set([
  'dataset',
  'dimension',
  'measure',
  'dimensionOrMeasure',
  'dimensionSimple',
  'dimensionTime',
  'dimensionWithGranularitySelectField',
  'dimensionWithDateBounds',
  'dimensions',
  'dimensionsAndMeasures',
  'measures',
  'xMeasure',
  'yMeasure',
]);

function isDataInput(input: InputDef): boolean {
  const t = typeof input.type === 'string' ? input.type : input.type?.toString?.() ?? '';
  return DATA_INPUT_TYPES.has(t) || DATA_INPUT_TYPES.has(input.name);
}

const GRANULARITY_OPTIONS = ['second', 'minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'];

function isGranularityType(input: InputDef): boolean {
  return input.name === 'granularity' || input.name === 'granularities';
}

function isColorType(input: InputDef): boolean {
  const t = typeof input.type === 'string' ? input.type : '';
  return t === 'color' || input.name === 'color';
}

type ControlsPanelProps = {
  inputs: readonly InputDef[];
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  colors: Colors;
};

export function ControlsPanel({ inputs, values, onChange, colors: c }: ControlsPanelProps) {
  // Group by category
  const groups: Record<string, InputDef[]> = {};
  for (const inp of inputs) {
    const cat = inp.category ?? 'General';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(inp);
  }

  const inputStyle: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: 5,
    border: `1px solid ${c.divider}`,
    fontSize: 12,
    width: '100%',
    fontFamily: SYSTEM_FONT,
    background: c.preBg,
    color: c.text,
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Object.entries(groups).map(([category, catInputs]) => (
        <div key={category}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: c.textFaint,
            textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8,
            fontFamily: SYSTEM_FONT,
          }}>
            {category}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {catInputs.map((inp) => (
              <ControlRow
                key={inp.name}
                input={inp}
                value={values[inp.name]}
                onChange={onChange}
                inputStyle={inputStyle}
                colors={c}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type RowProps = {
  input: InputDef;
  value: unknown;
  onChange: (n: string, v: unknown) => void;
  inputStyle: React.CSSProperties;
  colors: Colors;
};

function ControlRow({ input, value, onChange, inputStyle, colors: c }: RowProps) {
  const labelEl = (
    <label style={{
      fontSize: 11, color: c.textMuted, fontFamily: SYSTEM_FONT,
      marginBottom: 3, display: 'block',
    }}>
      {input.label}
      {input.required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      {input.array && <span style={{ color: c.textFaint, marginLeft: 4, fontSize: 10 }}>(array)</span>}
    </label>
  );

  if (isDataInput(input)) {
    const typeLabel = typeof input.type === 'string' ? input.type : 'data';
    return (
      <div>
        {labelEl}
        <span style={{
          fontSize: 11, background: c.badgeBg, color: c.badgeText,
          padding: '3px 8px', borderRadius: 4,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          display: 'inline-block',
        }}>
          mock {typeLabel}
        </span>
      </div>
    );
  }

  if (isColorType(input)) {
    return (
      <div>
        {labelEl}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="color"
            value={typeof value === 'string' && value ? value : '#3b82f6'}
            onChange={(e) => onChange(input.name, e.target.value)}
            style={{
              width: 36, height: 28, border: `1px solid ${c.divider}`,
              borderRadius: 4, cursor: 'pointer', padding: 2,
              background: c.preBg,
            }}
          />
          <span style={{
            fontSize: 11, color: c.textMuted,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}>
            {typeof value === 'string' ? value : '#3b82f6'}
          </span>
        </div>
      </div>
    );
  }

  if (isGranularityType(input)) {
    return (
      <div>
        {labelEl}
        <select
          value={typeof value === 'string' ? value : 'day'}
          onChange={(e) => onChange(input.name, e.target.value)}
          style={inputStyle}
        >
          {GRANULARITY_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
    );
  }

  const typeStr = typeof input.type === 'string' ? input.type : (input.type?.toString?.() ?? 'string');

  if (typeStr === 'boolean') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(input.name, e.target.checked)}
          style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#3b82f6' }}
          id={`ctrl-${input.name}`}
        />
        <label htmlFor={`ctrl-${input.name}`} style={{
          fontSize: 11, color: c.textMuted,
          fontFamily: SYSTEM_FONT, cursor: 'pointer',
        }}>
          {input.label}
        </label>
      </div>
    );
  }

  if (typeStr === 'number') {
    return (
      <div>
        {labelEl}
        <input
          type="number"
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(input.name, e.target.value === '' ? null : Number(e.target.value))}
          style={inputStyle}
        />
      </div>
    );
  }

  // string (possibly array)
  if (input.array) {
    return (
      <div>
        {labelEl}
        <input
          type="text"
          placeholder="comma-separated values"
          value={Array.isArray(value) ? value.join(', ') : (typeof value === 'string' ? value : '')}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(input.name, raw.split(',').map((s) => s.trim()).filter(Boolean));
          }}
          style={inputStyle}
        />
        <div style={{ fontSize: 10, color: c.textFaint, marginTop: 2, fontFamily: SYSTEM_FONT }}>
          Comma-separated
        </div>
      </div>
    );
  }

  // plain string
  return (
    <div>
      {labelEl}
      <input
        type="text"
        value={typeof value === 'string' ? value : (value == null ? '' : String(value))}
        onChange={(e) => onChange(input.name, e.target.value || null)}
        style={inputStyle}
        placeholder={`(${input.label})`}
      />
    </div>
  );
}
