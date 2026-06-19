/**
 * BuildStatus panel — shows results of embeddable:build and npm run ct.
 * Polls the build-server for status. Provides buttons to trigger each command.
 *
 * Now rendered inline inside the right inputs column (not fixed-position).
 */

import { useState, useEffect, useCallback } from 'react';
import type { Colors } from './main.tsx';
import { SYSTEM_FONT } from './main.tsx';

type CommandResult = {
  running?: boolean;
  success?: boolean;
  code?: number;
  stdout?: string;
  stderr?: string;
  duration?: number;
  runAt?: string;
} | null;

type StatusResponse = {
  build: CommandResult;
  ct: CommandResult;
};

type BuildStatusProps = {
  colors: Colors;
  darkMode: boolean;
};

const API = '/api';

function badgeColors(result: CommandResult, dark: boolean) {
  if (!result) return { text: '#888', bg: dark ? '#1e2330' : '#f3f4f6' };
  if (result.running) return { text: dark ? '#fcd34d' : '#92400e', bg: dark ? '#2a1e00' : '#fef3c7' };
  if (result.success) return { text: dark ? '#86efac' : '#166534', bg: dark ? '#052e16' : '#dcfce7' };
  return { text: dark ? '#fca5a5' : '#991b1b', bg: dark ? '#2d0a0a' : '#fee2e2' };
}

function statusText(result: CommandResult, label: string) {
  if (!result) return `${label}: not run`;
  if (result.running) return `${label}: running…`;
  if (result.success) return `${label}: PASS${result.duration ? ` (${(result.duration / 1000).toFixed(1)}s)` : ''}`;
  return `${label}: FAIL (exit ${result.code ?? '?'})`;
}

export function BuildStatus({ colors: c, darkMode }: BuildStatusProps) {
  const [status, setStatus] = useState<StatusResponse>({ build: null, ct: null });
  const [expanded, setExpanded] = useState<'build' | 'ct' | null>(null);

  const poll = useCallback(() => {
    fetch(`${API}/status`)
      .then((r) => r.json())
      .then((data: StatusResponse) => setStatus(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [poll]);

  const trigger = (cmd: 'build' | 'ct') => {
    fetch(`${API}/${cmd}`, { method: 'POST' })
      .then(() => setTimeout(poll, 500))
      .catch(() => {});
  };

  const buildBadge = badgeColors(status.build, darkMode);
  const ctBadge = badgeColors(status.ct, darkMode);

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    padding: '3px 10px',
    fontSize: 11,
    borderRadius: 4,
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? (darkMode ? '#1e2330' : '#e5e7eb') : '#3b82f6',
    color: disabled ? c.textMuted : '#fff',
    border: 'none',
    whiteSpace: 'nowrap' as const,
    fontFamily: SYSTEM_FONT,
    opacity: disabled ? 0.7 : 1,
    transition: 'background 0.15s',
  });

  const logsBtn: React.CSSProperties = {
    padding: '3px 8px',
    fontSize: 11,
    borderRadius: 4,
    cursor: 'pointer',
    background: darkMode ? '#1e2330' : '#f3f4f6',
    color: c.textMuted,
    border: `1px solid ${c.divider}`,
    fontFamily: SYSTEM_FONT,
  };

  return (
    <div style={{ fontFamily: SYSTEM_FONT }}>
      <div style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: 0.9, color: c.textFaint, marginBottom: 10,
      }}>
        Build Status
        <span style={{ marginLeft: 6, fontWeight: 400, letterSpacing: 0, textTransform: 'none', color: c.textFaint }}>
          · polls 3s
        </span>
      </div>

      {/* Build row */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            flex: 1, fontSize: 11, fontWeight: 600,
            color: buildBadge.text, background: buildBadge.bg,
            padding: '3px 8px', borderRadius: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {statusText(status.build, 'embeddable:build')}
          </span>
          <button onClick={() => trigger('build')} disabled={!!status.build?.running} style={btnStyle(!!status.build?.running)}>Run</button>
          {(status.build?.stdout || status.build?.stderr) && (
            <button onClick={() => setExpanded(expanded === 'build' ? null : 'build')} style={logsBtn}>
              {expanded === 'build' ? 'hide' : 'logs'}
            </button>
          )}
        </div>
        {expanded === 'build' && (
          <pre style={{
            margin: '6px 0 0', padding: 8,
            background: darkMode ? '#0d1117' : '#1e293b',
            borderRadius: 6, maxHeight: 180, overflow: 'auto',
            fontSize: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            color: status.build?.success ? '#86efac' : '#fca5a5',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}>
            {[status.build?.stdout, status.build?.stderr].filter(Boolean).join('\n').trim() || '(no output)'}
          </pre>
        )}
      </div>

      {/* CT row */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            flex: 1, fontSize: 11, fontWeight: 600,
            color: ctBadge.text, background: ctBadge.bg,
            padding: '3px 8px', borderRadius: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {statusText(status.ct, 'ct (tsc)')}
          </span>
          <button onClick={() => trigger('ct')} disabled={!!status.ct?.running} style={btnStyle(!!status.ct?.running)}>Run</button>
          {(status.ct?.stdout || status.ct?.stderr) && (
            <button onClick={() => setExpanded(expanded === 'ct' ? null : 'ct')} style={logsBtn}>
              {expanded === 'ct' ? 'hide' : 'logs'}
            </button>
          )}
        </div>
        {expanded === 'ct' && (
          <pre style={{
            margin: '6px 0 0', padding: 8,
            background: darkMode ? '#0d1117' : '#1e293b',
            borderRadius: 6, maxHeight: 180, overflow: 'auto',
            fontSize: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            color: status.ct?.success ? '#86efac' : '#fca5a5',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}>
            {[status.ct?.stdout, status.ct?.stderr].filter(Boolean).join('\n').trim() || '(no output)'}
          </pre>
        )}
      </div>
    </div>
  );
}
