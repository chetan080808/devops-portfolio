"use client";

import { useEffect, useRef, useState } from "react";

/** Pause before the first character, and ms per character */
const START_MS = 250;
const CHAR_MS = 38;

/**
 * A section's command line ("$ kubectl get deployments -n portfolio") that types itself once,
 * the first time it scrolls into view. Server HTML and hydration show the full text; only lines
 * still below the viewport at hydration are emptied (off screen, so nothing flashes) and typed when
 * they appear. Reduced motion, or already on screen: the full line, no typing.
 */
export function TypedCommand({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(text.length);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setShown(0);
    const timers: number[] = [];
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        setTyping(true);
        for (let i = 1; i <= text.length; i++) timers.push(window.setTimeout(() => setShown(i), START_MS + i * CHAR_MS));
        timers.push(window.setTimeout(() => setTyping(false), START_MS + text.length * CHAR_MS + 900));
      },
      // A little above the bottom edge, so the typing is seen from its first character
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [text]);

  return (
    <span ref={ref} className="min-w-0 truncate normal-case tracking-normal">
      <span className="sr-only">$ {text}</span>
      <span aria-hidden="true">
        $ {text.slice(0, shown)}
        {typing && <span className="animate-blink text-cyan">▍</span>}
      </span>
    </span>
  );
}
