import { LoadDataRequest, Value, loadData } from '@embeddable.com/core';
import { EmbeddedComponentMeta, defineComponent, Inputs, definePreview } from '@embeddable.com/react';
import { inputs, previewData, PieChartClickArg } from '@embeddable.com/remarkable-pro';
import Component from './index';

// Ladder rung 3: data + EMIT. A click expresses intent other widgets should react to,
// so it is an event (not internal state). Modelled on PieChartPro.
export const meta = {
  name: 'PieClickChart', // must match the .emb.ts filename (PieClickChart.emb.ts)
  label: 'Pie Chart with click event (example)',
  description: 'Pie over one dimension + one measure. Emits the clicked segment up to Embeddable.',
  category: 'Pie Charts',
  defaultHeight: 442,
  defaultWidth: 630,
  inputs: [
    inputs.dataset,
    inputs.measure,
    inputs.dimension,
    inputs.title,
    inputs.description,
    inputs.tooltip,
    inputs.showLegend,
    inputs.maxLegendItems,
    inputs.showTooltips,
    inputs.showValueLabels,
  ],
  events: [
    {
      name: 'onSegmentClick',
      label: 'A segment is clicked',
      properties: [
        { name: 'dimensionValue', label: 'Clicked dimension', type: 'string' },
        { name: 'dimensionTimeRange', label: 'Clicked dimension time range', type: 'timeRange' },
      ],
    },
  ],
} as const satisfies EmbeddedComponentMeta;

const loadDataArgs = (inputs: Inputs<typeof meta>): LoadDataRequest => ({
  from: inputs.dataset,
  select: [inputs.measure, inputs.dimension],
});

export const preview = definePreview(Component, {
  dimension: previewData.dimension,
  measure: previewData.measure,
  results: previewData.results1Measure1Dimension,
  hideMenu: true,
});

export default defineComponent(Component, meta, {
  props: (inputs: Inputs<typeof meta>) => ({
    ...inputs,
    results: loadData(loadDataArgs(inputs)),
  }),
  // config.events shapes the payload Embeddable receives; Value.noFilter() = cleared.
  events: {
    onSegmentClick: (value: PieChartClickArg) => ({
      dimensionValue: value.dimensionValue ?? Value.noFilter(),
      dimensionTimeRange: value.dimensionTimeRange ?? Value.noFilter(),
    }),
  },
});
