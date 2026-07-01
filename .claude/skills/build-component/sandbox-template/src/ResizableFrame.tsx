/**
 * ResizableFrame — a box with:
 * - Drag-to-resize handle (bottom-right corner)
 * - Dimensions display
 */

import { useState, useRef, useCallback } from 'react';
import type { Colors } from './main.tsx';
import { SYSTEM_FONT } from './main.tsx';

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
      {/* Dimensions readout — drag the bottom-right handle to resize */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <span style={{
          fontSize: 11,
          color: c.textFaint,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        }}>
          {size.width}×{size.height}
        </span>
        <span style={{ fontSize: 11, color: c.textFaint, fontFamily: SYSTEM_FONT }}>
          — drag the corner to resize
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
