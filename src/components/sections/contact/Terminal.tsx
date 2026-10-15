"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { site } from "@/content/site";
import { chaos } from "@/lib/chaos";
import { cn } from "@/lib/cn";
import { commonPrefix, complete, runCommand, type Line, type Tone } from "@/lib/terminal/engine";

const toneClass: Record<Tone, string> = {
  plain: "text-fg",
  muted: "text-muted",
  faint: "text-faint",
  accent: "text-cyan",
  ok: "text-success",
  warn: "text-warning",
  error: "text-danger",
  violet: "text-violet",
};

interface Entry {
  id: number;
  /** The command as typed (prompt line), or null for output */
  input: string | null;
  line: Line;
}

const SUGGESTIONS = ["help", "whoami", "ls projects", "kubectl get pods", "contact"];

/** Auto-typed command: pause with the blinking cursor first, ms per character, pause before Enter */
const AUTO_START_MS = 600;
const AUTO_CHAR_MS = 130;
const AUTO_ENTER_MS = 450;
/** The fixed navbar covers the top of the viewport */
const NAVBAR_PX = 64;

/**
 * Interactive terminal for the Contact section. Commands come from the pure engine in
 * lib/terminal (no eval, all output from site.ts). Output is a polite live region; clicking the
 * window focuses the input without scrolling the page.
 */
export function Terminal() {
  const prompt = `${site.profile.handle}@portfolio:~$`;
  const [entries, setEntries] = useState<Entry[]>(() => welcome());
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  /** Index into history while browsing with ↑/↓ (history.length = not browsing) */
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startRef = useRef(0);
  const idRef = useRef(1000);
  const rootRef = useRef<HTMLDivElement>(null);
  /** The visitor typed or ran something: the auto command must not run (or stops typing). */
  const userActed = useRef(false);
  const runRef = useRef<(raw: string) => void>(() => {});
  /** The auto command is being typed (shows a blinking cursor after the typed text) */
  const [autoTyping, setAutoTyping] = useState(false);

  useEffect(() => {
    startRef.current = performance.now();
  }, []);

  // Keep the newest output in view — scroll the terminal's own box, never the page.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  const nextId = () => ++idRef.current;

  const run = (raw: string) => {
    const input = raw.slice(0, 200);
    const newHistory = input.trim() ? [...history, input.trim()] : history;
    const result = runCommand(input, { history: newHistory, sessionMs: performance.now() - startRef.current });
    const echo: Entry = { id: nextId(), input, line: [] };
    const outLines =
      result.action === "chaos" && !chaos.trigger()
        ? [[{ text: "chaos-monkey: a run is already in progress — give the cluster a moment.", tone: "warn" as const }]]
        : result.lines;
    const out: Entry[] = outLines.map((line) => ({ id: nextId(), input: null, line }));
    setEntries((prev) => (result.clear ? [] : [...prev, echo, ...out]));
    setHistory(newHistory);
    setCursor(newHistory.length);
    setValue("");
  };

  useEffect(() => {
    runRef.current = run;
  });

  // Auto-type `site.terminal.autoCommand` once, the first time the whole terminal is on screen (or
  // as much of it as fits): the blinking cursor waits a moment, the command is typed at a
  // readable pace, then runs. Never focuses the input or scrolls; stops if the visitor types
  // first. Reduced motion: no typing, the command and its output appear at once.
  useEffect(() => {
    const cmd = site.terminal.autoCommand;
    const el = rootRef.current;
    if (!cmd || !el) return;
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(() => !userActed.current && fn(), ms));
    const io = new IntersectionObserver(
      ([e]) => {
        // Fully visible below the navbar, or (taller than that) filling the space; 4% slack for
        // short screens, where it only just fits
        const need = Math.min(e.boundingClientRect.height, window.innerHeight - NAVBAR_PX) * 0.96;
        if (!e.isIntersecting || e.intersectionRect.height < need) return;
        io.disconnect();
        if (userActed.current) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return runRef.current(cmd);
        setAutoTyping(true);
        for (let i = 1; i <= cmd.length; i++) later(AUTO_START_MS + i * AUTO_CHAR_MS, () => setValue(cmd.slice(0, i)));
        later(AUTO_START_MS + cmd.length * AUTO_CHAR_MS + AUTO_ENTER_MS, () => {
          setAutoTyping(false);
          runRef.current(cmd);
        });
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20), rootMargin: `-${NAVBAR_PX}px 0px 0px 0px` },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    userActed.current = true;
    setAutoTyping(false);
    if (e.key === "Enter") {
      e.preventDefault();
      run(value);
    } else if (e.key === "ArrowUp") {
      if (!history.length) return;
      e.preventDefault();
      const c = Math.max(0, cursor - 1);
      setCursor(c);
      setValue(history[c]);
    } else if (e.key === "ArrowDown") {
      if (!history.length) return;
      e.preventDefault();
      const c = Math.min(history.length, cursor + 1);
      setCursor(c);
      setValue(c === history.length ? "" : history[c]);
    } else if (e.key === "Tab" && !e.shiftKey) {
      // Only take over Tab when there's something to complete; otherwise it moves focus as usual.
      const matches = complete(value);
      if (!matches.length) return;
      e.preventDefault();
      if (matches.length === 1) setValue(matches[0]);
      else {
        const prefix = commonPrefix(matches);
        if (prefix.length > value.length) setValue(prefix);
        else
          setEntries((prev) => [
            ...prev,
            { id: nextId(), input: value, line: [] },
            { id: nextId(), input: null, line: [{ text: matches.join("   "), tone: "accent" }] },
          ]);
      }
    } else if (e.key === "Escape") {
      setValue("");
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setEntries([]);
    }
  };

  // Click anywhere in the window focuses the input — without scrolling, and not while the user is
  // selecting text or clicking a link.
  const onWindowClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    if (window.getSelection()?.toString()) return;
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <div
      ref={rootRef}
      onClick={onWindowClick}
      className="glass glow-edge overflow-hidden rounded-2xl bg-bg-raised/80 transition-shadow focus-within:ring-2 focus-within:ring-cyan/60"
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-danger/70" />
          <span className="size-2.5 rounded-full bg-warning/70" />
          <span className="size-2.5 rounded-full bg-success/70" />
        </span>
        <p className="flex-1 truncate text-center font-mono text-xs text-faint">{site.profile.handle}@portfolio — zsh</p>
        <span className="w-10" aria-hidden="true" />
      </div>

      <div className="p-5 font-mono text-[0.8rem] leading-relaxed sm:p-6">
        <div ref={scrollRef} tabIndex={0} aria-label="Terminal history" className="h-[11.5rem] overflow-y-auto overscroll-contain pr-1 sm:h-[17rem]">
          <div role="log" aria-live="polite" aria-label="Terminal output">
            {entries.map((entry) =>
              entry.input !== null ? (
                <p key={entry.id} className="mt-2 first:mt-0">
                  <span className="text-success">{prompt}</span> <span className="text-fg">{entry.input}</span>
                </p>
              ) : (
                <p
                  key={entry.id}
                  // Table rows (cells with `col`) stay on one line; plain output wraps.
                  className={entry.line.some((seg) => seg.col) ? "flex whitespace-pre" : "whitespace-pre-wrap"}
                >
                  {entry.line.map((seg, i) => {
                    const cell =
                      seg.col === "fill"
                        ? { className: "min-w-0 flex-1 truncate", title: seg.text }
                        : seg.col
                          ? { className: "shrink-0", style: { width: `${seg.col}ch` } }
                          : null;
                    return seg.href ? (
                      <a
                        key={i}
                        href={seg.href}
                        download={seg.download}
                        {...(seg.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                        className="text-cyan underline decoration-cyan/40 underline-offset-2 hover:decoration-cyan"
                      >
                        {seg.text}
                      </a>
                    ) : (
                      <span key={i} title={cell?.title} style={cell?.style} className={cn(toneClass[seg.tone ?? "plain"], cell?.className)}>
                        {seg.text}
                      </span>
                    );
                  })}
                </p>
              ),
            )}
          </div>
        </div>

        <form
          className="mt-2 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(value);
          }}
        >
          <label htmlFor="terminal-input" className="shrink-0 text-success">
            {/* Phones: the short prompt leaves room for the placeholder */}
            <span className="max-sm:hidden">{prompt.slice(0, -2)}</span>
            {prompt.slice(-2)}
          </label>
          <div className="relative min-w-0 flex-1">
            <input
              id="terminal-input"
              ref={inputRef}
              value={value}
              placeholder={site.terminal.placeholder}
              onChange={(e) => {
                userActed.current = true;
                setAutoTyping(false);
                setValue(e.target.value);
                setCursor(history.length);
              }}
              onKeyDown={onKeyDown}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              maxLength={200}
              aria-describedby="terminal-hint"
              // 16px on phones so iOS doesn't zoom into the field
              className={cn(
                "peer w-full bg-transparent pl-[1.3ch] text-base text-fg caret-cyan outline-none placeholder:text-[0.8rem] placeholder:text-faint sm:text-[0.8rem]",
                // While the command types itself: just the blinking cursor, no placeholder
                autoTyping && "placeholder:text-transparent",
              )}
            />
            {/* Auto-typed command: the cursor follows the typed text (same font size → ch matches) */}
            {autoTyping && value && (
              <span
                aria-hidden="true"
                style={{ left: `${1.3 + value.length}ch` }}
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 animate-blink text-base text-cyan peer-focus:hidden sm:text-[0.8rem]"
              >
                ▍
              </span>
            )}
            {/* Blinking block before the placeholder while the field is empty and not focused
                (focused: the real caret blinks instead) */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-0 hidden -translate-y-1/2 animate-blink text-[0.8rem] text-cyan peer-placeholder-shown:inline peer-focus:hidden"
            >
              ▍
            </span>
          </div>
        </form>
        <p id="terminal-hint" className="sr-only">
          Type a command and press Enter. Type help to list commands. Tab completes, up and down arrows browse history.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Suggested commands">
          <span className="text-[0.72rem] text-faint">{site.terminal.tryLabel}</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                userActed.current = true;
                setAutoTyping(false);
                run(s);
                inputRef.current?.focus({ preventScroll: true });
              }}
              className={cn(
                "rounded-md border border-line-strong px-2 py-1 text-[0.7rem] text-muted transition-[color,border-color,transform] active:scale-95",
                "hover:border-cyan/50 hover:text-cyan focus-visible:border-cyan focus-visible:text-cyan",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function welcome(): Entry[] {
  return [
    { id: 1, input: null, line: [{ text: `Welcome to ${site.profile.handle}@portfolio. Type `, tone: "muted" }, { text: "help", tone: "accent" }, { text: " to get started.", tone: "muted" }] },
  ];
}
