/**
 * Page geometry the 3D scene needs, in px relative to the canvas, measured by HeroStage on
 * resize (DOM side) at scroll 0, so it's scroll-invariant. Plain module: no three import.
 */
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const heroLayout = {
  /** Desktop: the canvas spans the whole hero section (behind the text, masked there). */
  fullBleed: false,
  canvasW: 0,
  canvasH: 0,
  /** Canvas top-left in document px (page coords) */
  canvasDocX: 0,
  canvasDocY: 0,
  /** The right-column stage: the scene is framed as if rendered into this rect */
  stage: { x0: 0, y0: 0, x1: 0, y1: 0 } as Rect,
  /** Union of the hero text column's content (name, pitch, buttons, stats) */
  text: { x0: 0, y0: 0, x1: 0, y1: 0 } as Rect,
  /** Bottom of the fixed navbar, and of the first screen, in canvas px (at scroll 0) */
  navBottom: 0,
  foldBottom: 0,
  viewportW: 0,
};

const pageRect = (r: DOMRect, ox: number, oy: number): Rect => ({
  x0: r.left + window.scrollX - ox,
  y0: r.top + window.scrollY - oy,
  x1: r.right + window.scrollX - ox,
  y1: r.bottom + window.scrollY - oy,
});

/** Re-measure everything; call on resize. */
export function measureHeroLayout(canvasBox: HTMLElement, stage: HTMLElement, text: HTMLElement | null, fullBleed: boolean) {
  const c = canvasBox.getBoundingClientRect();
  const ox = c.left + window.scrollX;
  const oy = c.top + window.scrollY;
  heroLayout.fullBleed = fullBleed;
  heroLayout.canvasW = c.width;
  heroLayout.canvasH = c.height;
  heroLayout.canvasDocX = ox;
  heroLayout.canvasDocY = oy;
  heroLayout.viewportW = window.innerWidth;
  heroLayout.stage = pageRect(stage.getBoundingClientRect(), ox, oy);

  const t = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const el of Array.from(text?.children ?? [])) {
    // Inline content can be narrower than its block; measure the actual text with a range.
    const range = document.createRange();
    range.selectNodeContents(el);
    for (const r of [el.getBoundingClientRect(), range.getBoundingClientRect()]) {
      if (r.width === 0) continue;
      const p = pageRect(r, ox, oy);
      t.x0 = Math.min(t.x0, p.x0);
      t.y0 = Math.min(t.y0, p.y0);
      t.y1 = Math.max(t.y1, p.y1);
    }
    const p = pageRect(range.getBoundingClientRect(), ox, oy);
    t.x1 = Math.max(t.x1, p.x1);
  }
  heroLayout.text = Number.isFinite(t.x1) ? t : { x0: 0, y0: 0, x1: 0, y1: 0 };

  const nav = document.querySelector("header nav")?.getBoundingClientRect();
  // nav is fixed: its viewport bottom at scroll 0, in canvas px = navBottom − canvas page top.
  heroLayout.navBottom = (nav ? nav.bottom : 0) - oy;
  heroLayout.foldBottom = window.innerHeight - oy;
}
