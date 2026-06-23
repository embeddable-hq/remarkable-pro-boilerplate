/**
 * registry.ts — auto-discover all components under boilerplate's
 * src/embeddable.com/components/**\/*.emb.ts.
 *
 * How it works:
 *   1. import.meta.glob eagerly imports every .emb.ts file.
 *      Each file calls defineComponent(...) at module top-level.
 *      Our react-shim intercepts those calls and stores the
 *      (Component, meta, config) triple in globalThis.__EMB_CAPTURED__.
 *   2. We read __EMB_CAPTURED__ and build the registry array.
 *
 * No manual per-component entries needed — drop a .emb.ts into
 * src/embeddable.com/components/ and it appears automatically.
 */

// Eagerly import every .emb.ts so their module-level defineComponent
// calls run and populate globalThis.__EMB_CAPTURED__.
import.meta.glob(
  '../../src/embeddable.com/components/**/*.emb.ts',
  { eager: true },
);

const captured = (globalThis as any).__EMB_CAPTURED__ ?? {};

export type InputDef = {
  name: string;
  label: string;
  type: string | { toString(): string };
  category?: string;
  defaultValue?: unknown;
  array?: boolean;
  required?: boolean;
  config?: any;
  inputs?: any[];
};

export type RegistryEntry = {
  name: string;
  label: string;
  Component: React.ComponentType<Record<string, unknown>>;
  meta: { inputs: readonly InputDef[]; defaultWidth?: number; defaultHeight?: number };
  config: {
    props?: (inputs: any, state?: any, clientContext?: any) => Record<string, unknown>;
    events?: Record<string, (raw: any) => any>;
  };
  events: Array<{ name: string; label?: string }>;
  // The component's definePreview config props, if it exported one — used to seed data inputs.
  previewProps?: Record<string, unknown>;
};

export const registry: RegistryEntry[] = Object.values(captured).map((c: any) => ({
  name: c.meta.name as string,
  label: (c.meta.label ?? c.meta.name) as string,
  Component: c.Component as React.ComponentType<Record<string, unknown>>,
  meta: c.meta,
  config: c.config ?? {},
  events: (c.meta.events ?? []) as Array<{ name: string; label?: string }>,
  previewProps: c.previewProps as Record<string, unknown> | undefined,
}));

export const componentNames = registry.map((e) => e.name);

// Re-export mockClientContext for use in ComponentView / main
export const mockClientContext = {
  timezone: 'UTC',
  locale: 'en-US',
};
