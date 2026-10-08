/**
 * The bay each project's mini container lands in: the card's main visual. On desktop (motion
 * allowed) the 3D mini drops in from the whale (MiniDrop) and the 2D illustration stays hidden;
 * everywhere else the illustration shows. The card's `data-landed` styles the bay.
 */
export function MiniSlot({ index }: { index: number }) {
  return (
    <div
      data-mini-slot={index}
      aria-hidden="true"
      className="relative mt-5 h-28 rounded-xl border border-dashed border-line-strong bg-white/[0.015] transition-colors duration-500 group-data-[landed=true]/card:border-solid group-data-[landed=true]/card:border-cyan/30 group-data-[landed=true]/card:bg-cyan/[0.03]"
    >
      <span className="absolute top-2 left-3 font-mono text-[0.62rem] text-faint">
        bay-{String(index + 1).padStart(2, "0")}
      </span>
      <span className="absolute top-2 right-3 font-mono text-[0.62rem] text-faint group-data-[landed=false]/card:hidden">
        mounted
      </span>
      <span className="absolute top-2 right-3 hidden font-mono text-[0.62rem] text-warning group-data-[landed=false]/card:inline">
        awaiting container…
      </span>
      {/* 2D stand-in: mobile, tablet, reduced motion, no WebGL */}
      <svg
        viewBox="0 0 160 90"
        className="absolute inset-0 m-auto h-[80%] w-auto transition-opacity duration-500 [html[data-minis=webgl]_&]:opacity-0"
      >
        <g fill="none" strokeLinejoin="round">
          <path d="M30 34 L80 16 L130 34 L80 52 Z" fill="#1c2236" stroke="#22d3ee" strokeWidth="1.6" />
          <path d="M30 34 L30 62 L80 80 L80 52 Z" fill="#141a2b" stroke="#22d3ee" strokeWidth="1.6" />
          <path d="M130 34 L130 62 L80 80 L80 52 Z" fill="#191f33" stroke="#22d3ee" strokeWidth="1.6" />
          <path d="M40 40 V64 M50 43 V68 M60 47 V72 M70 50 V75" stroke="#7d89a3" strokeWidth="0.9" />
          <path d="M105 51 V70 M114 48 V67" stroke="#8b5cf6" strokeWidth="1.4" />
        </g>
      </svg>
    </div>
  );
}
