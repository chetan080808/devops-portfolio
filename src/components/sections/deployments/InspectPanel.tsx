"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Project } from "@/types/content";
import { Badge } from "@/components/ui/Badge";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useModalLock } from "@/hooks/useModalLock";
import { statusAccent } from "@/lib/accent";

const INDENT = "    ";
const INDENT2 = "      ";

function Key({ children }: { children: string }) {
  return <span className="text-violet">&quot;{children}&quot;</span>;
}

function StringList({ items, className }: { items: string[]; className: string }) {
  return (
    <>
      {items.map((line) => (
        <span key={line}>
          {INDENT2}
          <span className={className}>&quot;{line}&quot;</span>,{"\n"}
        </span>
      ))}
    </>
  );
}

/** Modal detail view styled like `docker inspect` JSON output. */
export function InspectPanel({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  // Before the focus effect below: it records the opener before focus moves into the panel.
  useModalLock(!!project);
  useFocusTrap(dialogRef, !!project);

  useEffect(() => {
    if (!project) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [project, onClose]);

  // Empty fields (TODO placeholders stripped in production, see lib/todo) are left out.
  const architecture = project?.inspect.architecture ?? [];
  const results = project?.inspect.results ?? [];
  const links = project?.links ?? [];

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.25 }}
        >
          <button
            type="button"
            aria-label="Close panel"
            tabIndex={-1}
            onClick={onClose}
            className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="inspect-title"
            className="glass glow-edge relative flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-bg-raised/90 sm:rounded-2xl"
            initial={reduce ? false : { y: 32, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* terminal title bar */}
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="size-2.5 rounded-full bg-danger/70" />
                <span className="size-2.5 rounded-full bg-warning/70" />
                <span className="size-2.5 rounded-full bg-success/70" />
              </span>
              <p className="flex-1 truncate font-mono text-xs text-muted">
                $ docker inspect <span className="text-fg">{project.id}</span>
              </p>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="rounded px-2 py-0.5 font-mono text-xs text-muted transition-[color,background-color,transform] hover:bg-white/5 hover:text-fg active:scale-95"
              >
                <span className="sr-only">Close</span>
                <span aria-hidden="true">esc ✕</span>
              </button>
            </div>

            <div tabIndex={0} aria-label="Inspect output" className="overflow-y-auto overscroll-contain p-5 font-mono text-[0.8rem] leading-relaxed sm:p-6">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <h3 id="inspect-title" className="font-sans text-xl font-semibold text-fg">
                  {project.name}
                </h3>
                <Badge accent={statusAccent[project.status]}>{project.status}</Badge>
              </div>

              <pre className="font-mono break-words whitespace-pre-wrap text-muted">
                <span className="text-faint">{"[\n  {\n"}</span>
                {project.inspect.problem && (
                  <>
                    {INDENT}<Key>Problem</Key>: <span className="text-fg">&quot;{project.inspect.problem}&quot;</span>,{"\n"}
                  </>
                )}
                {architecture.length > 0 && (
                  <>
                    {INDENT}<Key>Architecture</Key>: [{"\n"}
                    <StringList items={architecture} className="text-cyan" />
                    {INDENT}],{"\n"}
                  </>
                )}
                {project.inspect.role && (
                  <>
                    {INDENT}<Key>Role</Key>: <span className="text-fg">&quot;{project.inspect.role}&quot;</span>,{"\n"}
                  </>
                )}
                {results.length > 0 && (
                  <>
                    {INDENT}<Key>Results</Key>: [{"\n"}
                    <StringList items={results} className="text-success" />
                    {INDENT}],{"\n"}
                  </>
                )}
                {INDENT}<Key>Config.Stack</Key>: [
                <span className="text-warning">{project.stack.map((s) => `"${s}"`).join(", ")}</span>]{"\n"}
                <span className="text-faint">{"  }\n]"}</span>
              </pre>

              {links.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
                  {links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-line-strong px-3 py-1.5 text-xs text-fg transition-[color,border-color,background-color,transform] hover:border-cyan/50 hover:bg-cyan/5 hover:text-cyan active:scale-95"
                    >
                      {link.label}
                      <span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
