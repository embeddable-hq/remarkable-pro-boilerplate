import { useTheme } from '@embeddable.com/react';
import { DataResponse, Dimension, Measure } from '@embeddable.com/core';
import {
  Theme,
  i18nSetup,
  resolveI18nProps,
  ChartCard,
  ChartCardHeaderProps,
  getPieChartProData,
  getPieChartProOptions,
  createPieClickHandler,
  PieChartClickArg,
} from '@embeddable.com/remarkable-pro';
import { PieChart } from '@embeddable.com/remarkable-ui';

type Props = {
  dimension: Dimension;
  measure: Measure;
  results: DataResponse;
  showLegend?: boolean;
  showTooltips?: boolean;
  showValueLabels?: boolean;
  maxLegendItems?: number;
  onSegmentClick?: (arg: PieChartClickArg) => void;
} & ChartCardHeaderProps;

const ExamplePieClickChart = (props: Props) => {
  const theme = useTheme() as Theme;
  i18nSetup(theme);
  const { title, description, tooltip } = resolveI18nProps(props);

  const {
    dimension,
    measure,
    results,
    showLegend,
    showTooltips,
    showValueLabels,
    maxLegendItems,
    hideMenu,
    onSegmentClick,
  } = props;

  // Reuse Pro's data/options builders so colours, legends and labels match the suite.
  const data = getPieChartProData({ data: results.data, dimension, measure, maxLegendItems }, theme);
  const options = getPieChartProOptions({ measure, dimension }, theme);

  // The handler extracts the clicked dimension value and fires the event callback.
  const handleClick = createPieClickHandler({ results, dimension, onClicked: onSegmentClick });

  return (
    <ChartCard
      data={results}
      dimensionsAndMeasures={[dimension, measure]}
      errorMessage={results.error}
      title={title}
      description={description}
      tooltip={tooltip}
      hideMenu={hideMenu}
    >
      <PieChart
        data={data}
        options={options}
        showLegend={showLegend}
        showTooltips={showTooltips}
        showValueLabels={showValueLabels}
        onClick={handleClick}
      />
    </ChartCard>
  );
};

export default ExamplePieClickChart;
