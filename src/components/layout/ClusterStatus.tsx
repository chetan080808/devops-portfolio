"use client";

import { StatusDot } from "@/components/ui/StatusDot";
import { useChaosRun, useChaosTime } from "@/hooks/useChaos";
import { nodesDown } from "@/lib/chaos";
import { cn } from "@/lib/cn";

/** Navbar cluster health: "degraded" (amber) while Chaos Monkey has nodes down, on the shared timeline. */
export function ClusterStatus() {
  const run = useChaosRun();
  const t = useChaosTime(run);
  const degraded = !!run && t >= 0 && nodesDown(run, t) > 0;

  return (
    // Not a live region: the Chaos Monkey log already announces the run.
    <p className="flex items-center gap-2 font-mono text-[0.7rem] text-muted">
      <StatusDot accent={degraded ? "warning" : "success"} className="transition-colors duration-300" />
      <span className="hidden sm:inline">cluster:</span>
      <span className={cn("transition-colors duration-300", degraded ? "text-warning" : "text-success")}>
        {degraded ? "degraded" : "healthy"}
      </span>
    </p>
  );
}
