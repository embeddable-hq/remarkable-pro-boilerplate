import { Dimension } from "@embeddable.com/core";
import { useEmbeddableState, useTheme } from "@embeddable.com/react";
import {
  ChartCard,
  DefaultPieChartProps,
  getPieChartData,
  PieChart,
  resolveI18nProps,
  SelectListOptionProps,
  SingleSelectField,
  Theme,
  getDefaultPieChartOptions,
  DefaultPieChartOptions,
  i18n,
  Typography,
  getThemeFormatter,
  i18nSetup,
} from "@embeddable.com/remarkable-ui";
import styles from "./CustomPieChartExample.module.css";

export type CustomPieChartExampleProps = DefaultPieChartProps & {
  dimensionOptions: Dimension[];
};

const CustomPieChartExample = (props: CustomPieChartExampleProps) => {
  // Access the theme object
  const theme = useTheme() as Theme;

  // Access the theme formatter functions
  const themeFormatter = getThemeFormatter(theme);

  // Setup i18n with the theme
  i18nSetup(theme);

  // Use embeddable state to store the selected dimension
  const [embState, setEmbState] = useEmbeddableState({
    dimension: props.dimensionOptions[0] || null,
  }) as [
    { dimension: Dimension | null },
    (d: { dimension: Dimension | null }) => void
  ];

  // In the builder, string values may be provided as i18n keys.
  // The resolveI18nProps helper resolves these keys to the current locale via i18n.t.
  // It iterates over each field: if the value is a string, we look up its translation.
  // This allows default props like title/description to be translatable.
  // Example: setting the title prop to "myComponent.defaultTitle" will be resolved to "My component title" using the theme's translations. (it needs to be included in the theme)
  const {
    description,
    dimensionOptions = [],
    maxLegendItems,
    measure,
    results,
    showLegend,
    showTooltips,
    showValueLabels,
    title,
    onSegmentClick,
  } = resolveI18nProps(props);

  const options: SelectListOptionProps[] = props.dimensionOptions.map(
    (dim) => ({
      label: dim.title,
      value: dim.name,
    })
  );

  const getDimensionByValue = (value?: string): Dimension | undefined => {
    if (!value) return undefined;
    return dimensionOptions.find((dim) => dim.name === value);
  };

  const dimensionValue = embState?.dimension?.name;

  const data = getPieChartData(
    {
      data: results.data,
      dimension: getDimensionByValue(dimensionValue) as Dimension,
      measure,
      maxLegendItems,
    },
    theme
  );

  const pieChartOptions = getDefaultPieChartOptions(
    {
      measure,
      showTooltips,
      showLegend,
      showValueLabels,
    } as DefaultPieChartOptions,
    theme
  );

  const handleDimensionChange = (value: string) => {
    const newDimension = dimensionOptions.find((d) => d.name === value) || null;
    setEmbState({ dimension: newDimension });
  };

  const handleSegmentClick = (index: number | undefined) => {
    onSegmentClick({
      dimensionValue:
        index === undefined
          ? undefined
          : results.data?.[index]?.[dimensionValue!],
    });
  };

  return (
    <ChartCard data={results} title={title} subtitle={description}>
      <div className={styles.subContainer}>
        <Typography>
          📅 <b>Example formatted date: </b>
          {/* Use theme formatter to format todays date with the current locale */}
          {themeFormatter.dateTime(new Date(), {
            month: "long",
            year: "numeric",
            day: "numeric",
          })}
        </Typography>
        <Typography>
          📘 <b>Example translation: </b>
          {/* Use i18n to obtain our new theme translation welcomeToEmbeddable */}
          {i18n.t("welcomeToEmbeddable")}
        </Typography>
        <div style={{ maxWidth: 150 }}>
          <SingleSelectField
            value={dimensionValue}
            options={options}
            onChange={handleDimensionChange}
          />
        </div>
        <PieChart
          data={data}
          options={pieChartOptions}
          onSegmentClick={handleSegmentClick}
        />
      </div>
    </ChartCard>
  );
};

export default CustomPieChartExample;
