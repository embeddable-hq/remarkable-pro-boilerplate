/**
 * ResizableFrame — a box with:
 * - Preset size buttons (5 presets from spec)
 * - Drag-to-resize handle (bottom-right corner)
 * - Dimensions display
 */

import { useState, useRef, useCallback } from 'react';
import type { Colors } from './main.tsx';
import { SYSTEM_FONT } from './main.tsx';

const PRESETS = [
  { label: '600×400', width: 600, height: 400, title: 'default chart' },
  { label: '280×560', width: 280, height: 560, title: 'narrow/tall' },
  { label: '1400×260', width: 1400, height: 260, title: 'wide/short' },
];

type ResizableFrameProps = {
  initialWidth: number;
  initialHeight: number;
  children: React.ReactNode;
  darkMode: boolean;
  colors: Colors;
};

export function ResizableFrame({ initialWidth, initialHeight, children, darkMode, colors: c }: ResizableFrameProps) {
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragStartRef.current) return;
      const { x, y, w, h } = dragStartRef.current;
      const newW = Math.max(160, w + ev.clientX - x);
      const newH = Math.max(60, h + ev.clientY - y);
      setSize({ width: newW, height: newH });
    };

    const onMouseUp = () => {
      dragStartRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [size]);

  return (
    <div>
      {/* Preset buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12, alignItems: 'center' }}>
        {PRESETS.map((p) => {
          const active = size.width === p.width && size.height === p.height;
          return (
            <button
              key={p.label}
              title={p.title}
              onClick={() => setSize({ width: p.width, height: p.height })}
              style={{
                padding: '3px 9px',
                fontSize: 11,
                borderRadius: 5,
                border: `1px solid ${active ? c.activeBorder : c.frameOutline}`,
                background: active ? c.activeBg : 'transparent',
                color: active ? c.activeText : c.textMuted,
                cursor: 'pointer',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontWeight: active ? 700 : 400,
                transition: 'border-color 0.1s, background 0.1s',
              }}
            >
              {p.label}
            </button>
          );
        })}
        <span style={{
          alignSelf: 'center', fontSize: 11,
          color: c.textFaint,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          marginLeft: 4,
        }}>
          {size.width}×{size.height}
        </span>
      </div>

      {/* Outer scroll container — allows wide frames without page overflow */}
      <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
        {/* The frame */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: size.width,
            height: size.height,
            minWidth: size.width,
            border: `1px solid ${c.frameOutline}`,
            borderRadius: 7,
            overflow: 'hidden',
            background: darkMode ? '#1e2433' : '#ffffff',
            boxShadow: darkMode
              ? '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)'
              : '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)',
          }}
        >
          {/* Inner inset so the component isn't glued to the frame edge (sandbox viewing aid). */}
          <div style={{ width: '100%', height: '100%', padding: 16, boxSizing: 'border-box' }}>
            {children}
          </div>

          {/* Drag handle */}
          <div
            onMouseDown={onMouseDown}
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 20, height: 20,
              cursor: 'nwse-resize', zIndex: 10,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
              padding: 3,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M9 1L1 9M9 5L5 9M9 9" stroke={darkMode ? '#4b5563' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export { PRESETS };
