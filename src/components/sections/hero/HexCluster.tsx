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

      {/* Generic seven-spoke helm wheel at the centre */}
      <g stroke="#22d3ee" strokeWidth="1.4" fill="none" filter="url(#hc-glow)">
        <circle r="20" />
        <circle r="6" />
        {Array.from({ length: 7 }, (_, i) => {
          const a = ((Math.PI * 2) / 7) * i - Math.PI / 2;
          return (
            <line
              key={i}
              x1={(Math.cos(a) * 6).toFixed(1)}
              y1={(Math.sin(a) * 6).toFixed(1)}
              x2={(Math.cos(a) * 27).toFixed(1)}
              y2={(Math.sin(a) * 27).toFixed(1)}
              strokeLinecap="round"
            />
          );
        })}
      </g>
    </svg>
  );
}
