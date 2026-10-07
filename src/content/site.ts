/**
 * ─────────────────────────────────────────────────────────────
 *  SINGLE SOURCE OF TRUTH FOR ALL PERSONAL CONTENT
 *  Edit this file to change anything personal on the site.
 *  Search for "TODO" to find every placeholder.
 * ─────────────────────────────────────────────────────────────
 */
import type { SiteContent } from "@/types/content";

export const site: SiteContent = {
  meta: {
    siteUrl: "https://example.com", // TODO: your production domain
    title: "Your Name — DevOps & Platform Engineer", // TODO: your name
    description:
      "Portfolio of a DevOps & Platform Engineer: Kubernetes, CI/CD, cloud infrastructure on AWS. Scroll to watch the deployment.", // TODO: tweak
    repoUrl: "https://github.com/your-handle/devops-portfolio", // TODO: repo URL
  },

  profile: {
    name: "Your Name", // TODO: your full name
    handle: "you", // TODO: short lowercase handle used in terminal prompts
    title: "DevOps & Platform Engineer", // TODO: confirm title
    pitch:
      "I build the paved roads that ship software: containerized workloads, Kubernetes clusters and CI/CD pipelines that make deploys boring.", // TODO: your one-liner
    location: "TODO: City, Country",
    email: "you@example.com", // TODO: your email
    resumeUrl: "/resume.pdf", // TODO: drop your resume at public/resume.pdf
    available: true,
    bio: [
      // TODO: replace with your own short bio (2–3 lines)
      "DevOps engineer focused on Kubernetes, AWS and automated delivery pipelines.",
      "I like turning manual, fragile release processes into repeatable, observable systems.",
    ],
  },

  boot: {
    command: "kubectl apply -f portfolio.yaml",
    lines: [
      "namespace/portfolio created",
      "configmap/site-content created",
      "deployment.apps/portfolio created",
      "service/portfolio created",
    ],
    readyLine: "pod/portfolio-0 1/1 Running",
  },

  nav: [
    { label: "deployments", href: "#deployments" },
    { label: "pipeline", href: "#pipeline" },
    { label: "metrics", href: "#metrics" },
    { label: "contact", href: "#contact" },
  ],

  hero: {
    eyebrow: "namespace/portfolio · pod/running",
    primaryCta: { label: "View Deployments", href: "#deployments" },
    secondaryCta: { label: "Download Resume", href: "/resume.pdf" },
    stats: [
      // TODO: fill with real, defensible values (e.g. "3"). null renders "—".
      { label: "deployments", value: null }, // TODO
      { label: "pipelines", value: null }, // TODO
      { label: "cloud", value: "AWS" },
    ],
  },

  projects: [
    {
      id: "car-rental-k8s",
      name: "Car Rental Portal on Kubernetes",
      status: "Running",
      stack: ["PHP", "MySQL", "Docker", "Kubernetes", "AWS EC2", "GitHub Actions", "Trivy"],
      impact:
        "Containerized a PHP + MySQL app and shipped it to Kubernetes on EC2 with a scanned, fully automated CI/CD pipeline.",
      inspect: {
        problem:
          "TODO: what was painful before? (e.g. manual deploys over SSH, no rollback, unscanned images).",
        architecture: [
          "PHP app + MySQL, each in its own Docker image",
          "Kubernetes cluster on AWS EC2 (Deployments, Services, PersistentVolume for MySQL)",
          "GitHub Actions: build → Trivy image scan → push → kubectl rollout",
          "TODO: ingress / secrets / monitoring details",
        ],
        role: "TODO: your role (e.g. sole engineer — design, IaC, pipeline, deployment).",
        results: [
          "TODO: a measurable result (e.g. deploy time before → after)",
          "TODO: a security outcome of the Trivy scan gate",
        ],
      },
      links: [
        { label: "GitHub", href: "https://github.com/TODO" }, // TODO
      ],
    },
    {
      id: "adobe-analytics-ingest",
      name: "Adobe Analytics → AWS Data Ingestion",
      status: "Running",
      stack: ["AWS", "Adobe Analytics", "TODO"],
      impact: "TODO: one-line impact for the Adobe Analytics → AWS data pipeline.",
      inspect: {
        problem: "TODO: what data needed to move and why.",
        architecture: ["TODO: source → transport → storage → consumers"],
        role: "TODO: your role.",
        results: ["TODO: volume, latency, cost or reliability outcome"],
      },
      links: [{ label: "GitHub", href: "https://github.com/TODO" }], // TODO
    },
    {
      id: "healthcare-platform-infra",
      name: "Healthcare Platform Infrastructure",
      status: "Running",
      stack: ["AWS", "Docker", "GitHub Actions", "Vercel", "TODO"],
      impact: "TODO: cloud, CI/CD and deployment infrastructure for a healthcare platform.",
      inspect: {
        problem: "TODO: the problem this infrastructure solved.",
        architecture: ["TODO: AWS services, container setup, CI/CD flow, Vercel frontends"],
        role: "TODO: your role.",
        results: ["TODO: measurable outcome"],
      },
      links: [{ label: "Live", href: "https://TODO" }], // TODO
    },
  ],

  experience: [
    // TODO: replace with your real career/education milestones (oldest → newest)
    {
      id: "edu",
      stage: "build",
      title: "TODO: Degree / Program",
      org: "TODO: University",
      period: "20XX – 20XX",
      summary: "Where the foundations were compiled.",
      highlights: ["TODO: relevant coursework or achievement"],
    },
    {
      id: "cert",
      stage: "test",
      title: "TODO: Certification / Bootcamp",
      org: "TODO: Issuer",
      period: "20XX",
      summary: "Skills validated under test.",
      highlights: ["TODO: e.g. AWS / CKA / Terraform"],
    },
    {
      id: "role-1",
      stage: "deploy",
      title: "TODO: DevOps Engineer",
      org: "TODO: Company",
      period: "20XX – Present",
      summary: "Shipped to production.",
      highlights: ["TODO: biggest win", "TODO: second win"],
    },
    {
      id: "now",
      stage: "monitor",
      title: "Platform Engineering",
      org: "Continuous improvement",
      period: "Now",
      summary: "Observing, iterating, leveling up.",
      highlights: ["TODO: what you're learning or building next"],
      current: true,
    },
  ],

  dashboard: [
    // Only claims you can back up. Numeric values stay `null` (renders "No data")
    // until you fill in a real number. Layout: 4 columns, `wide` panels take 2.
    {
      kind: "stat",
      id: "pipelines",
      title: "Pipelines shipped",
      value: null, // TODO: real count of CI/CD pipelines you've built
      caption: "GitHub Actions · build → scan → deploy",
      accent: "success",
    },
    {
      kind: "sparkline",
      id: "cicd",
      title: "Build → deploy time",
      wide: true,
      value: null, // TODO: real median minutes, e.g. 4 (and set suffix: " min")
      caption: "median pipeline duration",
      accent: "violet",
      series: null, // TODO: real durations normalized 0–100, oldest → newest
    },
    {
      kind: "text",
      id: "docker",
      title: "Docker",
      headline: "Containerized apps",
      caption: "PHP + MySQL services packaged as images", // TODO: add e.g. multi-stage builds if true
      accent: "violet",
    },
    {
      kind: "text",
      id: "k8s",
      title: "Kubernetes",
      headline: "Self-hosted on EC2",
      caption: "Car Rental Portal runs on a cluster on AWS EC2", // TODO: add the objects you've used
      accent: "cyan",
    },
    {
      kind: "list",
      id: "cloud",
      title: "Cloud: AWS",
      wide: true,
      items: [
        { label: "EC2", detail: "Kubernetes nodes", accent: "cyan" },
        { label: "TODO", detail: "add AWS services you've used", accent: "warning" },
        { label: "TODO", detail: "e.g. S3 / IAM / VPC", accent: "warning" },
        { label: "TODO", detail: "ingestion pipeline services", accent: "warning" },
      ],
    },
    {
      kind: "text",
      id: "security",
      title: "Supply-chain security",
      headline: "Trivy image scanning",
      caption: "vulnerability scan in every pipeline before push",
      accent: "success",
    },
    {
      kind: "stat",
      id: "projects",
      title: "Projects in production",
      value: null, // TODO: real number
      caption: "see Deployments above",
      accent: "cyan",
    },
    {
      kind: "list",
      id: "toolbox",
      title: "Toolbox",
      wide: true,
      items: [
        { label: "GitHub Actions", detail: "CI/CD", accent: "success" },
        { label: "Docker", detail: "containers", accent: "cyan" },
        { label: "Vercel", detail: "frontend hosting", accent: "violet" },
        { label: "TODO", detail: "add yours", accent: "warning" },
      ],
    },
    {
      kind: "text",
      id: "learning",
      title: "Currently learning",
      headline: "TODO: e.g. Terraform",
      caption: "TODO: what you're levelling up next",
      accent: "warning",
    },
  ],

  socials: [
    { kind: "github", label: "GitHub", href: "https://github.com/TODO", handle: "github.com/TODO" }, // TODO
    { kind: "linkedin", label: "LinkedIn", href: "https://linkedin.com/in/TODO", handle: "linkedin.com/in/TODO" }, // TODO
    { kind: "email", label: "Email", href: "mailto:you@example.com", handle: "you@example.com" }, // TODO
  ],

  footer: {
    // Placeholders — wired to real CI data in Phase 7
    buildStatus: "passing",
    lastDeploy: "pending",
    podCount: 3,
    version: "v0.1.0",
  },
};
