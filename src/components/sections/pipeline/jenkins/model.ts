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
    if (m.id === parallel.alongside && parallel.jobs.length > 0) {
      out.push({ id: `parallel-${parallel.label}`, label: parallel.label, milestone: null, parallelTo: m.id, final, slot });
    }
  });
  return out;
}

/** Overall job status: running if any stage is current. */
export const jobRunning = () => site.experience.some((m) => m.current);

/** Console output lines for a stage — only real content from site.ts. */
export function consoleLines(stage: PipelineStage): string[] {
  const { profile, pipeline } = site;
  return [`Started by user ${profile.handle}`, `[Pipeline] Start of Pipeline (${pipeline.job} » ${pipeline.branch})`, ...stageBlock(stage)];
}

/** One stage's block of the log. `open`: the stage is still running, so its block isn't closed. */
function stageBlock(stage: PipelineStage, open = false): string[] {
  const lines: string[] = [];
  if (stage.milestone) {
    const m = stage.milestone;
    lines.push(`[Pipeline] stage`, `[Pipeline] { (${stage.label})`, `[Pipeline] echo`, `${m.title} @ ${m.org} (${m.period})`, m.summary);
    for (const h of m.highlights) lines.push(`[Pipeline] sh`, `+ ${h}`);
  } else {
    lines.push(`[Pipeline] parallel`, `[Pipeline] { (Branch: ${stage.label})`);
    for (const job of site.pipeline.parallel.jobs) lines.push(`[${stage.label}] + build "${job}"`);
  }
  if (!open) lines.push(`[Pipeline] }`);
  return lines;
}

/** Build Now: one log line and when it appears (ms from the start). */
export interface ScriptLine {
  line: string;
  at: number;
}

export interface BuildScript {
  lines: ScriptLine[];
  /** When each run slot starts (its first line appears), ms */
  slotStarts: number[];
  /** End of the run, ms */
  end: number;
  /** A stage is still running at the end (no "Finished: SUCCESS") */
  running: boolean;
}

/** Pacing: Jenkins step lines are quick, content lines readable, a short pause before each stage. */
const STEP_MS = 70;
const TEXT_MS = 210;
const STAGE_PAUSE_MS = 380;

/**
 * The whole run as a timed log for Build Now: every stage in run order (a parallel branch right
 * after its stage, in the same slot). Started "by user anonymous": the visitor pressed the button.
 * Same real content as the per-stage consoles; nothing is invented.
 */
export function buildScript(stages: PipelineStage[]): BuildScript {
  const { pipeline } = site;
  const lines: ScriptLine[] = [];
  const slotStarts: number[] = [];
  let at = 0;
  const push = (line: string) => {
    at += line.startsWith("[Pipeline]") ? STEP_MS : TEXT_MS;
    lines.push({ line, at });
  };
  push("Started by user anonymous");
  push(`[Pipeline] Start of Pipeline (${pipeline.job} » ${pipeline.branch})`);
  for (const stage of stages) {
    if (!stage.parallelTo) {
      at += STAGE_PAUSE_MS;
      slotStarts[stage.slot] = at + STEP_MS;
    }
    stageBlock(stage, stage.final === "running").forEach(push);
  }
  const running = stages.some((s) => s.final === "running");
  if (!running) push("[Pipeline] End of Pipeline");
  return { lines, slotStarts, end: at + STAGE_PAUSE_MS, running };
}

/**
 * Run position `ms` into the build: −1 → 0 before the first stage (all queued), then i → i + 1
 * across slot i (from its first line to the next slot's first line, the last slot until the end).
 */
export function scriptT({ slotStarts: s, end }: BuildScript, ms: number) {
  if (ms < s[0]) return -1 + ms / s[0];
  for (let i = 0; i < s.length; i++) {
    const next = i + 1 < s.length ? s[i + 1] : end;
    if (ms < next) return i + (ms - s[i]) / (next - s[i]);
  }
  return s.length;
}
