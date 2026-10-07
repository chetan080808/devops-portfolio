/**
 * Static SVG cluster illustration. Placeholder for the 3D scene (Phase 3)
 * and later the fallback for reduced-motion / no-WebGL visitors.
 */
const R = 34; // hex radius
const SQRT3 = Math.sqrt(3);

// Axial coordinates: centre + inner ring + a few outer nodes.
const NODES: Array<[number, number]> = [
  [0, 0],
  [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
  [2, -1], [-2, 1], [1, 1], [-1, -1], [2, -2], [-2, 2],
];

function toPixel([q, r]: [number, number]) {
  return { x: R * 1.5 * q * 1.6, y: R * SQRT3 * (r + q / 2) * 1.6 };
}

function hexPoints(cx: number, cy: number, radius: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return `${(cx + radius * Math.cos(a)).toFixed(1)},${(cy + radius * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

const points = NODES.map(toPixel);
const edges = points.flatMap((p, i) =>
  points
    .slice(i + 1)
    .filter((q) => Math.hypot(p.x - q.x, p.y - q.y) < R * 3.2)
    .map((q) => ({ a: p, b: q })),
);

// 8 spokes from the hub through the rim (r=19), ending in handles with knobs at r≈29.
const HELM_SPOKES = Array.from({ length: 8 }, (_, i) => {
  const a = (Math.PI / 4) * i - Math.PI / 2;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return {
    x1: (c * 4.5).toFixed(1),
    y1: (s * 4.5).toFixed(1),
    x2: (c * 27).toFixed(1),
    y2: (s * 27).toFixed(1),
    hx: (c * 29).toFixed(1),
    hy: (s * 29).toFixed(1),
  };
});

export function HexCluster() {
  return (
    <svg
      viewBox="-260 -230 520 460"
      role="img"
      aria-label="Illustration of a cluster of hexagonal nodes connected by glowing links"
      className="h-full w-full"
    >
      <defs>
        <radialGradient id="hc-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hc-edge" x1="0" x2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <filter id="hc-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle r="200" fill="url(#hc-core)" />

      <g stroke="url(#hc-edge)" strokeWidth="1" opacity="0.5">
        {edges.map(({ a, b }, i) => (
          <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeDasharray="3 5" />
        ))}
      </g>

      <g filter="url(#hc-glow)">
        {points.map((p, i) => (
          <g key={i}>
            <polygon
              points={hexPoints(p.x, p.y, R)}
              fill="#0a0e18"
              stroke={i === 0 ? "#22d3ee" : i % 3 === 0 ? "#8b5cf6" : "#22d3ee"}
              strokeOpacity={i === 0 ? 1 : 0.7}
              strokeWidth={i === 0 ? 1.6 : 1}
            />
            <circle cx={p.x} cy={p.y} r="2.5" fill={i % 4 === 0 ? "#22c55e" : "#22d3ee"} />
          </g>
        ))}
      </g>

      {/* Generic eight-spoke ship's helm wheel (matches helm_wheel.glb) */}
      <g filter="url(#hc-glow)">
        {HELM_SPOKES.map(({ x1, y1, x2, y2, hx, hy }, i) => (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#7d89a3" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx={hx} cy={hy} r="2" fill="#8b5cf6" />
          </g>
        ))}
        <circle r="19" fill="none" stroke="#22d3ee" strokeWidth="2.4" />
        <circle r="11" fill="none" stroke="#7d89a3" strokeWidth="0.8" strokeOpacity="0.6" />
        <circle r="4.5" fill="#0a0e18" stroke="#22d3ee" strokeWidth="1.4" />
      </g>
    </svg>
  );
}
