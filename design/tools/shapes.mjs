/* design/tools/shapes.mjs · Tampa Bay Chartbook · design system "Chart & Label"
   The six sheet-badge silhouettes, drawn for any box (w × h). Each sheet is code + shape + ink, so a
   sheet never depends on color alone:
     TP Tampa            cartouche   a label panel with concave corners (the cigar-box label)
     SP St. Petersburg   roundel     an ellipse (the sun; St. Petersburg calls itself the Sunshine City)
     GB Gulf Beaches     lozenge     a long hexagon pointed at both ends
     CW Clearwater & NP  shield      a flat-topped escutcheon
     AB Around the Bay   slant       a parallelogram (the drive around the bay)
     DT Day Trips        burgee      a swallowtail pennant (setting out)
   Used by build-tokens.mjs (clip-path path() tokens for the 18 × 12 sheet dot) and brand.mjs (badge SVGs). */

const f = (v) => (Math.round(v * 100) / 100).toString();

export const SHAPES = {
  tampa(w, h) {
    const r = Math.min(w, h) * 0.24;
    return `M${f(r)} 0H${f(w - r)}A${f(r)} ${f(r)} 0 0 0 ${f(w)} ${f(r)}V${f(h - r)}A${f(r)} ${f(r)} 0 0 0 ${f(w - r)} ${f(h)}H${f(r)}A${f(r)} ${f(r)} 0 0 0 0 ${f(h - r)}V${f(r)}A${f(r)} ${f(r)} 0 0 0 ${f(r)} 0Z`;
  },
  stpete(w, h) {
    return `M0 ${f(h / 2)}A${f(w / 2)} ${f(h / 2)} 0 1 0 ${f(w)} ${f(h / 2)}A${f(w / 2)} ${f(h / 2)} 0 1 0 0 ${f(h / 2)}Z`;
  },
  beaches(w, h) {
    const p = h * 0.3;
    return `M${f(p)} 0H${f(w - p)}L${f(w)} ${f(h / 2)}L${f(w - p)} ${f(h)}H${f(p)}L0 ${f(h / 2)}Z`;
  },
  clearwater(w, h) {
    const s = h * 0.42;
    return `M0 0H${f(w)}V${f(s)}C${f(w)} ${f(h * 0.72)} ${f(w * 0.74)} ${f(h * 0.9)} ${f(w / 2)} ${f(h)}C${f(w * 0.26)} ${f(h * 0.9)} 0 ${f(h * 0.72)} 0 ${f(s)}Z`;
  },
  around(w, h) {
    const p = h * 0.3;
    return `M${f(p)} 0H${f(w)}L${f(w - p)} ${f(h)}H0Z`;
  },
  daytrips(w, h) {
    const p = h * 0.34;
    return `M0 0H${f(w)}L${f(w - p)} ${f(h / 2)}L${f(w)} ${f(h)}H0Z`;
  },
};

/** Where the code sits inside the shape (fraction of w, h): the shield and the burgee are off-center. */
export const TEXT_AT = {
  tampa: [0.5, 0.5], stpete: [0.5, 0.5], beaches: [0.5, 0.5], clearwater: [0.5, 0.43], around: [0.5, 0.5], daytrips: [0.44, 0.5],
};

/** Inset a path's box for a keyline drawn inside the badge (used for the double rule on large badges). */
export function inset(id, w, h, by) {
  return { d: SHAPES[id](w - by * 2, h - by * 2), transform: `translate(${f(by)} ${f(by)})` };
}
