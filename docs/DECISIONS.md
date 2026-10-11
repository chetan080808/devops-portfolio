# Decisions

One entry per decision that shaped this project: the context, the options, what we chose and
why. Newest phase last. Prices are AWS on-demand list prices for `ap-south-1` (Mumbai), before
tax, taken from the AWS Price List API on the date shown. Measurements were taken on the
owner's laptop unless the entry says otherwise.

Updated after every checkpoint.

| # | Decision | Phase |
| --- | --- | --- |
| [D-01](#d-01-nextjs--react-three-fiber--gsap) | Next.js + React Three Fiber + GSAP | 1 |
| [D-02](#d-02-one-content-file-no-invented-numbers) | One content file, no invented numbers | 1 |
| [D-03](#d-03-original-3d-assets-no-official-logos) | Original 3D assets, no official logos | 2 |
| [D-04](#d-04-mini-containers-are-clones-not-a-second-model) | Mini containers are clones, not a second model | 2 |
| [D-05](#d-05-boot-progress-follows-real-downloads) | Boot progress follows real downloads | 3 |
| [D-06](#d-06-neon-and-bloom-without-an-extra-library) | Neon and bloom without an extra library | 3 |
| [D-07](#d-07-desktop-scroll-moves-the-camera) | Desktop scroll moves the camera | 4 |
| [D-08](#d-08-pipeline-state-is-one-number) | Pipeline state is one number | 4 |
| [D-09](#d-09-terminal-commands-are-a-lookup-table) | Terminal commands are a lookup table | 5 |
| [D-10](#d-10-chaos-monkey-is-one-shared-timeline) | Chaos Monkey is one shared timeline | 5 |
| [D-11](#d-11-meshopt-instead-of-draco) | meshopt instead of Draco | 6 |
| [D-12](#d-12-compile-shaders-during-the-boot) | Compile shaders during the boot | 6 |
| [D-13](#d-13-pixel-budget-instead-of-full-resolution) | Pixel budget instead of full resolution | 6 |
| [D-14](#d-14-phones-get-a-still-image) | Phones get a still image | 6 |
| [D-15](#d-15-no-msaa-on-the-hero) | No MSAA on the hero | 6 |
| [D-16](#d-16-one-ec2-server-running-k3s) | One EC2 server running k3s | 7 |
| [D-17](#d-17-container-image) | Container image | 7a |
| [D-18](#d-18-release-id--commit-sha) | Release ID = commit SHA | 7a |
| [D-19](#d-19-terraform-in-two-stacks-state-in-s3) | Terraform in two stacks, state in S3 | 7b |
| [D-20](#d-20-network-and-access) | Network and access | 7b |
| [D-21](#d-21-instance-guardrails) | Instance guardrails | 7b |
| [D-22](#d-22-cost-budget) | Cost budget | 7b |
| [D-23](#d-23-pod-network-1052016) | Pod network 10.52.0.0/16 | 7b |
| [D-24](#d-24-lf-line-endings-for-scripts-and-terraform) | LF line endings for scripts and Terraform | 7b |
| [D-25](#d-25-instance-size-stays-t3small-for-now) | Instance size stays t3.small (for now) | 7b |

---

## Phase 1–6: the site

### D-01 Next.js + React Three Fiber + GSAP

- **Context:** a portfolio that has to rank and share well (real HTML, metadata, OG image) and
  also carry a 3D scene and scroll-driven storytelling.
- **Options:** a client-only SPA with raw three.js; a hosted 3D tool embed; Next.js with React
  Three Fiber.
- **Choice:** Next.js (App Router) + TypeScript + Tailwind; React Three Fiber + drei for 3D; GSAP
  ScrollTrigger for scroll; Framer Motion for small UI motion.
- **Why:** pages are prerendered (fast first paint, SEO), the 3D scene is a lazy-loaded React
  component like any other, and GSAP's scrubbed, pinned timelines fit "scroll = deployment".

### D-02 One content file, no invented numbers

- **Context:** a portfolio full of dashboard-style numbers invites made-up metrics.
- **Choice:** all personal content lives in `src/content/site.ts`. Unknown values are `null` or
  `TODO` and are hidden in production (`lib/todo.ts`); count-ups only animate real values.
- **Why:** one place to edit; nothing on the page claims something that isn't true.

### D-03 Original 3D assets, no official logos

- **Context:** the Docker whale and the Kubernetes wheel are trademarks.
- **Choice:** original Blender models: a stylized whale carrying containers, a generic
  **eight-spoke** helm wheel (the Kubernetes logo has seven), hex cluster nodes, a shipping
  container with hinged doors. The whale is built on Quaternius' CC0 base mesh (credited in
  `ASSETS.md`); the pure-Python procedural whale is kept as a fallback.
- **Why:** recognizable theme without using anyone's brand.

### D-04 Mini containers are clones, not a second model

- **Context:** each project gets a small container on the whale's back.
- **Choice:** reuse `shipping_container.glb` at ~0.25 scale; every mini is a deep clone with its
  own copies of every material.
- **Why:** one less file to download; per-instance materials mean hover, recolor or Chaos Monkey
  on one project never changes the others.

### D-05 Boot progress follows real downloads

- **Choice:** the boot terminal's progress bar is driven by three.js' `DefaultLoadingManager`
  (bridged into a store that never imports three). "Skip" is remembered for the session.
- **Why:** the boot hides real loading instead of being a fake timer.

### D-06 Neon and bloom without an extra library

- **Choice:** three's own `UnrealBloomPass`; neon materials use `toneMapped={false}` and are
  scaled to 0.33 of their authored strength; bloom threshold 0.55, strength 0.32 (0.26 mobile),
  mip weights `[1, .7, .32, .1, .02]`.
- **Why:** no extra dependency; tone mapping desaturated the cyan, and the default wide bloom mips
  washed the frame in teal haze.

### D-07 Desktop scroll moves the camera

- **Context:** the hero scene stays on screen while the page scrolls (the whale flies down to the
  project cards).
- **Options:** shift the lens (off-axis projection) or pan the camera.
- **Choice:** pan the camera along its up-axis by scroll × world-units-per-pixel.
- **Why:** the lens shift put the whale far off the optical axis and stretched it; panning keeps
  whatever is on screen near the centre of the lens.

### D-08 Pipeline state is one number

- **Context:** the Jenkins-style pipeline has a header count, a graph and a table that must
  always agree while the user scrubs back and forth.
- **Choice:** one value (`pipelineRun.t`); every status is derived from it after each render.
- **Why:** React re-renders (resize, date hydration) had rewritten statuses and the header said
  0/4 while the graph showed passed stages. A 211-sample scripted sweep found 0 mismatches after.

### D-09 Terminal commands are a lookup table

- **Choice:** `lib/terminal/engine.ts` matches input against a fixed command table; nothing is
  ever evaluated; all output comes from `site.ts`.
- **Why:** a "terminal" on a public site must not be a way to run code.

### D-10 Chaos Monkey is one shared timeline

- **Choice:** one timeline in `lib/chaos.ts` (no three.js import) read by the 3D nodes, the links,
  the status labels, the navbar and the log.
- **Why:** everything shows the same failure and recovery at the same moment.

### D-11 meshopt instead of Draco

- **Context:** Draco shrank the models but its WebAssembly decoder had to be downloaded too.
- **Measured (6a, gzip, incl. decoder):** raw 67 KB, quantize 64 KB, Draco 113 KB,
  meshopt 54 KB. Transfer went from 118 KB (64 KB of it the decoder) to 49 KB, 6 → 4 requests.
- **Choice:** meshopt via `@gltf-transform/cli`.
- **Why:** smallest total bytes once the decoder is counted.

### D-12 Compile shaders during the boot

- **Context:** the first frame with a new material compiled its shader on the main thread
  (about 1 s for the first standard material on a cold profile), so the intro stuttered.
- **Choice:** `three/precompile.ts` compiles every shader while the boot screen is up; the render
  loop starts only when everything is warm.
- **Why:** the boot already covers loading; the intro then runs without hitches.

### D-13 Pixel budget instead of full resolution

- **Measured:** 1920×1080 at full DPR = 4.6 MP, 42–46 fps. Budgeted to 2.06 MP: 60 fps.
  A fractional DPR (1.05) ran at about 2 fps on this GPU.
- **Choice:** canvas capped at 2.3 MP (desktop) / 1.2 MP (mobile), DPR snapped down to steps of
  0.25.
- **Why:** smooth motion matters more than the last bit of sharpness on big screens.

### D-14 Phones get a still image

- **Context:** mobile Lighthouse Performance was 35–47 with the live 3D scene.
- **Choice:** touch phones get a captured still of the scene (`whale-cluster-mobile.webp`); the
  3D loads only if the visitor taps "load 3D anyway".
- **Measured:** mobile Lighthouse 70–88, page weight 697 → 385 KB.

### D-15 No MSAA on the hero

- **Context:** thin neon lines shimmer while moving, because the post-processing target has no
  anti-aliasing.
- **Tried:** MSAA with 2 or 4 samples: 60 → 31–34 fps at 1920×1080.
- **Choice:** keep it off; if it needs fixing, try a cheap FXAA/SMAA pass later.

---

## Phase 7: going live

### D-16 One EC2 server running k3s

- **Context:** the site should run on real Kubernetes (it's a DevOps portfolio) on a budget of
  about $28/month. The AWS Free Tier credit ($100) expired on 2026-10-11; everything is billed.
- **Options:** managed Kubernetes (EKS: the control plane alone is $0.10/hour, about $73/month,
  before any server); a load balancer in front (hourly charge); a static or serverless host (no
  Kubernetes to show); one EC2 server running k3s.
- **Choice:** one EC2 `t3.small` in `ap-south-1` running k3s, Traefik as the Ingress, images in
  GHCR (`ghcr.io/chetan080808/devops-portfolio`, lowercase).
- **Why:** a complete Kubernetes (Deployments, Services, Ingress, HPA) at about $21.82/month.
  Trade-off: one server, one zone. If it goes down the site is down until it's rebuilt.

### D-17 Container image

- **Choice:** three-stage Dockerfile (deps → build → runtime) using Next's `standalone` output on
  `node:24.21.0-alpine3.24` (exact tag). Runs as the `node` user; npm/npx/yarn/corepack removed
  from the runtime image; `CMD ["node","server.js"]` so Node is PID 1 and gets SIGTERM;
  `HEALTHCHECK` on `/api/healthz`.
- **Measured (2026-10-12):** 334 MB uncompressed / 85 MB gzipped (242 MB of it the Node base);
  Trivy: 0 fixable HIGH/CRITICAL; graceful stop 1.4 s.
- **Why:** small, reproducible, nothing in the running container can install software.

### D-18 Release ID = commit SHA

- **Choice:** CI passes `GIT_SHA`; `next.config.ts` uses it as both build ID and `deploymentId`.
- **Why:** during a rolling update, all pods of one release serve the same asset names, and a
  browser still on the old release reloads instead of failing on missing JavaScript chunks.

### D-19 Terraform in two stacks, state in S3

- **Choice:** `bootstrap` (state bucket + budget, applied once) and `main` (the server). State in
  a private, versioned, encrypted, HTTPS-only S3 bucket with S3's own lock file
  (`use_lockfile`), no DynamoDB table. The bootstrap stack's own state was migrated into the
  bucket after its first apply. Bucket name and alert email live in gitignored files.
- **Why:** the bucket has to exist before anything can store state in it; versioning makes a
  bad apply recoverable; S3 locking has no extra table to pay for or manage.

### D-20 Network and access

- **Choice:** own VPC with one public subnet, no NAT gateway, no VPC endpoints. Security group:
  only 80/443 in, only 80/443 out. No SSH, no Kubernetes API (6443) on the internet; admin access
  only through SSM Session Manager (the server's single permission is
  `AmazonSSMManagedInstanceCore`). Elastic IP for DNS.
- **Why:** smallest possible attack surface; NAT and endpoints would cost more per month than
  the server's disk and IP together; SSM sessions are authenticated with AWS SSO and logged.

### D-21 Instance guardrails

- **Choice:** IMDSv2 only with hop limit 1; encrypted gp3 root disk; CPU credits "standard";
  Kubernetes secrets encrypted at rest; k3s and its installer pinned to `v1.36.5+k3s1`; AMI changes
  ignored (upgrades are deliberate); any boot-script change rebuilds the server.
- **Why:** pods can't read the server's AWS credentials; "unlimited" CPU credits can bill extra
  when the CPU runs hot; pinned versions make a rebuild produce the same server.

### D-22 Cost budget

- **Choice:** AWS Budget $28/month for the whole account, **before tax**, emails at 90% actual,
  100% actual and 100% forecast.
- **Why:** with 18% GST included the steady state (~$25.75) would have crossed an 80% line
  ($22.40) every month and the early warning would mean nothing. Kept as is after the credit
  expired.

### D-23 Pod network 10.52.0.0/16

- **Context:** the first apply used k3s' default pod network `10.42.0.0/16`, the same range as
  the VPC; health checks to pods timed out (see `INTERVIEW_PREP.md`, gitignored).
- **Choice:** `--cluster-cidr 10.52.0.0/16` (services stay `10.43.0.0/16`); the instance was
  rebuilt (1 replaced, Elastic IP kept).
- **Why:** pod, service and VPC ranges must never overlap.

### D-24 LF line endings for scripts and Terraform

- **Choice:** `.gitattributes` forces LF for `*.sh`, `*.tftpl`, `*.tf`, `*.hcl`.
- **Why:** Git on Windows checks files out with CRLF. A CRLF boot script breaks bash on the
  server, and because user data is part of the instance, it would also have forced a rebuild.

### D-25 Instance size stays t3.small (for now)

- **Measured (2026-10-12, idle node, nothing deployed):** 1.1 of 1.9 GiB memory used (58%),
  CPU 5%. Leaves about 0.8 GiB for the site.
- **Options:**

  | Option | Price | Server + disk + IP per month |
  | --- | --- | --- |
  | t3.small (2 GiB) | $0.0224/hour | ≈ $21.82 |
  | t3.medium (4 GiB) | $0.0448/hour | ≈ $38.17, **over the $28 budget** |

- **Choice:** stay on t3.small; give the site's pods tight memory requests and limits in 7c.
- **Revisit when:** memory pressure or OOM kills show up, or a second app (e.g. the Car Rental
  phase) needs room. Also to evaluate (Phase 8): t4g.small (Graviton, arm64 image built in CI)
  and a 1-year Savings Plan, with exact `ap-south-1` prices.
