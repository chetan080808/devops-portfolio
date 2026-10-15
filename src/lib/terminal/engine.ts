import { site } from "@/content/site";
import type { Project } from "@/types/content";

/**
 * Terminal command engine (pure). Input is only ever matched against the fixed command table below:
 * nothing typed is evaluated or executed. Every line of output is built from site.ts.
 */

export type Tone = "plain" | "muted" | "faint" | "accent" | "ok" | "warn" | "error" | "violet";
export interface Segment {
  text: string;
  tone?: Tone;
  /** Renders as a link (mailto:, https:, or a site path) */
  href?: string;
  /** Link downloads the file under this name */
  download?: string;
  /**
   * Table cell: a fixed width in characters, or "fill" (takes the rest of the line, truncated
   * with an ellipsis). A line with any cell renders on one line and never wraps.
   */
  col?: number | "fill";
}
export type Line = Segment[];

export interface RunContext {
  /** Commands entered so far, oldest first (for `history`) */
  history: string[];
  /** ms since the terminal session started (for `uptime`) */
  sessionMs: number;
}

export interface RunResult {
  lines: Line[];
  /** Clear the screen before printing (`clear`) */
  clear?: boolean;
  /** Side effect for the UI to perform (the engine itself stays pure) */
  action?: "chaos" | "whale";
}

interface Command {
  name: string;
  summary: string;
  run: (args: string[], ctx: RunContext) => RunResult;
}

const t = (text: string, tone?: Tone): Segment => ({ text, tone });
const link = (text: string, href: string): Segment => ({ text, href, tone: "accent" });
const lines = (...l: Line[]): RunResult => ({ lines: l });
const pad = (s: string, n: number) => (s.length >= n ? `${s} ` : s + " ".repeat(n - s.length));

/** Deterministic short "container id" from a project id (display only). */
function shortId(id: string) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0") + id.length.toString(16).padStart(4, "0");
}

/** `docker ps -a` wording: a completed project exited cleanly. */
const DOCKER_STATUS: Record<Project["status"], string> = { Running: "Up", Completed: "Exited (0)", Pending: "Created" };

const projectStatus = (s: string): Tone => (s === "Running" ? "ok" : s === "Pending" ? "warn" : "muted");

const COMMANDS: Command[] = [
  {
    name: "help",
    summary: "list available commands",
    run: () =>
      lines(
        [t("Available commands:", "muted")],
        ...COMMANDS.map((c) => [t(pad(c.name, 20), "accent"), t(c.summary, "faint")]),
        [t("Tip: Tab completes, ↑/↓ browse history.", "faint")],
      ),
  },
  {
    name: "whoami",
    summary: "who runs this cluster",
    run: () => {
      const p = site.profile;
      return lines(
        [t(p.name, "plain"), t(` — ${p.title}`, "accent")],
        [t(p.location, "muted")],
        ...p.bio.map((b) => [t(b, "muted")]),
      );
    },
  },
  {
    name: "ls projects",
    summary: "list deployments",
    run: () =>
      lines(
        [{ text: "STATUS", tone: "faint", col: 12 }, { text: "PROJECT", tone: "faint", col: "fill" }],
        ...site.projects.map((p): Line => [
          { text: p.status, tone: projectStatus(p.status), col: 12 },
          { text: p.name, tone: "plain", col: "fill" },
        ]),
      ),
  },
  {
    name: "kubectl get pods",
    summary: "projects as pods",
    run: () =>
      lines(
        [{ text: "NAME", tone: "faint", col: "fill" }, { text: "READY", tone: "faint", col: 7 }, { text: "STATUS", tone: "faint", col: 10 }],
        ...site.projects.map((p): Line => [
          { text: p.id, tone: "plain", col: "fill" },
          { text: p.status === "Running" ? "1/1" : "0/1", tone: "muted", col: 7 },
          { text: p.status, tone: projectStatus(p.status), col: 10 },
        ]),
      ),
  },
  {
    name: "docker ps",
    summary: "projects as containers",
    run: () =>
      lines(
        [{ text: "CONTAINER ID", tone: "faint", col: 14 }, { text: "IMAGE", tone: "faint", col: "fill" }, { text: "STATUS", tone: "faint", col: 11 }],
        ...site.projects.map((p): Line => [
          { text: shortId(p.id).slice(0, 12), tone: "muted", col: 14 },
          { text: `${p.id}:latest`, tone: "plain", col: "fill" },
          { text: DOCKER_STATUS[p.status], tone: projectStatus(p.status), col: 11 },
        ]),
      ),
  },
  {
    name: "cat resume",
    summary: "print the resume",
    run: () =>
      lines(
        [t(`${site.profile.name} — ${site.profile.title}`, "plain")],
        ...site.experience.map((m) => [t(pad(m.period, 18), "faint"), t(`${m.title} @ ${m.org}`, "muted")]),
        [t("Full PDF: ", "muted"), { ...link(site.profile.resumeFileName, site.profile.resumeUrl), download: site.profile.resumeFileName }],
      ),
  },
  {
    name: "contact",
    summary: "how to reach me",
    run: () =>
      lines(
        [t("email  ", "faint"), link(site.profile.email, `mailto:${site.profile.email}`)],
        ...(site.profile.status ? [[t(site.profile.status, "ok")]] : []),
      ),
  },
  {
    name: "social",
    summary: "links elsewhere",
    run: () => lines(...site.socials.map((s) => [t(pad(s.label.toLowerCase(), 10), "faint"), link(s.handle, s.href)])),
  },
  {
    name: "uptime",
    summary: "how long you've been here",
    run: (_a, ctx) => {
      const s = Math.floor(ctx.sessionMs / 1000);
      const up = s < 60 ? `${s}s` : `${Math.floor(s / 60)} min ${s % 60}s`;
      return lines([t(`up ${up}, 1 user (you) — thanks for sticking around`, "muted")]);
    },
  },
  {
    name: "history",
    summary: "commands you've run",
    run: (_a, ctx) =>
      ctx.history.length === 0
        ? lines([t("(no history yet)", "faint")])
        : lines(...ctx.history.map((h, i) => [t(String(i + 1).padStart(4, " ") + "  ", "faint"), t(h, "plain")])),
  },
  {
    name: "sudo hire-me",
    summary: "¯\\_(ツ)_/¯",
    run: () => ({
      ...lines(
        [t(`[sudo] password for ${site.profile.handle}: ********`, "muted")],
        [t("Permission granted. Escalating to recruiter…", "ok")],
        [t("→ ", "faint"), link(`Email ${site.profile.email}`, `mailto:${site.profile.email}?subject=Let's%20work%20together`)],
      ),
      action: "whale",
    }),
  },
  {
    name: "chaos-monkey",
    summary: "kill a few pods (they self-heal)",
    run: () => ({
      lines: [
        [t("Releasing the chaos monkey on namespace/portfolio…", "warn")],
        [t("Watch the log — or scroll to the top to see the cluster heal.", "faint")],
      ],
      action: "chaos",
    }),
  },
  { name: "clear", summary: "clear the screen", run: () => ({ lines: [], clear: true }) },
];

/** All command names, for completion and the help list. */
export const commandNames = COMMANDS.map((c) => c.name);

/** Normalise whitespace / case; returns the matching command, if any. */
function find(input: string) {
  const norm = input.trim().replace(/\s+/g, " ").toLowerCase();
  return COMMANDS.find((c) => c.name === norm);
}

export function runCommand(input: string, ctx: RunContext): RunResult {
  const trimmed = input.trim();
  if (!trimmed) return { lines: [] };
  const cmd = find(trimmed);
  if (cmd) return cmd.run([], ctx);
  // `ls` alone is common enough to deserve a hint
  if (/^ls\b/i.test(trimmed)) return lines([t("try: ", "faint"), t("ls projects", "accent")]);
  const name = trimmed.split(/\s+/)[0].slice(0, 40);
  return lines([t(`command not found: ${name}. Try `, "error"), t("'help'", "accent")]);
}

/** Completions for the current input: full command names that start with it. */
export function complete(input: string): string[] {
  const norm = input.replace(/\s+/g, " ").toLowerCase();
  if (!norm.trim()) return [];
  return commandNames.filter((n) => n.startsWith(norm));
}

/** Longest common prefix of the completions (what Tab fills in when there are several). */
export function commonPrefix(words: string[]) {
  if (!words.length) return "";
  let p = words[0];
  for (const w of words) while (!w.startsWith(p)) p = p.slice(0, -1);
  return p;
}
