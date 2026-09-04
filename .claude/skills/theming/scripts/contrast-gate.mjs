#!/usr/bin/env node
// Contrast gate for generated themes (see references/mapping.md → Contrast gate).
// Usage: node contrast-gate.mjs '<fg>,<bg>,<min>,<label>' ...
//   e.g. node contrast-gate.mjs '#212129,#ffffff,4.5,text/card' '#5c5c66,#ffffff,3,muted/card'
// Hex colors only (#rgb or #rrggbb). Exits 1 if any pair is below its minimum.
const expand = (h) => {
  h = h.replace('#', '').trim();
  return h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
};
const lum = (hex) => {
  const h = expand(hex);
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const pairs = process.argv.slice(2).map((arg) => {
  const [fg, bg, min, ...label] = arg.split(',');
  return [fg, bg, parseFloat(min), label.join(',') || `${fg}/${bg}`];
});
if (!pairs.length) {
  console.error("usage: node contrast-gate.mjs '#fg,#bg,min,label' ...");
  process.exit(2);
}
let fail = 0;
for (const [fg, bg, min, label] of pairs) {
  const r = ratio(fg, bg);
  if (r < min) {
    fail = 1;
    console.log(`FAIL ${label.padEnd(28)} ${r.toFixed(2)} < ${min}`);
  } else {
    console.log(`ok   ${label.padEnd(28)} ${r.toFixed(2)} >= ${min}`);
  }
}
process.exit(fail);
