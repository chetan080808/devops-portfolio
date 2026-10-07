/** Deterministic PRNG so server and client render identical particles. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(7);
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${(rand() * 100).toFixed(2)}%`,
  top: `${(60 + rand() * 50).toFixed(2)}%`,
  size: 1 + Math.round(rand() * 2),
  delay: `${(-rand() * 18).toFixed(2)}s`,
  duration: `${(14 + rand() * 14).toFixed(2)}s`,
  violet: rand() > 0.7,
}));

/** Faint particles rising slowly. Pure CSS — no JS runtime cost. */
export function ParticleField() {
  return (
    <div className="absolute inset-0">
      {PARTICLES.map((p) => (
        <span
          key={p.id}
          className={`absolute animate-float-up rounded-full ${p.violet ? "bg-violet/60" : "bg-cyan/50"}`}
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}
