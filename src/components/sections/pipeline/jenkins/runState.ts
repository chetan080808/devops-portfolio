/**
 * Single source of truth for the Jenkins run shown in the Pipeline section.
 * `t` = how far the run has got, in stage slots (null = the real, final state). Every element that
 * shows a stage carries `data-slot` (its run slot), `data-final` (its real status) and, for main
 * stages, `data-main`; applyRun() derives ALL statuses and the header count from `t` in one pass, so
 * header, graph and table can never disagree — in either scroll direction, after any re-render.
 */
export type StageStatus = "queued" | "running" | "passed";

/**
 * `manual`: a visitor started a build (Build Now). From then on the build owns `t`; the scroll
 * drivers (PipelineScroll) leave it alone for the rest of the visit.
 */
export const pipelineRun: { t: number | null; manual: boolean } = { t: null, manual: false };

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

/**
 * Phones: how far the green rail fill reaches (0–1) for run position `t`, from the node centres
 * `ys` (px, top to bottom; any common offset). The fill reaches node i exactly when t = i.
 */
export function railScale(ys: number[], t: number) {
  const last = ys.length - 1;
  const span = last > 0 ? ys[last] - ys[0] : 0;
  if (span <= 0 || t <= 0) return 0;
  if (t >= last) return 1;
  const i = Math.floor(t);
  return (ys[i] + (t - i) * (ys[i + 1] - ys[i]) - ys[0]) / span;
}
