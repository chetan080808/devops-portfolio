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
      // TODO: real numbers
      { label: "deployments", value: "3+" },
      { label: "pipelines", value: "10+" },
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
          "TODO: e.g. deploy time from ~30 min to ~4 min",
          "TODO: e.g. zero critical CVEs shipped thanks to Trivy gate",
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
    },
  ],

  dashboard: [
    // TODO: tune values to reflect your real experience — keep them honest
    {
      kind: "sparkline",
      id: "k8s",
      title: "Kubernetes",
      value: 99.9,
      suffix: "%",
      decimals: 1,
      caption: "uptime · deployments, services, HPA, ingress",
      accent: "cyan",
      series: [62, 70, 66, 74, 80, 78, 85, 88, 86, 92, 95, 97],
    },
    {
      kind: "stat",
      id: "pipelines",
      title: "Pipelines shipped",
      value: 12,
      suffix: "+",
      caption: "GitHub Actions · build → scan → deploy",
      accent: "success",
    },
    {
      kind: "gauge",
      id: "docker",
      title: "Docker",
      value: 90,
      caption: "multi-stage builds · image hardening",
      accent: "violet",
    },
    {
      kind: "list",
      id: "cloud",
      title: "Cloud: AWS",
      wide: true,
      items: [
        { label: "EC2", detail: "compute", accent: "cyan" },
        { label: "S3", detail: "storage", accent: "cyan" },
        { label: "IAM", detail: "access", accent: "violet" },
        { label: "VPC", detail: "network", accent: "violet" },
      ],
    },
    {
      kind: "sparkline",
      id: "cicd",
      title: "CI/CD throughput",
      value: 4,
      suffix: " min",
      caption: "median build → deploy",
      accent: "violet",
      series: [90, 84, 80, 72, 70, 58, 52, 44, 40, 30, 26, 22],
    },
    {
      kind: "gauge",
      id: "security",
      title: "Supply-chain security",
      value: 85,
      caption: "Trivy scans · least-privilege IAM",
      accent: "success",
    },
    {
      kind: "stat",
      id: "cve",
      title: "Critical CVEs shipped",
      value: 0,
      caption: "image scanning gate in every pipeline",
      accent: "warning",
    },
    {
      kind: "list",
      id: "toolbox",
      title: "Toolbox",
      wide: true,
      items: [
        { label: "Linux", detail: "daily driver", accent: "success" },
        { label: "Git", detail: "trunk-based", accent: "success" },
        { label: "Bash", detail: "automation", accent: "cyan" },
        { label: "TODO", detail: "add yours", accent: "warning" },
      ],
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
