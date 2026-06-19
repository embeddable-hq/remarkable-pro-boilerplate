import { LoadDataRequest, loadData } from '@embeddable.com/core';
import { EmbeddedComponentMeta, defineComponent, Inputs, definePreview } from '@embeddable.com/react';
import { inputs, previewData } from '@embeddable.com/remarkable-pro';
import Component from './index';

// Ladder rung 2: data, no interaction. loadData lives here in the descriptor,
// not in React. Modelled on KpiChartNumberPro.
export const meta = {
  name: 'KpiTile', // must match the .emb.ts filename (KpiTile.emb.ts)
  label: 'KPI Tile (example)',
  description: 'Single big-number KPI for one measure. Loads data and formats it; no interaction.',
  category: 'Kpi Charts',
  defaultHeight: 442,
  defaultWidth: 630,
  inputs: [
    inputs.dataset,
    inputs.measure,
    inputs.title,
    inputs.description,
    inputs.displayNullAs,
    inputs.tooltip,
    inputs.fontSize,
  ],
} as const satisfies EmbeddedComponentMeta;

const loadDataArgs = (inputs: Inputs<typeof meta>): LoadDataRequest => ({
  from: inputs.dataset,
  select: [inputs.measure],
});

export const preview = definePreview(Component, {
  measure: { ...previewData.measure },
  results: previewData.results1Measure,
  fontSize: 100,
  hideMenu: true,
});

export default defineComponent(Component, meta, {
  props: (inputs: Inputs<typeof meta>) => ({
    ...inputs,
    results: loadData(loadDataArgs(inputs)),
  }),
});
