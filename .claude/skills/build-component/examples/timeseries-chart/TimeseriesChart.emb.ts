import { DataResponse, Dimension, Granularity, LoadDataRequest, Value, loadData } from '@embeddable.com/core';
import { EmbeddedComponentMeta, defineComponent, Inputs, definePreview } from '@embeddable.com/react';
import {
  inputs,
  previewData,
  getDimensionWithGranularity,
  ThemeClientContext,
  LineChartProOptionsClickArg,
} from '@embeddable.com/remarkable-pro';
import Component from './index';

// Ladder rung 4: the full chart pattern — BOTH internal state (granularity, which only
// changes what THIS chart shows) AND an emitted click event. 3-arg props for timezone.
export const meta = {
  name: 'TimeseriesChart', // must match the .emb.ts filename (TimeseriesChart.emb.ts)
  label: 'Timeseries Chart (example)',
  description: 'Line chart over a time dimension with one+ measures. Internal granularity toggle; emits clicked point.',
  category: 'Line Charts',
  inputs: [
    inputs.dataset,
    inputs.measures,
    { ...inputs.dimensionWithGranularitySelectField, name: 'xAxis', label: 'X-axis' },
    inputs.title,
    inputs.description,
    inputs.tooltip,
    inputs.showLegend,
    inputs.showTooltips,
    inputs.showValueLabels,
    inputs.maxResults,
  ],
  events: [
    {
      name: 'onLineClicked',
      label: 'A point is clicked',
      properties: [
        { name: 'axisDimensionValue', label: 'Clicked axis dimension value', type: 'string' },
        { name: 'axisDimensionTimeRange', label: 'Clicked axis dimension time range', type: 'timeRange' },
      ],
    },
  ],
} as const satisfies EmbeddedComponentMeta;

export type ExampleTimeseriesChartState = { granularity?: Granularity };

const loadDataArgs = (
  inputs: Inputs<typeof meta>,
  xAxis: Dimension,
  clientContext?: ThemeClientContext,
): LoadDataRequest => ({
  limit: inputs.maxResults,
  from: inputs.dataset,
  select: [...inputs.measures, xAxis],
  timezone: clientContext?.timezone,
});

// `previewData` ships only a *categorical* dimension, but this is a TIME-SERIES chart — so build a
// time-typed preview: a dimension with `nativeType: 'time'` + a `granularity`, and dated result rows
// keyed by the dimension/measure names. Without this, `useFillGaps` no-ops and the builder preview
// (and the sandbox, which seeds inputs from this preview) render categorical, non-date data.
const previewXAxis = {
  ...previewData.dimension,
  nativeType: 'time',
  inputs: { ...(previewData.dimension as { inputs?: Record<string, unknown> }).inputs, granularity: 'month' },
} as Dimension;
const previewResults: DataResponse = {
  ...previewData.results1Measure1Dimension,
  data: ['2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01', '2024-05-01', '2024-06-01'].map(
    (date, i) => ({ [previewXAxis.name]: date, [previewData.measure.name]: 80 + i * 20 }),
  ) as DataResponse['data'],
};

export const preview = definePreview(Component, {
  xAxis: previewXAxis,
  measures: [previewData.measure],
  results: previewResults,
  hideMenu: true,
});

export default defineComponent(Component, meta, {
  props: (
    inputs: Inputs<typeof meta>,
    [state, setState]: [ExampleTimeseriesChartState, (state: ExampleTimeseriesChartState) => void],
    clientContext: ThemeClientContext,
  ) => {
    // Apply the state-chosen granularity to the x-axis BEFORE loading — internal state.
    const xAxis = getDimensionWithGranularity(inputs.xAxis, state?.granularity);
    return {
      ...inputs,
      xAxis,
      setGranularity: (granularity: Granularity) => setState({ granularity }),
      results: loadData(loadDataArgs(inputs, xAxis, clientContext)),
    };
  },
  events: {
    onLineClicked: (value: LineChartProOptionsClickArg) => ({
      axisDimensionValue: value.dimensionValue ?? Value.noFilter(),
      axisDimensionTimeRange: value.dimensionTimeRange ?? Value.noFilter(),
    }),
  },
});
