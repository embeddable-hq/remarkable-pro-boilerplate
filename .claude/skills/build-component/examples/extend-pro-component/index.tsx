import { barChartDefaultPro, BarChartDefaultProProps } from '@embeddable.com/remarkable-pro';
import { Typography } from '@embeddable.com/remarkable-ui';

type Props = BarChartDefaultProProps & {
  showLowStockWarning?: boolean;
  lowStockThreshold?: number;
};

// Wrap the original Pro chart with extra UI. The chart itself is unchanged — we render
// barChartDefaultPro.Component inside our layout and add a banner below it.
const BarChartLowStockWarning = ({ showLowStockWarning, lowStockThreshold, ...props }: Props) => {
  const measureName = props.measures[0]?.name;
  const hasLowStock =
    showLowStockWarning &&
    typeof lowStockThreshold === 'number' &&
    !!measureName &&
    props.results.data?.some((row) => Number(row[measureName]) < lowStockThreshold);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <barChartDefaultPro.Component {...props} />
      </div>
      {hasLowStock && <Typography as="p">⚠️ Items have low stock</Typography>}
    </div>
  );
};

export default BarChartLowStockWarning;
