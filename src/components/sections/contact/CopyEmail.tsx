"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

/** How long the toast stays up (ms). */
const TOAST_MS = 1800;

type Result = "copied" | "failed";

/** Copies the email address; a small toast above the button confirms it. */
export function CopyEmail({ email, className }: { email: string; className?: string }) {
  const [result, setResult] = useState<{ kind: Result; n: number } | null>(null);
  const timer = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    let kind: Result = "copied";
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      kind = "failed";
    }
    setResult((r) => ({ kind, n: (r?.n ?? 0) + 1 }));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setResult(null), TOAST_MS);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy email address ${email}`}
        className={cn(
          "inline-flex h-full items-center justify-center gap-2 rounded-lg border border-line-strong px-4 py-2.5 font-mono text-sm text-fg",
          "transition-all duration-300 ease-premium hover:-translate-y-px hover:border-cyan/50 hover:bg-cyan/5 hover:text-cyan",
          "active:translate-y-0 active:scale-[0.96] active:duration-75 motion-reduce:transform-none",
        )}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5">
          <rect x="5" y="5" width="8.5" height="8.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3 10.5V3.8C3 3.36 3.36 3 3.8 3h6.7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        copy
      </button>

      {/* Polite status for screen readers; the visual toast is decorative. */}
      <span role="status" className="sr-only">
        {result ? (result.kind === "copied" ? `Copied ${email}` : "Could not copy. The address is on the Email button.") : ""}
      </span>
      <AnimatePresence>
        {result && (
          <motion.p
            key={result.n}
            aria-hidden="true"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute right-0 bottom-full mb-2 flex items-center gap-1.5 rounded-md border border-line-strong bg-bg-raised/95 px-2.5 py-1 font-mono text-[0.7rem] whitespace-nowrap shadow-xl backdrop-blur-md"
          >
            {result.kind === "copied" ? (
              <>
                <span className="text-success">[ OK ]</span>
                <span className="text-muted">copied to clipboard</span>
              </>
            ) : (
              <>
                <span className="text-warning">[ WARN ]</span>
                <span className="text-muted">couldn&apos;t copy · {email}</span>
              </>
            )}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
