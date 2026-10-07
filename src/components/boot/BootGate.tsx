/** sessionStorage key: set once the intro has been skipped or watched this session. */
export const BOOT_SEEN_KEY = "pf-boot-seen";

/**
 * Runs synchronously before first paint and sets <html data-boot="run|skip">.
 * CSS shows the boot overlay only for "run", so there is no flash and no hydration
 * mismatch. No JS → no attribute → no overlay. `?boot` in the URL forces a replay.
 */
const script = `(function(){var d=document.documentElement;try{
var force=/[?&]boot(=|&|$)/.test(location.search);
var calm=matchMedia("(prefers-reduced-motion: reduce)").matches;
var seen=sessionStorage.getItem("${BOOT_SEEN_KEY}");
d.dataset.boot=force||(!calm&&!seen)?"run":"skip";
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
