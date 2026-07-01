import { EmbeddedComponentMeta, defineComponent, Inputs, definePreview } from '@embeddable.com/react';
import { inputs } from '@embeddable.com/remarkable-pro';
import Component from './index';

// Ladder rung 1: presentational. No loadData, no events, no state.
// props is a pure passthrough of the configured inputs.
export const meta = {
  name: 'Callout', // must match the .emb.ts filename (Callout.emb.ts)
  label: 'Callout (example)',
  description: 'A titled markdown content block. Use for headings or instructions between widgets.',
  category: 'Content',
  defaultWidth: 600,
  defaultHeight: 200,
  inputs: [{ ...inputs.title }, { ...inputs.markdown }],
} as const satisfies EmbeddedComponentMeta;

export const preview = definePreview(Component, {
  title: 'Welcome',
  markdown: 'This is a **callout**. Use it for headings or instructions between widgets.',
});

export default defineComponent(Component, meta, {
  // The `markdown` input value is markdown text; surface it to the component as a string.
  props: (inputs: Inputs<typeof meta>) => ({
    title: inputs.title,
    markdown: inputs.markdown as string | undefined,
  }),
});
