import {
  dataset,
  description,
  dimension,
  maxLegendItems,
  measure,
  showLegend,
  showTooltips,
  showValueLabels,
  title,
} from "@embeddable.com/remarkable-ui";
import {
  defineComponent,
  EmbeddedComponentMeta,
  Inputs,
} from "@embeddable.com/react";
import CustomPieChartExample from "./index";
import { Dimension, loadData, Value } from "@embeddable.com/core";

export const meta = {
  name: "CustomPieChartExample",
  label: "Custom Pie Chart Example",
  category: "Pie Charts",
  inputs: [
    dataset,
    measure,
    { ...dimension, name: "dimensionOptions", array: true },
    title,
    description,
    showLegend,
    maxLegendItems,
    showTooltips,
    showValueLabels,
  ],
  events: [
    {
      name: "onSegmentClick",
      label: "A segment is clicked",
      properties: [
        {
          name: "dimensionValue",
          label: "Clicked Dimension",
          type: "string",
        },
      ],
    },
  ],
} as const satisfies EmbeddedComponentMeta;

type EmbeddableState = {
  dimension: Dimension;
};

export default defineComponent(CustomPieChartExample, meta, {
  props: (inputs: Inputs<typeof meta>, [embState]) => {
    // TODO: check this approach with harry
    const dimension: Dimension | undefined = (embState as EmbeddableState)
      ?.dimension;

    return {
      ...inputs,
      results: loadData({
        from: inputs.dataset,
        select: [inputs.measure, dimension].filter(Boolean),
      }),
    };
  },
  events: {
    onSegmentClick: (value) => {
      return {
        dimensionValue: value.dimensionValue || Value.noFilter(),
      };
    },
  },
});
