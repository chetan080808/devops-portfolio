import { EXIT_MS, FALLBACK_EXIT_MS, FALLBACK_HOLD_MS } from "./constants";

declare global {
  interface Window {
    /** performance.now() when the gate ran (≈ first paint); the boot timeline is measured from it. */
    __pfBootT0?: number;
    /** Set by the React boot timeline once it runs; the gate's safety net then stands down. */
    __pfBootLive?: boolean;
  }
}

/** sessionStorage key: set once the intro has been skipped or watched this session. */
export const BOOT_SEEN_KEY = "pf-boot-seen";

/**
 * Runs synchronously before first paint and sets <html data-boot="run|skip"> plus
 * data-boot-transition (exit: crt, or fade with reduced motion). CSS shows the boot overlay only for "run" / "leaving", so there is no flash and no
 * hydration mismatch. No JS → no attribute → no overlay. `?boot` in the URL forces a replay.
 * Safety net: if the React timeline hasn't started FALLBACK_EXIT_MS after first paint (slow
 * hydration on a throttled phone), the script prints the closing line (site.boot.fallbackLine),
 * holds it FALLBACK_HOLD_MS, then plays the exit itself.
 */
const script = `(function(){var d=document.documentElement;try{
var q=location.search;
var force=/[?&]boot(=|&|$)/.test(q);
var calm=matchMedia("(prefers-reduced-motion: reduce)").matches;
var seen=sessionStorage.getItem("${BOOT_SEEN_KEY}");
var run=force||(!calm&&!seen);
d.dataset.boot=run?"run":"skip";
d.dataset.bootTransition=calm?"fade":"crt";
window.__pfBootT0=performance.now();
if(run)setTimeout(function(){
if(d.dataset.boot!=="run"||window.__pfBootLive)return;
d.dataset.bootFallback="";
setTimeout(function(){
if(d.dataset.boot!=="run"||window.__pfBootLive)return;
d.dataset.boot="leaving";
setTimeout(function(){if(d.dataset.boot==="leaving")d.dataset.boot="done";try{sessionStorage.setItem("${BOOT_SEEN_KEY}","1")}catch(e){}},${JSON.stringify(EXIT_MS)}[d.dataset.bootTransition]||650);
},${FALLBACK_HOLD_MS});
},${FALLBACK_EXIT_MS});
}catch(e){d.dataset.boot="skip"}})()`;

export function BootGate() {
  return (
    <script
      // Plain text on the client so React doesn't warn about rendering a <script>
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
