"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { site } from "@/content/site";
import { consoleLines, type PipelineStage } from "./model";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useModalLock } from "@/hooks/useModalLock";

const noopSubscribe = () => () => {};

/** One console log line, Jenkins-style: pipeline steps dim, shell commands bright. */
export function ConsoleLine({ line }: { line: string }) {
  return <span className={line.startsWith("[Pipeline]") ? "block text-faint" : line.startsWith("+") ? "block text-fg" : "block"}>{line}</span>;
}

/** Last console line: still running (blinking cursor) or finished. */
export function ConsoleEnd({ running }: { running: boolean }) {
  return running ? (
    <span className="block text-warning">
      Running…<span className="ml-1 inline-block animate-blink">▍</span>
    </span>
  ) : (
    <span className="block text-success">Finished: SUCCESS</span>
  );
}

/** Jenkins "Console Output" for one stage, as a modal. */
export function ConsolePanel({ stage, onClose }: { stage: PipelineStage | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  // Before the focus effect below: it records the opener before focus moves into the panel.
  useModalLock(!!stage);
  useFocusTrap(dialogRef, !!stage);

  useEffect(() => {
    if (!stage) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
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
            ref={dialogRef}
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
                className="shrink-0 rounded-md border border-line-strong px-2 py-1 font-mono text-[0.7rem] whitespace-nowrap text-muted transition-[color,border-color,transform] hover:border-cyan/50 hover:text-cyan active:scale-95"
              >
                close <span aria-hidden="true">esc</span>
              </button>
            </div>
            <pre tabIndex={0} aria-label="Console log" className="overflow-auto overscroll-contain px-4 py-4 font-mono text-[0.78rem] leading-6 whitespace-pre-wrap text-muted">
              {consoleLines(stage).map((line, i) => (
                <ConsoleLine key={i} line={line} />
              ))}
              <ConsoleEnd running={running} />

            </pre>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
