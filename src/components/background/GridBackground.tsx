import { ParticleField } from "./ParticleField";

/** Fixed, decorative "control room" backdrop: drifting grid, glows, particles. */
export function GridBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 animate-grid-drift opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgb(148 163 184 / 0.07) 1px, transparent 1px), linear-gradient(to right, rgb(148 163 184 / 0.07) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 30%, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 30%, black 30%, transparent 80%)",
        }}
      />
      <div className="absolute -top-40 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-cyan/10 blur-[120px]" />
      <div className="absolute top-[40%] -right-40 h-[30rem] w-[30rem] rounded-full bg-violet/10 blur-[120px]" />
      <ParticleField />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#05070d_100%)]" />
    </div>
  );
}
