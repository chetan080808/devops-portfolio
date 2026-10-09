/**
 * Single source of truth for the Jenkins run shown in the Pipeline section.
 * `t` = how far the run has got, in stage slots (null = the real, final state). Every element that
 * shows a stage carries `data-slot` (its run slot), `data-final` (its real status) and, for main
 * stages, `data-main`; applyRun() derives ALL statuses and the header count from `t` in one pass, so
 * header, graph and table can never disagree — in either scroll direction, after any re-render.
 */
export type StageStatus = "queued" | "running" | "passed";

export const pipelineRun: { t: number | null } = { t: null };

export function statusAt(t: number | null, slot: number, final: StageStatus): StageStatus {
  if (t === null) return final;
  const s: StageStatus = t < slot ? "queued" : t < slot + 1 ? "running" : "passed";
  // The current stage never "passes" — it keeps running.
  return final === "running" && s === "passed" ? "running" : s;
}

export function applyRun(root: HTMLElement | null) {
  if (!root) return;
  const els = root.querySelectorAll<HTMLElement>("[data-stage-id][data-slot]");
  const passedMain = new Set<string>();
  const mainIds = new Set<string>();
  els.forEach((el) => {
    const status = statusAt(pipelineRun.t, Number(el.dataset.slot), el.dataset.final as StageStatus);
    if (el.dataset.status !== status) el.dataset.status = status;
    if (el.dataset.main !== undefined) {
      mainIds.add(el.dataset.stageId!);
      if (status === "passed") passedMain.add(el.dataset.stageId!);
    }
  });
  const counter = root.querySelector<HTMLElement>("[data-passed-count]");
  const text = `${passedMain.size}/${mainIds.size} stages passed`;
  if (!counter || counter.textContent === text) return;
  // Update React's own text node (replacing it would detach the node React keeps updating).
  const node = counter.firstChild;
  if (node instanceof Text && counter.childNodes.length === 1) node.nodeValue = text;
  else counter.textContent = text;
}
