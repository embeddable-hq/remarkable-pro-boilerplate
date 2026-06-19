import { useTheme } from '@embeddable.com/react';
import { DataResponse, Dimension, Granularity, Measure } from '@embeddable.com/core';
import {
  Theme,
  i18nSetup,
  resolveI18nProps,
  ChartCard,
  ChartCardHeaderProps,
  useFillGaps,
  createSimpleClickHandler,
  getLineChartProData,
  getLineChartProOptions,
  ChartGranularitySelectField,
  LineChartProOptionsClick,
} from '@embeddable.com/remarkable-pro';
import { LineChart } from '@embeddable.com/remarkable-ui';

type Props = {
  xAxis: Dimension;
  measures: Measure[];
  results: DataResponse;
  showLegend?: boolean;
  showTooltips?: boolean;
  showValueLabels?: boolean;
  granularity?: Granularity;
  setGranularity?: (granularity: Granularity) => void;
  onLineClicked?: LineChartProOptionsClick;
} & ChartCardHeaderProps;

const ExampleTimeseriesChart = (props: Props) => {
  const theme = useTheme() as Theme;
  i18nSetup(theme);
  const { title, description, tooltip } = resolveI18nProps(props);

  const {
    measures,
    xAxis,
    granularity,
    showLegend,
    showTooltips,
    showValueLabels,
    hideMenu,
    setGranularity,
    onLineClicked,
  } = props;

  // useFillGaps synthesizes empty time buckets. It no-ops unless xAxis is a time
  // dimension WITH a granularity set, so always feed it the granularity-applied xAxis.
  const results = useFillGaps({ results: props.results, dimension: xAxis });

  const data = getLineChartProData(
    { data: results.data, dimension: xAxis, measures, hasMinMaxYAxisRange: false },
    theme,
  );
  const options = getLineChartProOptions({ data, dimension: xAxis, measures }, theme);

  const handleClick = createSimpleClickHandler({ data, dimension: xAxis, granularity, onClicked: onLineClicked });

  return (
    <ChartCard
      data={results}
      dimensionsAndMeasures={[...measures, xAxis]}
      errorMessage={results.error}
      title={title}
      description={description}
      tooltip={tooltip}
      hideMenu={hideMenu}
    >
      {/* Granularity is internal state: changing it re-runs props -> new loadData. No event. */}
      {setGranularity && <ChartGranularitySelectField dimension={xAxis} onChange={setGranularity} />}
      <LineChart
        data={data}
        showLegend={showLegend}
        showTooltips={showTooltips}
        showValueLabels={showValueLabels}
        options={options}
        onClick={handleClick}
      />
    </ChartCard>
  );
};

export default ExampleTimeseriesChart;
