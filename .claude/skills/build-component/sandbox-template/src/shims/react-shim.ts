/**
 * react-shim.ts
 *
 * Wraps @real/react (the actual @embeddable.com/react ESM) so that every
 * defineComponent call is intercepted and the (Component, meta, config) triple
 * is captured on globalThis.__EMB_CAPTURED__[meta.name].
 *
 * Vite alias maps:
 *   @real/react              → ../node_modules/@embeddable.com/react/lib/index.esm.js
 *   @embeddable.com/react    → this file
 *
 * .emb.ts files import defineComponent from @embeddable.com/react → hits this shim →
 * capture happens → real defineComponent is still called → EmbeddableWrapper returned.
 */

import * as real from '@real/react';

const g = globalThis as any;
g.__EMB_CAPTURED__ ??= {};

export const useTheme = real.useTheme;
export const EmbeddableThemeContext = real.EmbeddableThemeContext;
export const defineEditor = real.defineEditor;
export const useEmbeddableState = real.useEmbeddableState;

// Capture each component's definePreview config (keyed by the Component it wraps) so the sandbox
// can seed its data inputs from the author's preview — that's where per-column sub-inputs like a
// link column's `linkUrl` live. The standard .emb.ts defines `preview` before the default
// defineComponent, so this runs first and the value is ready when defineComponent fires.
const previewByComponent = new WeakMap<any, any>();
export const definePreview = ((Component: any, config: any) => {
  try { previewByComponent.set(Component, config); } catch { /* non-object Component — skip */ }
  return real.definePreview(Component, config);
}) as typeof real.definePreview;

export const defineComponent = ((Component: any, meta: any, config: any) => {
  if (meta?.name) {
    g.__EMB_CAPTURED__[meta.name] = {
      Component,
      meta,
      config,
      previewProps: previewByComponent.get(Component),
    };
  }
  return real.defineComponent(Component, meta, config);
}) as typeof real.defineComponent;

export type { Inputs, EmbeddedComponentMeta } from '@real/react';
