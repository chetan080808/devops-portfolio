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
    siteUrl: "https://chetannamane.com",
    title: "Chetan Namane — DevOps Engineer · AWS & AI",
    description:
      "Chetan Namane, DevOps engineer with ~3 years of building and operating AWS infrastructure, CI/CD pipelines and containerized workloads in production. Scroll to watch the deployment.",
    repoUrl: "https://github.com/chetan080808/devops-portfolio",
  },

  profile: {
    name: "Chetan Namane",
    handle: "chetan",
    title: "DevOps Engineer · AWS & AI",
    pitch:
      "DevOps engineer with ~3 years of building and operating AWS infrastructure, CI/CD pipelines and containerized workloads in production.",
    location: "Mumbai, India",
    email: "chetannamne2609@gmail.com",
    resumeUrl: "/resume.pdf",
    resumeFileName: "Chetan-Namane-Resume.pdf",
    status: "Open to DevOps / Cloud / Platform Engineering roles",
    bio: [
      "Now: DevOps Engineer at CancerMitr, running end-to-end DevOps for a production healthcare platform.",
      "Before: Cloud Support Engineer at Hexaware Technologies, then freelance AWS Cloud Engineer.",
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
    fallbackLine: "[ OK ] continuing in background",
    plainLine: "Loading Chetan's portfolio…",
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
      { label: "experience", value: "~3 yrs" },
      { label: "uptime", value: "99.9%" },
      { label: "cloud", value: "AWS" },
    ],
    staticImage: {
      src: "/hero/whale-cluster-mobile.webp",
      alt: "A low-poly whale carrying three containers swims above a glowing hexagonal cluster with a ship's wheel.",
    },
    scrollHint: "Scroll to explore my work",
  },

  sections: {
    deployments: { mouse: "Projects I've built. Click one for details.", touch: "Projects I've built. Tap one for details." },
    metrics: "My skills and results, shown as a monitoring dashboard.",
    contact: "Email me or connect on LinkedIn using the buttons, or try the terminal if you're curious.",
  },

  chaos: {
    button: "Simulate a server crash",
    busy: "Crash in progress…",
    note: "Watch the system heal itself",
    srHint: "Simulates a crash of a few servers in the 3D cluster; they restart on their own.",
    summary: "{n} servers crashed and recovered automatically in {s} seconds. This is called self-healing.",
  },

  terminal: {
    placeholder: "Type help and press Enter…",
    tryLabel: "Try:",
    autoCommand: "whoami",
  },

  projects: [
    {
      id: "car-rental-k8s",
      name: "Car Rental Portal on Kubernetes",
      status: "Completed",
      stack: ["PHP", "MySQL", "Docker", "Kubernetes", "AWS EC2", "GitHub Actions", "Trivy"],
      impact:
        "Containerized a PHP + MySQL app and deployed it to Kubernetes on AWS EC2, with a GitHub Actions CI/CD pipeline that scans images with Trivy.",
      inspect: {
        problem:
          "TODO: what was painful before? (e.g. manual deploys over SSH, no rollback, unscanned images).",
        architecture: [
          "PHP + MySQL app containerized with Docker",
          "Kubernetes cluster on AWS EC2",
          "GitHub Actions CI/CD pipeline with Trivy image scanning",
        ],
        role: "Sole engineer, end to end: containerization, cluster setup and CI/CD.",
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
      status: "Completed", // engagement ended Feb 2026
      stack: ["AWS Lambda", "Step Functions", "S3", "Parquet", "Python", "CodePipeline", "CodeBuild", "CloudFormation"],
      impact:
        "Moved a production Adobe Analytics ingestion pipeline from Fivetran to a fully serverless AWS architecture across Dev, QA and Production.",
      inspect: {
        problem: "A production Adobe Analytics ingestion pipeline ran on Fivetran and needed to move to AWS.",
        architecture: [
          "Fully serverless AWS architecture, replicated across Dev, QA and Production",
          "Partitioned Parquet datasets on S3",
          "Git-triggered CI/CD: GitHub → CodePipeline → CodeBuild → CloudFormation, for multi-account deployments",
        ],
        role: "AWS Cloud Engineer (freelance), Dec 2025 – Feb 2026.",
        results: [
          "Automated historical backfill of 2+ years of data across 3 ingestion cadences with a Python orchestration script",
          "Full Infrastructure as Code parity across environments",
          "Self-service multi-account deployments",
        ],
      },
      links: [], // client work: no public link
    },
    {
      id: "healthcare-platform-infra",
      name: "Healthcare Platform Infrastructure",
      status: "Running",
      stack: ["AWS EC2", "RDS PostgreSQL", "Docker", "Docker Compose", "Nginx", "GitHub Actions", "CloudWatch", "KMS", "Vercel", "Expo EAS"],
      impact:
        "Repeatable, secure and observable delivery for a production healthcare platform, across staging and production.",
      inspect: {
        problem:
          "A production healthcare platform needed repeatable, secure, observable delivery across staging and production.",
        architecture: [
          "Docker, Nginx and Docker Compose on EC2 (staging + production)",
          "GitHub Actions CI/CD with self-hosted runners for the backend services and the React Native / Expo (EAS) mobile app",
          "Amazon RDS PostgreSQL",
          "CloudWatch centralized logging",
          "KMS encryption at rest",
        ],
        role: "DevOps Engineer at CancerMitr: owns DevOps end to end.",
        results: [
          "Eliminated environment drift",
          "Automated build, test and deployment",
          "Migrated the production database from MySQL to PostgreSQL on RDS with zero data loss",
          "Encryption at rest across database, file storage and app servers",
          "Consolidated GitHub and Vercel into company-controlled org accounts with branch protection",
        ],
      },
      links: [], // no public link
    },
  ],

  experience: [
    // Oldest → newest. Build and Test overlap in time (worked while studying); the periods show it.
    {
      id: "edu",
      stage: "build",
      plainTitle: "Education",
      title: "B.Sc. in Information Technology",
      org: "SIES College of Arts, Science and Commerce, Mumbai",
      period: "2022 – 2025",
      duration: "3y",
      summary: "Where the foundations were compiled.",
      highlights: [],
    },
    {
      id: "hexaware",
      stage: "test",
      plainTitle: "Cloud Support Engineer",
      title: "Cloud Support Engineer",
      org: "Hexaware Technologies, Mumbai",
      period: "Feb 2024 – Nov 2025",
      duration: "1y 10mo",
      summary: "Started while still studying: this stage overlaps the Build stage.",
      highlights: [
        "Sustained 99.9% uptime and reduced downtime by 20% with proactive CloudWatch monitoring and automated alerting",
        "Resolved 30+ AWS/DevOps tickets weekly at 95% SLA compliance",
      ],
    },
    {
      id: "freelance",
      stage: "deploy",
      plainTitle: "Freelance AWS Engineer",
      title: "AWS Cloud Engineer",
      org: "Freelance",
      period: "Dec 2025 – Feb 2026",
      duration: "3mo",
      summary: "Adobe Analytics → AWS serverless migration across Dev, QA and Production.",
      highlights: [],
    },
    {
      id: "cancermitr",
      stage: "monitor",
      plainTitle: "DevOps Engineer — current",
      title: "DevOps Engineer",
      org: "CancerMitr",
      period: "Feb 2026 – Present",
      duration: null,
      since: "2026-02", // duration = Feb 2026 → today, computed when the page loads
      summary: "End-to-end DevOps for a production healthcare platform.",
      highlights: ["MySQL → PostgreSQL migration on RDS with zero data loss"],
      current: true,
    },
  ],

  pipeline: {
    job: "career-pipeline",
    branch: "main",
    // Parallel branch drawn under the `alongside` stage
    parallel: {
      label: "side-projects",
      plainLabel: "Side projects",
      alongside: "cancermitr",
      jobs: ["ScanCure AI", "Car Rental Portal on Kubernetes", "This portfolio"],
    },
    intro: "My career, shown as a CI/CD pipeline: each stage is one step of my journey.",
    legend: { done: "Completed", current: "Current", queued: "Not started" },
    stageHint: { mouse: "Click a stage for details", touch: "Tap a stage for details" },
    buildHint: "Replay my career pipeline",
  },

  dashboard: [
    // Only claims you can back up. Layout: 2 columns (phones, tablets), `wide` panels take both;
    // lg: 4 columns, `wide` panels take 3 next to one stat (keep the order wide, stat, stat, wide),
    // text panels take 2.
    {
      kind: "stat",
      id: "uptime",
      title: "Uptime sustained",
      value: 99.9,
      decimals: 1,
      suffix: "%",
      caption: "client production · Hexaware",
      accent: "success",
    },
    {
      kind: "stat",
      id: "downtime",
      title: "Downtime reduced",
      value: 20,
      suffix: "%",
      caption: "proactive CloudWatch monitoring + alerting",
      accent: "cyan",
    },
    {
      kind: "gauge",
      id: "sla",
      title: "SLA compliance",
      value: 95,
      caption: "AWS / DevOps support tickets",
      accent: "violet",
    },
    {
      kind: "stat",
      id: "tickets",
      title: "Tickets resolved weekly",
      value: 30,
      suffix: "+",
      caption: "AWS / DevOps tickets",
      accent: "cyan",
    },
    {
      kind: "tags",
      id: "cloud",
      title: "Cloud services: AWS",
      wide: true,
      accent: "cyan",
      items: [
        "EC2", "S3", "VPC", "IAM", "RDS", "EKS", "Lambda", "Step Functions", "EventBridge", "DynamoDB",
        "CloudFront", "API Gateway", "Route 53", "Secrets Manager", "KMS", "SES", "SNS", "ELB/ALB", "CloudWatch",
      ],
    },
    {
      kind: "stat",
      id: "lambda-cost",
      title: "Lambda cost reduction",
      value: 25,
      prefix: "~",
      suffix: "%",
      caption: "ScanCure AI · memory sizing + runtime tuning",
      accent: "success",
    },
    {
      kind: "stat",
      id: "backfill",
      title: "Historical data backfilled",
      value: 2,
      suffix: "+ yrs",
      caption: "3 ingestion cadences · Python orchestration",
      accent: "violet",
    },
    {
      kind: "tags",
      id: "toolbox",
      title: "Toolbox",
      wide: true,
      accent: "violet",
      items: [
        "Docker", "Docker Compose", "Kubernetes", "EKS", "Nginx", "Terraform", "CloudFormation", "GitHub Actions", "Jenkins",
        "CodePipeline", "CodeBuild", "Python", "Bash", "Boto3", "PostgreSQL", "MySQL", "Prometheus", "Grafana",
      ],
    },
    {
      kind: "text",
      id: "environments",
      title: "Environments managed",
      headline: "Dev · QA · Production",
      caption: "Infrastructure as Code parity across environments",
      accent: "cyan",
    },
    {
      kind: "text",
      id: "security",
      title: "Supply-chain security",
      headline: "Trivy image scanning",
      caption: "in the Car Rental Portal CI/CD pipeline",
      accent: "success",
    },
  ],

  socials: [
    { kind: "github", label: "GitHub", href: "https://github.com/chetan080808", handle: "github.com/chetan080808" },
    { kind: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/chetan-namane/", handle: "linkedin.com/in/chetan-namane" },
    { kind: "email", label: "Email", href: "mailto:chetannamne2609@gmail.com", handle: "chetannamne2609@gmail.com" },
  ],

};
