import { defineComponent } from '@embeddable.com/react';
import { exampleBarChartLowStock } from './definition';

// Thin re-export: preview + meta + an INLINE defineComponent call spreading the definition's config.
export const preview = exampleBarChartLowStock.preview;
export const meta = exampleBarChartLowStock.meta;

export default defineComponent(exampleBarChartLowStock.Component, meta, exampleBarChartLowStock.config);
