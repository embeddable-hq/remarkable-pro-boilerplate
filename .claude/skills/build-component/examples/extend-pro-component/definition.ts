import { barChartDefaultPro, inputs } from '@embeddable.com/remarkable-pro';
import BarChartLowStockWarning from './index';

// Ladder rung 6: Pattern B. Spread an existing Pro component and override only what changes.
// Here we add two inputs and wrap the chart with a warning banner.
//
// Note: do NOT add `as const` to an extended meta — spreading the base meta's inputs into a
// new array literal keeps `inputs` a *mutable* ComponentMetaInput[], which is what the SDK's
// `defineComponent`/`Inputs` expect. `as const` would make it `readonly` and fail to compile.
const meta = {
  ...barChartDefaultPro.meta,
  name: 'BarChartLowStock', // must match the .emb.ts filename (BarChartLowStock.emb.ts)
  label: 'Bar Chart with low-stock warning (example)',
  inputs: [
    ...barChartDefaultPro.meta.inputs,
    { ...inputs.boolean, name: 'showLowStockWarning', label: 'Show low stock warning', defaultValue: true },
    { ...inputs.number, name: 'lowStockThreshold', label: 'Low stock threshold', defaultValue: 10 },
  ],
};

// Reuse the base component's state/clientContext param types via Parameters.
type BasePropsParams = Parameters<typeof barChartDefaultPro.config.props>;

// `inputs` is typed `any` here on purpose: because the extended `meta` isn't `as const`
// (see above), the SDK infers a loose input type for it, which won't line up with a
// precisely-typed param. A Pattern B props fn is just a thin adapter — it delegates straight
// to the base component's own (fully typed) props — so `any` here is the honest, simplest choice.
const props = (
  inputs: any,
  stateTuple: BasePropsParams[1],
  clientContext: BasePropsParams[2],
) => {
  const baseProps = barChartDefaultPro.config.props(inputs, stateTuple, clientContext);
  return {
    ...baseProps,
    showLowStockWarning: Boolean(inputs.showLowStockWarning),
    lowStockThreshold: Number(inputs.lowStockThreshold),
  };
};

export const exampleBarChartLowStock = {
  ...barChartDefaultPro,
  Component: BarChartLowStockWarning,
  meta,
  config: { ...barChartDefaultPro.config, props },
};
