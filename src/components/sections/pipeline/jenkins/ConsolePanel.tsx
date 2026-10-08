"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { site } from "@/content/site";
import { consoleLines, type PipelineStage } from "./model";

const noopSubscribe = () => () => {};

/** Jenkins "Console Output" for one stage, as a modal. */
export function ConsolePanel({ stage, onClose }: { stage: PipelineStage | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!stage) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [stage, onClose]);

  const running = stage?.final === "running";
  // Portal to <body>: the pinned job keeps a CSS transform, which would trap a `fixed` modal.
  // (false during SSR + hydration, true after: no portal mismatch)
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {stage && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
        >
          <button type="button" aria-label="Close console output" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-bg/80 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="console-title"
            className="glass glow-edge relative flex max-h-[80dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-bg-raised/95 sm:rounded-2xl"
            initial={reduce ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 16, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <p id="console-title" className="truncate font-mono text-xs text-muted">
                {site.pipeline.job} » {site.pipeline.branch} » <span className="text-fg">{stage.label}</span> » Console Output
              </p>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="rounded-md border border-line-strong px-2 py-1 font-mono text-[0.7rem] text-muted transition-colors hover:border-cyan/50 hover:text-cyan"
              >
                close <span aria-hidden="true">esc</span>
              </button>
            </div>
            <pre className="overflow-auto px-4 py-4 font-mono text-[0.78rem] leading-6 whitespace-pre-wrap text-muted">
              {consoleLines(stage).map((line, i) => (
                <span key={i} className={line.startsWith("[Pipeline]") ? "block text-faint" : line.startsWith("+") ? "block text-fg" : "block"}>
                  {line}
                </span>
              ))}
              {running ? (
                <span className="block text-warning">
                  Running…<span className="ml-1 inline-block animate-blink">▍</span>
                </span>
              ) : (
                <span className="block text-success">Finished: SUCCESS</span>
              )}
            </pre>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
