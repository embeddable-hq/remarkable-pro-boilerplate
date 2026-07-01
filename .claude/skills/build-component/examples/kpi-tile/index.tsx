import { useTheme } from '@embeddable.com/react';
import { DataResponse, Measure } from '@embeddable.com/core';
import {
  Theme,
  i18nSetup,
  resolveI18nProps,
  getThemeFormatter,
  ChartCard,
  ChartCardHeaderProps,
} from '@embeddable.com/remarkable-pro';
import { KpiChart } from '@embeddable.com/remarkable-ui';

type Props = {
  results: DataResponse;
  measure: Measure;
  fontSize?: number;
  displayNullAs?: string;
} & ChartCardHeaderProps;

const ExampleKpiTile = (props: Props) => {
  const theme = useTheme() as Theme;
  i18nSetup(theme);
  const { title, description, tooltip, displayNullAs } = resolveI18nProps(props);
  const { measure, fontSize, results, hideMenu } = props;

  const value = results.data?.[0]?.[measure.name];

  // All value formatting goes through the theme formatter — never hand-format.
  const themeFormatter = getThemeFormatter(theme);
  const valueFormatter = (valueToFormat: number) => themeFormatter.data(measure, valueToFormat);

  // ChartCard renders the header, loading skeleton, error and empty states for us.
  return (
    <ChartCard
      data={results}
      dimensionsAndMeasures={[measure]}
      errorMessage={results.error}
      title={title}
      description={description}
      tooltip={tooltip}
      hideMenu={hideMenu}
    >
      <KpiChart
        displayNullAs={displayNullAs}
        value={value}
        valueFormatter={valueFormatter}
        valueFontSize={fontSize}
      />
    </ChartCard>
  );
};

export default ExampleKpiTile;
