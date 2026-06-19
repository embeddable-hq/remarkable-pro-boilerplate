# Sizing & resize inside the widget
Every component renders inside a drag-and-drop widget the user can resize to almost any width/height. The component must **fill** the widget and look right across that whole range — this is one of the most common ways custom components break, so design for it from the start.

## Rules
- **Fill the area.** The outermost element is `width: 100%; height: 100%`. `ChartCard`/`EditorCard` already fill the widget; your content fills the card.
- **Chart.js primitives auto-resize.** `BarChart`, `LineChart`, `PieChart`, `KpiChart`, table primitives, etc. resize themselves within their area — don't wrap them in fixed dimensions or extra scroll; just let them fill.
- **Hand-rolled SVG/HTML and tables must handle their own overflow.** Anything whose natural size can exceed the widget — tables, long lists, a funnel/heatmap with many rows or columns, wide grids — must live in a container with `overflow: auto` (or `overflowX`/`overflowY`) so it **scrolls** instead of clipping or stretching the layout. Mark fixed-height rows `flexShrink: 0` so they scroll rather than squash.
- **SVG: scale or scroll, pick one.**
  - *Scale to fit:* give `<svg>` a `viewBox` and a fluid size (`width: 100%; height: 100%`) — good for a single shape like a gauge, radar, or bullet.
  - *Fixed cells, scroll:* render at natural pixel size and wrap in an `overflow: auto` container — good for a grid like a calendar heatmap.
- **SVG label clipping — reserve margin in the `viewBox`.** Anything drawn near the edge (axis/perimeter labels on a radar, pie, or scatter; rotated tick labels) gets **cut off** if it sits at the viewBox boundary. Make the `viewBox` larger than the plotted shape and inset the drawing, e.g. a radar with radius `r` centred at `(cx,cy)` should use a viewBox padded by the longest label width, not `0 0 2r 2r`. Symptom to watch for: "United Kingdom" rendering as "United Kingdo". Don't rely on the widget to show overflow — SVG clips to its box.
- **SVG aspect ratio.** A chart with a natural square/fixed ratio (radar, gauge) can't fill a very wide-short or narrow-tall widget without distorting. Keep `preserveAspectRatio="xMidYMid meet"` (the default) so it stays undistorted and **centres** — accept the letterboxing rather than stretching. Size it to the *constraining* dimension (`max-width: 100%; max-height: 100%`) so it grows to fill whichever of width/height is smaller. Don't pin a fixed `aspectRatio` that leaves it tiny in the middle of a large frame.
  ```tsx
  // fills the frame, stays undistorted, labels not clipped
  <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
       style={{ width: '100%', height: '100%', display: 'block' }}>…</svg>
  // where W/H include padding around the plotted area for labels
  ```
- **Controls must fill width sensibly.** A control dragged to full width must not strand its content against a full-width border. Either stretch its parts to fill (segmented control: `display: flex; width: 100%` with each segment `flex: 1`) or keep it genuinely compact (`alignSelf: 'flex-start'`). Never a full-width border with left-packed content. Note that `display: inline-flex` does **not** stay compact inside a card — the card's column stretches it, so the border goes full width while content stays left; use one of the two explicit options instead.
- **Check both extremes mentally:** very wide + short, and very narrow + tall. If either clips, overflows the widget, or leaves large dead space, add fill/overflow handling.

## In the examples
- `funnel-chart` / `calendar-heatmap`-style components wrap their content in `overflow: auto` (and the calendar's fixed-size SVG grid scrolls horizontally).
- The segmented control fills the width with `flex: 1` segments.
- KPI/pie/line examples lean on the Chart.js primitive + `ChartCard` and need no extra handling.
