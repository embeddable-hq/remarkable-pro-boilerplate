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
export const definePreview = real.definePreview;
export const defineEditor = real.defineEditor;
export const useEmbeddableState = real.useEmbeddableState;

export const defineComponent = ((Component: any, meta: any, config: any) => {
  if (meta?.name) {
    g.__EMB_CAPTURED__[meta.name] = { Component, meta, config };
  }
  return real.defineComponent(Component, meta, config);
}) as typeof real.defineComponent;

export type { Inputs, EmbeddedComponentMeta } from '@real/react';
