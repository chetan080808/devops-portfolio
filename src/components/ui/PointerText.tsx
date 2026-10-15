import type { PointerText as Text } from "@/types/content";

/** "Click …" with a mouse, "Tap …" on touch screens. Chosen by CSS: right from the server HTML. */
export function PointerText({ text }: { text: Text }) {
  return (
    <>
      <span className="pointer-coarse:hidden">{text.mouse}</span>
      <span className="hidden pointer-coarse:inline">{text.touch}</span>
    </>
  );
}
