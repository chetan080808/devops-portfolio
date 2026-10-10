/**
 * Cluster honeycomb in axial coordinates — same layout as the static SVG (HexCluster): centre,
 * inner ring, 6 outer. Plain module (no three import): the DOM side reads NODE_COUNT without
 * pulling three.js into the main bundle.
 */
export const AXIAL: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
  [2, -1], [-2, 1], [1, 1], [-1, -1], [2, -2], [-2, 2],
];
export const NODE_COUNT = { desktop: AXIAL.length, mobile: 7 } as const;
