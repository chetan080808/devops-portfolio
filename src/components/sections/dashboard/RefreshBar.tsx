"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { StatusDot } from "@/components/ui/StatusDot";

const REFRESH_MS = 30_000;

/**
 * Grafana-style toolbar with a real "refresh 30s": while the dashboard is on screen (and the tab
 * visible) it re-checks the live server (/api/healthz) every 30 s; "updated Ns ago" ticks from the
 * last successful check. Nothing on the panels is invented or changed by it. Server HTML: the
 * static bar (no timestamp until the first check).
 */
export function RefreshBar() {
  const bar = site.dashboardBar;
  const ref = useRef<HTMLDivElement>(null);
  const [lastOk, setLastOk] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let inView = false;
    let poll = 0;
    let tick = 0;
    let last = 0;
    const check = async () => {
      try {
        const res = await fetch("/api/healthz", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        last = Date.now();
        setLastOk(last);
        setFailed(false);
      } catch {
        setFailed(true);
      }
      setNow(Date.now());
    };
    const stop = () => {
      clearInterval(poll);
      clearInterval(tick);
    };
    const start = () => {
      stop();
      if (!inView || document.hidden) return;
      // Coming back after more than a refresh interval: check right away.
      if (Date.now() - last >= REFRESH_MS) check();
      poll = window.setInterval(check, REFRESH_MS);
      tick = window.setInterval(() => setNow(Date.now()), 1000);
    };
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      start();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", start);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", start);
      stop();
    };
  }, []);

  const secs = lastOk === null ? null : Math.max(0, Math.floor((now - lastOk) / 1000));
  const status =
    failed ? bar.offline : secs === null ? null : secs < 2 ? bar.justNow : bar.updated.replace("{s}", String(secs));

  return (
    <div
      ref={ref}
      className="glass mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl px-3 py-2 font-mono text-xs sm:mb-4 sm:px-4 sm:py-2.5"
    >
      <p className="flex items-center gap-2 text-fg">
        {/* Live dot: green while the server answers, amber when a check failed */}
        <StatusDot accent={failed ? "warning" : "success"} />
        {bar.title}
      </p>
      <p className="flex gap-4 text-faint">
        <span className="hidden sm:inline">{bar.range}</span>
        {status && (
          <span
            className={failed ? "text-warning" : undefined}
            title={lastOk ? `Last check: ${new Date(lastOk).toLocaleTimeString()}` : undefined}
          >
            {status}
          </span>
        )}
        <span className="hidden sm:inline">{bar.refresh}</span>
      </p>
    </div>
  );
}
