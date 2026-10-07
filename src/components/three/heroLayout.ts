/**
 * Page geometry the 3D scene needs, measured by HeroStage on resize (DOM side). Rects are in
 * PAGE coordinates (scroll-invariant); convert to canvas px with `canvasOrigin()`, which follows
 * the scroll for the fixed desktop canvas. Plain module: no three import.
 */
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const empty = (): Rect => ({ x0: 0, y0: 0, x1: 0, y1: 0 });

export const heroLayout = {
  /** Desktop: the canvas is fixed to the viewport and the hero scene scrolls with the page. */
  fullBleed: false,
  canvasW: 0,
  canvasH: 0,
  /** Mobile: page position of the canvas (it lives inside the hero stage) */
  canvasDocX: 0,
  canvasDocY: 0,
  /** The right-column stage: the hero scene is framed as if rendered into this rect */
  stage: empty(),
  /** Union of the hero text column's content (name, pitch, buttons, stats) */
  text: empty(),
  /** The hero section */
  hero: empty(),
  /** Navbar bottom and first-screen bottom, as page y at scroll 0 */
  navBottom: 0,
  foldBottom: 0,
  viewportW: 0,
};

const origin = { x: 0, y: 0 };

/** Page position of the canvas' top-left corner right now. */
export function canvasOrigin() {
  if (heroLayout.fullBleed) {
    origin.x = window.scrollX;
    origin.y = window.scrollY;
  } else {
    origin.x = heroLayout.canvasDocX;
    origin.y = heroLayout.canvasDocY;
  }
  return origin;
}

const pageRect = (r: DOMRect): Rect => ({
  x0: r.left + window.scrollX,
  y0: r.top + window.scrollY,
  x1: r.right + window.scrollX,
  y1: r.bottom + window.scrollY,
});

/** Re-measure everything; call on resize. */
export function measureHeroLayout(canvasBox: HTMLElement, stage: HTMLElement, text: HTMLElement | null, fullBleed: boolean) {
  const c = canvasBox.getBoundingClientRect();
  heroLayout.fullBleed = fullBleed;
  heroLayout.canvasW = c.width;
  heroLayout.canvasH = c.height;
  heroLayout.canvasDocX = c.left + window.scrollX;
  heroLayout.canvasDocY = c.top + window.scrollY;
  heroLayout.viewportW = window.innerWidth;
  heroLayout.stage = pageRect(stage.getBoundingClientRect());
  const section = stage.closest("section");
  heroLayout.hero = section ? pageRect(section.getBoundingClientRect()) : empty();

  const t = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const el of Array.from(text?.children ?? [])) {
    // Inline content can be narrower than its block; measure the actual text with a range.
    const range = document.createRange();
    range.selectNodeContents(el);
    for (const r of [el.getBoundingClientRect(), range.getBoundingClientRect()]) {
      if (r.width === 0) continue;
      const p = pageRect(r);
      t.x0 = Math.min(t.x0, p.x0);
      t.y0 = Math.min(t.y0, p.y0);
      t.y1 = Math.max(t.y1, p.y1);
    }
    t.x1 = Math.max(t.x1, pageRect(range.getBoundingClientRect()).x1);
  }
  heroLayout.text = Number.isFinite(t.x1) ? t : empty();

  // The navbar is fixed: its bottom at scroll 0, as a page y.
  const nav = document.querySelector("header nav")?.getBoundingClientRect();
  heroLayout.navBottom = nav ? nav.bottom : 0;
  heroLayout.foldBottom = window.innerHeight;
}
