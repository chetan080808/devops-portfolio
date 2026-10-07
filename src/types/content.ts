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
  available: boolean;
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

export interface Milestone {
  id: string;
  stage: StageKind;
  title: string;
  org: string;
  period: string;
  summary: string;
  highlights: string[];
}

export type DashboardPanel =
  | {
      kind: "stat";
      id: string;
      title: string;
      value: number;
      suffix?: string;
      decimals?: number;
      caption: string;
      accent: Accent;
    }
  | {
      kind: "sparkline";
      id: string;
      title: string;
      value: number;
      suffix?: string;
      decimals?: number;
      caption: string;
      accent: Accent;
      /** Normalized series 0–100, oldest → newest */
      series: number[];
    }
  | {
      kind: "gauge";
      id: string;
      title: string;
      /** 0–100 */
      value: number;
      caption: string;
      accent: Accent;
    }
  | {
      kind: "list";
      id: string;
      title: string;
      /** Span two columns on wider screens */
      wide?: boolean;
      items: { label: string; detail: string; accent: Accent }[];
    };

export interface SiteContent {
  meta: {
    siteUrl: string;
    title: string;
    description: string;
    repoUrl: string;
  };
  profile: Profile;
  nav: Link[];
  hero: {
    eyebrow: string;
    primaryCta: Link;
    secondaryCta: Link;
    stats: { label: string; value: string }[];
  };
  projects: Project[];
  experience: Milestone[];
  dashboard: DashboardPanel[];
  socials: SocialLink[];
  footer: {
    buildStatus: string;
    lastDeploy: string;
    podCount: number;
    version: string;
  };
}
