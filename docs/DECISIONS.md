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
| [D-26](#d-26-plain-manifests--kustomize-for-the-app) | Plain manifests + Kustomize for the app | 7c |
| [D-27](#d-27-deploy-through-ssm-not-the-kubernetes-api) | Deploy through SSM, not the Kubernetes API | 7c |
| [D-28](#d-28-image-in-ghcr-tagged-with-the-commit-sha) | Image in GHCR, tagged with the commit SHA | 7c |
| [D-29](#d-29-cert-manager-staging-first) | cert-manager, staging first | 7c |
| [D-30](#d-30-redirects-and-security-headers) | Redirects and security headers | 7c |
| [D-31](#d-31-pod-hardening-and-sizing) | Pod hardening and sizing | 7c |
| [D-32](#d-32-looping-animations-only-on-the-compositor) | Looping animations only on the compositor | 7c |
| [D-33](#d-33-warm-up-the-shaders-the-intro-really-uses) | Warm up the shaders the intro really uses | 7c |
| [D-34](#d-34-boot-ends-when-the-files-are-downloaded) | Boot ends when the files are downloaded | 7c |
| [D-35](#d-35-measure-frame-rate-with-a-scripted-browser) | Measure frame rate with a scripted browser | 7c |

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
- **Measured again (2026-10-13, site live):** 1386 Mi of 1.9 GiB used (72%), ~467 MB available.
  The two site pods use ~45 Mi each; most of the memory is k3s itself and the system add-ons
  (cert-manager ~78 Mi in three pods, Traefik 30 Mi, metrics-server 22 Mi).
- **Revisit when:** memory pressure or OOM kills show up, or a second app (e.g. the Car Rental
  phase) needs room. Also to evaluate (Phase 8): t4g.small (Graviton, arm64 image built in CI)
  and a 1-year Savings Plan, with exact `ap-south-1` prices.

### D-26 Plain manifests + Kustomize for the app

- **Options:** a Helm chart for the site; plain YAML with Kustomize (built into kubectl).
- **Choice:** plain manifests + Kustomize for the site (`deploy/k8s/app`); third-party software
  (cert-manager) through k3s' built-in Helm controller (`HelmChart` object), pinned to v1.21.2.
- **Why:** one environment and one app don't need templating; plain YAML is easier to read and
  review. The only per-deploy value is the image tag, which Kustomize sets.

### D-27 Deploy through SSM, not the Kubernetes API

- **Options:** open 6443 (or tunnel it) and use kubectl remotely; a GitOps agent on the cluster
  (Argo CD / Flux, extra memory on a 2 GiB node); send the manifests through SSM Run Command.
- **Choice:** `scripts/k8s-apply.sh` renders locally and applies on the node via SSM; the same
  script will run in CI (7d) with an OIDC role.
- **Why:** no new open port, no kubeconfig leaves the server, every deploy is an AWS-logged
  command, and nothing extra runs on the node. `DRY_RUN=1` gives a server-side check first.

### D-28 Image in GHCR, tagged with the commit SHA

- **Options:** ECR (per-GB storage, the node would need ECR pull rights); GHCR.
- **Choice:** GHCR, built by GitHub Actions with the workflow's `GITHUB_TOKEN`; tag = full commit
  SHA (no `latest`); actions pinned to commit SHAs. The repository is private, the **package is
  public**.
- **Why:** no registry cost, no personal access token anywhere, no pull secret on the server. The
  image only holds the built site, which is public anyway. An immutable SHA tag means a deploy
  always runs exactly the commit it names, and rollback = deploy an older SHA.

### D-29 cert-manager, staging first

- **Options:** Traefik's built-in ACME client (stores certificates in a file, needs a persistent
  volume); cert-manager (stores them as Kubernetes Secrets).
- **Choice:** cert-manager with HTTP-01 through Traefik. Staging certificate first, production
  only after staging was Ready; staging cert and secret deleted afterwards.
- **Why:** the standard Kubernetes way, no volume to manage, automatic renewal. Staging proves
  DNS, port 80 and the challenge route without spending production rate limits. Measured: both
  issued in under 40 s.

### D-30 Redirects and security headers

- **Choice:** `www` → apex and HTTP → HTTPS as 301s in Traefik middlewares (www in one hop, path
  and query kept). HSTS 1 year **without** `includeSubDomains`/preload; `nosniff`, `DENY`
  framing, `strict-origin-when-cross-origin`. No CSP yet.
- **Why:** one canonical URL for search engines. `includeSubDomains` would force HTTPS on future
  subdomains (Phase 9) before they have certificates. A CSP needs the inline boot script and
  JSON-LD hashed first; it's a separate change.

### D-31 Pod hardening and sizing

- **Choice:** uid 1000, read-only root filesystem, all capabilities dropped, no service-account
  token, "restricted" Pod Security Standard on the namespace; `/tmp` and `.next/cache` as small
  `emptyDir`s. Memory request 96 Mi / limit 256 Mi, CPU request 50m, no CPU limit. HPA 2–3 pods
  at 70% CPU; PDB `minAvailable: 1`; NetworkPolicy: only Traefik may reach port 3000. Rolling
  update `maxSurge 1 / maxUnavailable 0` plus a 5 s pre-stop pause.
- **Why:** a compromised pod can't write to its own image, gain privileges or talk to the
  Kubernetes API. Requests match measured use (~45–60 Mi per pod) so the scheduler's view of the
  2 GiB node is honest; no CPU limit because throttling hurts latency more than it protects on a
  dedicated node. The max of 3 pods is set by memory (D-25), not CPU.

### D-32 Looping animations only on the compositor

- **Context:** the live site stuttered while scrolling (35–46 fps). A trace showed the GPU process
  ~60% busy re-rasterizing page content, not the 3D scene.
- **Cause:** the fixed full-viewport grid animated `background-position` (under a CSS mask), so
  the whole viewport was repainted every frame on every part of the page; status dots pulsed
  `box-shadow`; pipeline stripes animated `background-position` on all five cells.
- **Choice:** every looping animation moves only `transform`/`opacity`: the grid is painted once on
  a layer one cell larger than the viewport and drifts by transform, its radial mask became a
  static background-coloured overlay (same pixels); the dot halo is a scaling `::after` ring; the
  stripes are their own layer, only in running cells.
- **Measured (scroll hero → cards → pipeline):** grid running 35–46 fps vs paused 57–58.5. Glass
  blur and the grid drift together cost ≤ ~3 fps more: kept for the design.

### D-33 Warm up the shaders the intro really uses

- **Context:** ~245 shader program checks (2.3–2.9 s) right when the intro started, although a
  boot-time warm-up existed.
- **Cause 1:** three.js builds a different program for a render target (linear output) than for
  the canvas (sRGB). The warm-up compiled for the canvas, but the scene renders into the bloom
  composer's target, so nearly everything compiled twice.
- **Cause 2:** a light inside a hidden group isn't counted. The container's and the whale's point
  lights sat in groups hidden until they appear, so the light count changed mid-intro and every
  lit shader on screen recompiled (184 ms + 160 ms). The whale-silhouette pass renders with only
  its own layer (no lights) and was warmed with all lights, so it compiled at the start of the drop.
- **Choice:** compile each program for the target and camera layers it is really drawn with; hide
  only the models, never the groups holding lights (they fade with intensity instead).
- **Measured:** visible intro 49 → 58–59 fps, no compiles while the 3D is on screen; drop: 0.

### D-34 Boot ends when the files are downloaded

- **Context:** the boot waited for "scene ready" (every shader compiled + first frame), which never
  came within its 2.9 s cap, so every visitor saw `[ WARN ] still pulling`.
- **Choice:** finish on "every file downloaded" (`[ OK ] pulled 4 layers` → `… Running`); shader
  warm-up continues behind the fade while the static cluster shows; the 3D intro starts on its
  first rendered frame. A software-GPU failure is still reported first.
- **Measured:** boot ends with `[ OK ]` at 2.0–2.4 s on every run (live and local).
- **Still open:** the boot screen itself freezes ~0.7–1.1 s on a cold driver cache (first shader
  compile, here the environment map's PMREM, plus loading the 3D code). Candidate: a precomputed
  environment map.

### D-35 Measure frame rate with a scripted browser

- **Choice:** `scripts/perf/trace.mjs` drives a separate Chrome (fresh profile, no extensions) over
  the DevTools protocol through intro, idle + cursor, drop and pipeline, and reports fps, dropped
  frames, long animation frames with script attribution, slow WebGL calls with the shader name,
  and optionally a DevTools trace. No dependencies (Node's built-in WebSocket).
- **Why:** repeatable before/after numbers on the real site. Lessons: tracing itself costs frames
  (use `--trace=0` for fps); compare alternating A/B rounds, single runs are noisy on a laptop.
