import { ParticleField } from "./ParticleField";

/** Fixed, decorative "control room" backdrop: drifting grid, glows, particles. */
export function GridBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* The grid is painted once on a layer one cell (64px) larger than the viewport and drifts by
          transform, so it runs on the compositor (animating background-position repainted the
          whole viewport every frame). */}
      <div
        className="absolute -top-16 -left-16 right-0 bottom-0 animate-grid-drift opacity-[0.55] will-change-transform"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgb(148 163 184 / 0.07) 1px, transparent 1px), linear-gradient(to right, rgb(148 163 184 / 0.07) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Fades the grid out toward the edges. Same pixels as the old mask-image (only the plain page
          background is behind the grid), but static: no per-frame mask pass over the moving layer. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_30%,transparent_30%,#05070d_80%)]" />
      <div className="absolute -top-40 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-cyan/10 blur-[120px]" />
      <div className="absolute top-[40%] -right-40 h-[30rem] w-[30rem] rounded-full bg-violet/10 blur-[120px]" />
      <ParticleField />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#05070d_100%)]" />
    </div>
  );
}
