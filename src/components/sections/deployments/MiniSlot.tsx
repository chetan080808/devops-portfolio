/**
 * The "bay" each project's mini container lands in. On desktop (motion allowed) the 3D mini drops
 * in from the whale (MiniDrop) and the 2D icon stays hidden; everywhere else the icon shows.
 * `data-landed` is toggled by MiniDropScroll once this card's mini has arrived.
 */
export function MiniSlot({ index }: { index: number }) {
  return (
    <div
      data-mini-slot={index}
      aria-hidden="true"
      className="group/slot relative h-14 w-20 shrink-0 rounded-lg border border-dashed border-line-strong transition-colors duration-500 data-[landed=true]:border-solid data-[landed=true]:border-cyan/40 data-[landed=true]:bg-cyan/[0.04]"
    >
      <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 font-mono text-[0.6rem] whitespace-nowrap text-faint">
        bay-{String(index + 1).padStart(2, "0")}
      </span>
      {/* 2D stand-in: mobile, tablet, reduced motion, no WebGL */}
      <svg
        viewBox="0 0 80 56"
        className="absolute inset-0 h-full w-full p-2 transition-opacity duration-500 [html[data-minis=webgl]_&]:opacity-0"
      >
        <g fill="none" strokeLinejoin="round">
          <path d="M14 22 L40 12 L66 22 L40 32 Z" fill="#1c2236" stroke="#22d3ee" strokeWidth="1.4" />
          <path d="M14 22 L14 40 L40 50 L40 32 Z" fill="#141a2b" stroke="#22d3ee" strokeWidth="1.4" />
          <path d="M66 22 L66 40 L40 50 L40 32 Z" fill="#191f33" stroke="#22d3ee" strokeWidth="1.4" />
          <path d="M20 26 V40 M26 28 V42 M32 30 V45" stroke="#7d89a3" strokeWidth="0.8" />
          <path d="M53 32 V44" stroke="#8b5cf6" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}
