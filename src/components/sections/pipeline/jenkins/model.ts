import { site } from "@/content/site";
import type { Milestone } from "@/types/content";

import type { StageStatus } from "./runState";
export type { StageStatus };

export interface PipelineStage {
  id: string;
  /** "Build", "Test", … (Jenkins stage name) */
  label: string;
  milestone: Milestone | null;
  /** Parallel branch: sits under its `alongside` stage */
  parallelTo?: string;
  /** Final status (server HTML / reduced motion / mobile) */
  final: StageStatus;
  /** Run slot: the parallel branch shares its stage's slot */
  slot: number;
}

const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Stages in run order, with the parallel side-projects branch placed after the stage it runs alongside. */
export function buildStages(): PipelineStage[] {
  const out: PipelineStage[] = [];
  const { parallel } = site.pipeline;
  site.experience.forEach((m, slot) => {
    const final = m.current ? "running" : "passed";
    out.push({ id: m.id, label: title(m.stage), milestone: m, final, slot });
    if (m.id === parallel.alongside && site.projects.length > 0) {
      out.push({ id: `parallel-${parallel.label}`, label: parallel.label, milestone: null, parallelTo: m.id, final, slot });
    }
  });
  return out;
}

/** Overall job status: running if any stage is current. */
export const jobRunning = () => site.experience.some((m) => m.current);

/** Console output lines for a stage — only real content from site.ts. */
export function consoleLines(stage: PipelineStage): string[] {
  const { profile, projects, pipeline } = site;
  const lines = [`Started by user ${profile.handle}`, `[Pipeline] Start of Pipeline (${pipeline.job} » ${pipeline.branch})`];
  if (stage.milestone) {
    const m = stage.milestone;
    lines.push(`[Pipeline] stage`, `[Pipeline] { (${stage.label})`, `[Pipeline] echo`, `${m.title} @ ${m.org} (${m.period})`, m.summary);
    for (const h of m.highlights) lines.push(`[Pipeline] sh`, `+ ${h}`);
    lines.push(`[Pipeline] }`);
  } else {
    lines.push(`[Pipeline] parallel`, `[Pipeline] { (Branch: ${stage.label})`);
    for (const p of projects) lines.push(`[${stage.label}] + deploy ${p.id}`, `[${stage.label}] ${p.name}: ${p.status}`);
    lines.push(`[Pipeline] }`);
  }
  return lines;
}
