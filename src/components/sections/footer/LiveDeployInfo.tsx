"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { RuntimeInfo } from "@/lib/buildInfo";

type State = { status: "idle" | "loading" } | { status: "ready"; info: RuntimeInfo } | { status: "error" };

/**
 * The running pod's details (image, deploy time, which pod answered), fetched from
 * /api/build-info once the footer scrolls into view. Never cached: every load can be served by a
 * different pod.
 */
export function LiveDeployInfo() {
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    let cancelled = false;
    const load = () => {
      setState({ status: "loading" });
      fetch("/api/build-info", { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<RuntimeInfo>) : Promise.reject(new Error(String(r.status)))))
        .then((info) => !cancelled && setState({ status: "ready", info }))
        .catch(() => !cancelled && setState({ status: "error" }));
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        load();
      },
      { rootMargin: "200px" },
    );
    io.observe(footer);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, []);

  const info = state.status === "ready" ? state.info : null;
  const pending = state.status === "idle" || state.status === "loading";
  const missing = state.status === "error" ? "unavailable" : pending ? "…" : "—";
  const tag = info?.image?.split(":").pop();

  return (
    <>
      <LiveCell label="image" busy={pending}>
        {tag ? (
          <span className="truncate text-fg" title={info?.image ?? undefined}>
            {/* The tag is the informative part (the label already says "image"); full ref on hover. */}
            {`:${tag.slice(0, 7)}`}
          </span>
        ) : (
          <span className="text-faint">{missing}</span>
        )}
      </LiveCell>
      <LiveCell label="deployed" busy={pending}>
        {info?.deployedAt ? (
          <time dateTime={info.deployedAt} title={info.deployedAt} className="text-fg">
            {timeAgo(info.deployedAt)}
          </time>
        ) : (
          <span className="text-faint">{missing}</span>
        )}
      </LiveCell>
      {/* Full row on phones: 5 cells in 2 columns would leave the long pod name a half cell. */}
      <LiveCell label="served by" busy={pending} className="col-span-2 md:col-span-1">
        {info?.pod ? (
          <span className="truncate text-fg" title={`pod/${info.pod}`}>{`pod/${info.pod}`}</span>
        ) : (
          <span className="text-faint">{missing}</span>
        )}
      </LiveCell>
    </>
  );
}

function LiveCell({ label, busy, className, children }: { label: string; busy: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 bg-bg px-4 py-4 ${className ?? ""}`} aria-busy={busy}>
      <dt className="font-mono text-[0.68rem] text-faint">{label}</dt>
      <dd className="mt-1 flex min-w-0 items-center gap-2 font-mono text-sm whitespace-nowrap">{children}</dd>
    </div>
  );
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (!Number.isFinite(seconds)) return iso;
  if (seconds < 90) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}
