export type Accent = "cyan" | "violet" | "success" | "warning";

export interface Link {
  label: string;
  href: string;
}

export interface SocialLink extends Link {
  /** Short handle shown in the terminal, e.g. "github.com/you" */
  handle: string;
  kind: "github" | "linkedin" | "email" | "x" | "website";
}

export interface Profile {
  name: string;
  /** Short handle used in terminal prompts, e.g. "chetan" */
  handle: string;
  title: string;
  pitch: string;
  location: string;
  email: string;
  resumeUrl: string;
  /** File name the resume downloads as (the URL stays resumeUrl) */
  resumeFileName: string;
  /** Availability line (contact section + `contact` command); null hides it */
  status: string | null;
  bio: string[];
}

export interface Project {
  /** Kebab-case id, used as the "pod" name */
  id: string;
  name: string;
  status: "Running" | "Pending" | "Completed";
  stack: string[];
  impact: string;
  inspect: {
    problem: string;
    architecture: string[];
    role: string;
    results: string[];
  };
  links: Link[];
}

export type StageKind = "build" | "test" | "deploy" | "monitor" | "release";

/** Text for each pointer: "Click …" with a mouse, "Tap …" on touch (picked by CSS, no flash). */
export interface PointerText {
  mouse: string;
  touch: string;
}

export interface Milestone {
  id: string;
  stage: StageKind;
  /** Plain-language name of the step (main label in the pipeline graph) */
  plainTitle: string;
  title: string;
  org: string;
  period: string;
  summary: string;
  highlights: string[];
  /** The stage you're in right now — rendered as "running" instead of passed */
  current?: boolean;
  /** Real duration shown in the Jenkins Stage View, e.g. "4y" or "8mo"; null renders "—" */
  duration: string | null;
  /** "YYYY-MM": the duration is computed from this month to today when the page loads (current role) */
  since?: string;
}

/**
 * Metric values are `null` until you fill in a real, defensible number.
 * Null values render as "No data" (like an empty Grafana panel).
 */
type Metric = number | null;

interface PanelBase {
  id: string;
  title: string;
  /** Span two columns on wider screens */
  wide?: boolean;
}

export type DashboardPanel =
  | (PanelBase & {
      kind: "stat";
      value: Metric;
      /** e.g. "~" for an approximate value */
      prefix?: string;
      suffix?: string;
      decimals?: number;
      caption: string;
      accent: Accent;
    })
  | (PanelBase & {
      kind: "sparkline";
      value: Metric;
      prefix?: string;
      suffix?: string;
      decimals?: number;
      caption: string;
      accent: Accent;
      /** Real series normalized 0–100, oldest → newest; null = no data */
      series: number[] | null;
    })
  | (PanelBase & {
      kind: "gauge";
      /** 0–100 */
      value: Metric;
      caption: string;
      accent: Accent;
    })
  | (PanelBase & {
      /** Descriptive panel — a statement instead of a number */
      kind: "text";
      headline: string;
      caption: string;
      accent: Accent;
    })
  | (PanelBase & {
      kind: "list";
      items: { label: string; detail: string; accent: Accent }[];
    })
  | (PanelBase & {
      /** Plain set of names (services, tools) rendered as chips */
      kind: "tags";
      items: string[];
      caption?: string;
      accent: Accent;
    });

export interface SiteContent {
  meta: {
    siteUrl: string;
    title: string;
    description: string;
    repoUrl: string;
  };
  profile: Profile;
  /** Terminal intro shown once per session before the hero */
  boot: {
    command: string;
    /** Printed one by one while assets download */
    lines: string[];
    /** Printed when the 3D scene is ready */
    readyLine: string;
    /** Closing line when the gate's safety net ends the boot before React takes over. */
    fallbackLine: string;
    /** Plain line above the boot terminal, for non-technical visitors */
    plainLine: string;
  };
  nav: Link[];
  hero: {
    eyebrow: string;
    primaryCta: Link;
    secondaryCta: Link;
    /** value: null renders "—" until you fill it in */
    stats: { label: string; value: string | null }[];
    /** Phones (and no-GPU browsers) show a still of the 3D scene instead of loading it */
    /** Stills of the scene's first settled frame: stand-in until the 3D takes over (and no-WebGL fallback) */
    staticImage: { alt: string; mobile: StillImage; desktop: (StillImage & { minHeight: number })[] };
    /** Hint at the bottom of the hero (desktop) */
    scrollHint: string;
  };
  /** Plain-language line under each section's technical heading */
  sections: {
    deployments: PointerText;
    metrics: string;
    contact: string;
  };
  /** Chaos Monkey (hero button + run log). `summary`: {n} = servers crashed, {s} = seconds to heal */
  chaos: {
    button: string;
    busy: string;
    note: string;
    srHint: string;
    summary: string;
  };
  /** Contact terminal */
  terminal: {
    placeholder: string;
    tryLabel: string;
    /** Typed and run once when the section first comes into view (null = off) */
    autoCommand: string | null;
    /** Screen-reader note when `sudo hire-me` sends the whale across the section */
    hireMeWhale: string;
  };
  /** Dashboard toolbar. The "refresh" really re-checks the live server (/api/healthz) every 30 s. */
  dashboardBar: {
    title: string;
    range: string;
    refresh: string;
    /** {s} = seconds since the last successful check */
    updated: string;
    justNow: string;
    /** The last check failed */
    offline: string;
  };
  projects: Project[];
  experience: Milestone[];
  /** Jenkins-style presentation of `experience` (Pipeline section) */
  pipeline: {
    job: string;
    branch: string;
    /** Parallel branch running alongside one stage, with its own job names */
    parallel: { label: string; plainLabel: string; alongside: string; jobs: string[] };
    /** One-line plain intro under the section heading */
    intro: string;
    legend: { done: string; current: string; queued: string };
    stageHint: PointerText;
    /** Plain hint next to the Build Now button */
    buildHint: string;
  };
  dashboard: DashboardPanel[];
  socials: SocialLink[];
}

/** A still of the 3D canvas as two layers: page × (1 − alpha) + premultiplied colour */
export interface StillImage {
  /** Black with the canvas' alpha (normal blending) */
  shade: string;
  /** The canvas' premultiplied colour on black (added with mix-blend-mode: plus-lighter) */
  light: string;
  width: number;
  height: number;
}
