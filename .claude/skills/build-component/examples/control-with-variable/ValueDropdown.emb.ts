import { LoadDataRequest, Value, loadData } from '@embeddable.com/core';
import { EmbeddedComponentMeta, defineComponent, Inputs, definePreview } from '@embeddable.com/react';
import { inputs, previewData } from '@embeddable.com/remarkable-pro';
import Component from './index';

const MAX_OPTIONS = 200;

// Ladder rung 5: a control. BOTH internal state (search re-queries its OWN options)
// and emit (the picked value drives a variable other widgets filter on).
// Modelled on SingleSelectFieldPro.
export const meta = {
  name: 'ValueDropdown', // must match the .emb.ts filename (ValueDropdown.emb.ts)
  label: 'Value Dropdown (example)',
  description: 'Single-select dropdown of a dimension’s values. Reactive search (internal) + emits selection.',
  category: 'Dropdowns - values',
  defaultWidth: 300,
  defaultHeight: 120,
  inputs: [
    inputs.dataset,
    { ...inputs.dimension, label: 'Dimension (to load dropdown values)' },
    inputs.title,
    inputs.description,
    inputs.tooltip,
    { ...inputs.placeholder, defaultValue: 'Select value...' },
    { ...inputs.string, name: 'selectedValue', label: 'Selected value', category: 'Pre-configured Variables' },
  ],
  events: [
    {
      name: 'onChange',
      label: 'Selected value updated',
      properties: [{ name: 'value', label: 'Selected value', type: 'string' }],
    },
  ],
  // The variable is auto-created in the builder: seeded by `selectedValue`, updated by onChange.
  variables: [
    {
      name: 'dropdown value',
      type: 'string',
      defaultValue: Value.noFilter(),
      inputs: ['selectedValue'],
      events: [{ name: 'onChange', property: 'value' }],
    },
  ],
} as const satisfies EmbeddedComponentMeta;

export type ExampleValueDropdownState = { searchValue?: string };

const loadDataArgs = (inputs: Inputs<typeof meta>, state?: ExampleValueDropdownState): LoadDataRequest => {
  const operator = inputs.dimension.nativeType === 'string' ? 'contains' : 'equals';
  return {
    limit: MAX_OPTIONS,
    from: inputs.dataset,
    select: [inputs.dimension],
    // Search filter is built from internal state — it only changes this control's options.
    filters: state?.searchValue
      ? [{ operator, property: inputs.dimension, value: state.searchValue }]
      : undefined,
  };
};

export const preview = definePreview(Component, {
  dimension: previewData.dimension,
  results: previewData.results1Measure1Dimension,
  onChange: () => null,
});

export default defineComponent(Component, meta, {
  props: (
    inputs: Inputs<typeof meta>,
    [state, setState]: [ExampleValueDropdownState, (state: ExampleValueDropdownState) => void],
  ) => ({
    ...inputs,
    setSearchValue: (searchValue: string) => setState({ searchValue }), // internal
    results: loadData(loadDataArgs(inputs, state)),
  }),
  events: {
    onChange: (selectedValue: string | null) => ({ value: selectedValue ?? Value.noFilter() }),
  },
});
