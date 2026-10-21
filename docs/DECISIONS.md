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
| [D-36](#d-36-keyless-deploys-oidc-role-scoped-to-the-production-environment) | Keyless deploys: OIDC role scoped to the production environment | 7d |
| [D-37](#d-37-pipeline-shape-scan-the-image-you-push) | Pipeline shape: scan the image you push | 7d |
| [D-38](#d-38-footer-data-from-the-build-the-deploy-and-the-pod) | Footer data from the build, the deploy and the pod | 7e |
| [D-39](#d-39-protect-main-without-required-status-checks) | Protect main without required status checks | 7e |

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

### D-36 Keyless deploys: OIDC role scoped to the production environment

- **Options:** an IAM user with access keys stored as GitHub secrets; GitHub OIDC with a role.
- **Choice:** GitHub OIDC → role `devops-portfolio-github-deploy` (1-hour sessions). The trust
  policy accepts exactly `repo:chetan080808@203205241/devops-portfolio@1408806533:environment:production`
  with audience `sts.amazonaws.com`; the `production` environment only accepts the `main` branch.
- **Why:** no long-lived credentials to leak or rotate. Scoping to the environment (instead of a
  branch ref) means GitHub enforces the branch rule before a token is issued.
- **Found on the first deploy:** GitHub issues this repository's `sub` with the immutable account
  and repository IDs (`owner@id/repo@id`). The name-only condition never matched; CloudTrail showed
  the exact claim. Matching the IDs is also stricter: a re-created account or repository with the
  same name can't use the role.
- **Trade-off:** the role may send `AWS-RunShellScript` to the node, so anything that can deploy can
  run commands as root there. Planned (Phase 8): a custom SSM document that only runs the deploy
  with a validated image-tag parameter, and `ssm:SendCommand` restricted to it.

### D-37 Pipeline shape: scan the image you push

- **Choice:** `lint` (with `next typegen`) → `build` (into the runner's Docker) → Trivy on that
  image (fail on fixable HIGH/CRITICAL) → `docker push` of the same image → `deploy` in
  `production` → smoke test that the site serves `?dpl=<SHA>`. Pull requests stop after the scan.
  Actions pinned to commit SHAs (releases ≥ 2 weeks old); deploy skipped while the role variable is
  missing.
- **Why:** pushing a rebuild after the scan could ship bytes that were never scanned; a health check
  alone can't tell an old pod from the new release; tags can be moved, commit SHAs can't.
- **Found on the first run:** `tsc` failed in CI but not locally: Next generates global types
  (`LayoutProps`) into `.next/types`, which a fresh checkout doesn't have. Fixed with
  `next typegen` before the type-check.
- **Measured:** push to live in ~3.5 min (lint 37 s, build + scan + push 118 s, deploy 37 s).

### D-38 Footer data from the build, the deploy and the pod

- **Context:** the footer showed placeholders ("passing", "3/3 pods", "v0.1.0"), against D-02.
- **Choice:** build values (run, commit) as Docker build args rendered into the static HTML;
  deploy values (image, deploy time) set by `k8s-apply.sh` as env vars; the serving pod from the
  downward API, read per request through `/api/build-info`. No pod count: it would need
  Kubernetes API access from the app, which the pods deliberately don't have (D-31).
- **Why:** each value comes from the one place that knows it; the page stays static; unknown
  values say so. Stamping the deploy time also rolls the pods on every deploy, which is the
  behaviour we want anyway.

### D-39 Protect main without required status checks

- **Choice:** GitHub ruleset `protect-main` on the default branch: **restrict deletions** and
  **block force pushes**. Status checks are **not** required on `main`.
- **Why:** commits go straight to `main` (one maintainer, no pull-request flow); required checks
  would reject every direct push. The pipeline already blocks bad releases: if `lint` or `build`
  (including the Trivy scan) fails, nothing is pushed or deployed, and the live site keeps the
  previous release. Blocking force pushes protects the rewritten public history.
- **Revisit when:** someone else contributes, or work moves to pull requests; then require `lint`
  and `build` and a pull request before merging.

### D-40 Boot on slow phones: CSS-timed log, a safety net, and a real exit transition

- **Context:** at 4× CPU throttling the boot screen sat 10–18 s with an empty log: every line
  waited for React to hydrate. The old exit was a plain fade.
- **Options:** keep the React timeline and accept the wait; render the fixed lines on a CSS clock
  from first paint; skip the boot on slow devices.
- **Choice:** the command and the four fixed log lines are CSS-timed from first paint; React only
  adds the `[ OK ]` lines (and waits until the last CSS line is visible, so nothing jumps ahead).
  The pre-paint gate script plays the exit itself if React hasn't taken over 4.5 s after first
  paint. The exit is a transform/opacity transition: **doors** (two halves swing open, default) or
  **crt** (collapse to a line, then a dot) via `?transition=`; reduced motion fades, Skip fades
  fast. The 3D render loop starts only after the exit, so the exit has the GPU to itself.
- **Measured (local prod build, 390 px):** 1× CPU boot ends at ~2.0 s, exit 640 ms; 4× CPU all
  lines visible by ~2.7 s, the safety net exits at 4.9 s (was 10–18 s). Desktop 1280: exit
  623–645 ms in 5 of 7 runs; 2 runs had one long frame (150 / 868 ms), the known cold-start freeze
  (D-34) landing in the exit.
- **Resolved by D-42:** CRT power-off kept, doors removed.

### D-41 Phones: the 3D loads during the boot (replaces "5 s after load")

- **Context:** since ecd983e capable phones ended the boot at once on the still and started the
  3D 5 s after load at a quiet moment; the intro then played over the still, late. The owner
  wants the phone to feel like the desktop: boot, then the intro.
- **Choice:** capable phones (≥ 4 GB / 4 cores, no Save-Data / 2G) with the boot running load
  the 3D at hydration; the boot waits for the whole warm-up (`sceneReady`), hard limit 8 s from
  first paint, then the intro plays right after the exit. Past the limit (or Skip, or no boot) the
  still shows and the 3D replaces it later in the settled pose (`introSettled`: the intro clock
  starts at its end), never replaying the intro. The boot stays visibly alive: the live line
  goes `pulling … n/4 layers` → `compiling shaders n%`, the progress bar includes the warm-up
  (chunk 15 / models 45 / shaders 40 %), and a compositor-only sweep + cursor keep moving while
  the main thread is busy. Boot-skipped visits keep the old 5 s / quiet-moment start.
- **Measured (local prod build, CDP phone 390×844, deviceMemory 8, 8 cores):**
  - 1× CPU: boot ends 5.6 s after first paint, intro 57 fps (one 150 ms frame).
  - 2× CPU: 5.5–6.2 s, intro 56 fps (one 184–217 ms frame at its start).
  - 4× CPU: the 8 s limit always hits (exit at ~8.6 s); 3D swaps in settled at 11.6–15.8 s.
  - Mobile Lighthouse: 48–62 Perf (TBT 4.3–8.7 s, LCP 3.3–6.1 s) vs 72–87 with the old flow
    (live ee8331b: TBT 0.3–0.7 s); A11y / BP / SEO 100 both. The cost is the 3D start-up
    inside Lighthouse's window (4× CPU), as measured for the rejected first-interaction trigger.
- **Trade-off accepted by the owner:** a lower mobile Lighthouse score for the intro on phones.
  Revert = `bootWaits3d` false (HeroStage `loadInBoot`).

### D-42 Boot exit: CRT power-off only

- **Context:** D-40 shipped two exits behind `?transition=` (doors default, crt) for the owner to
  compare on a real phone, together with the D-41 "boot until the 3D is ready" flow.
- **Options:** doors (two halves swing open in 3D perspective); CRT power-off (the screen collapses
  to a bright line, then a dot, then black, then the site); keep both behind the switch.
- **Choice:** CRT only, now the default. Removed: the `?transition=` switch in the gate script,
  the two door halves (the boot screen is rendered once again instead of twice), their keyframes
  and the overlay perspective. Reduced motion still fades, Skip still fades fast.
- **Why:** on the owner's phone the CRT exit is the smoother one, and the intro starts right
  after it with no still and no replay (D-41 confirmed on a real device). One variant = no
  duplicated screen in the DOM and no dead CSS.

### D-43 M3 phones: pipeline runs by row, 2-column dashboard, real tool logos

- **Context:** on phones the pipeline was a static list (final state; the run existed only on
  desktop, pinned), the dashboard was one long column, and the sections had desktop spacing.
- **Pipeline options:** pin + scrub like desktop; drive the run from where the rows are.
- **Choice:** no pin on phones (a pin fights the mobile toolbar resize and traps the swipe). Stage i
  starts running when its node crosses a reading line at 62% of the viewport and passes when the
  next node crosses (`runAt` in PipelineScroll, interpolated between node centres); a green fill
  grows down the rail with the same position (scaleY, compositor-only). Same `pipelineRun.t` +
  `applyRun` as desktop, so header count, nodes and the (hidden) Stage View never disagree.
  Reduced motion / no JS: final state, rail fully green.
- **Dashboard:** 2 columns from 0 px (wide panels span both, 4 columns from lg); panels compact on
  phones (smaller padding, numbers 1.7rem, captions 0.66rem). Tag chips show the real logo of each
  tool / AWS service as a monochrome icon tinted with the panel accent, brand colour on hover; no
  icon → dot. Owner decision: logos may show which tools are used; "no official logos" covers only
  the site's own designs.
- **Icon delivery options:** inline SVG paths (60 KB raw / 22 KB gzip, repeated in the HTML and the
  RSC payload) vs one sprite. **Choice:** one cached sprite `public/icons/brands.svg` (22 KB gzip,
  one request, outside the HTML), built by `scripts/icons/build-brand-icons.mjs` from Simple Icons
  16.35.0 (pinned) and the official AWS Architecture Icons package (16 px glyph only). Credits in
  ASSETS.md (Jenkins logo is CC BY-SA 3.0).
- **Spacing (phones):** sections py-11 (was 14), header gap mb-7 (was 10), Jenkins header and
  stage list padding reduced.
- **Checked (local prod, CDP phone 360×780):** run states at 3 scroll positions (0/4 queued →
  Build running → 2/4 passed, Deploy running), dashboard rows pair up, no horizontal overflow.

### D-44 Skill tiles with exact logos (replaces D-43's chips)

- **Context:** on the owner's phone several logos were broken (Docker empty, Kubernetes and
  PostgreSQL specks, GitHub Actions two dashes, MySQL squashed, Grafana / Prometheus / Jenkins
  without detail), and the chips' 14 px icons were too small.
- **Cause:** the generator rounded numbers with a regex. SVG arc commands pack their two one-digit
  flags against the next number (`a.19.19 0 00.19-.19` = flags 0, 0, then x .19); the regex read
  `00.19` as one number, so every arc lost its flags and the following arguments shifted.
- **Fix:** a command-aware path parser (`roundPath`: arity per command, arc flags read as single
  characters), 3 decimals (2 decimals still changed Grafana's fine detail by 0.7% of pixels).
  New `scripts/icons/verify-brand-icons.mjs` rasterises every sprite symbol and its original file
  at 96 px in headless Chrome and compares pixels: all 34 match (≤ 0.04% anti-aliasing).
- **Layout:** skill tiles, logo (28 / 32 px) above the name; 4 per row on phones, 6 / 8 / 7
  (sm / md / lg). Monochrome in the panel accent (cyan AWS, violet Toolbox); hover (pointer
  devices only) or a tap (touch: `data-flash` for 1.4 s, TileFlash) shows the brand colours: tools
  in their brand colour (white if too dark for the background, luminance < 0.03), AWS services as
  the original icon (white glyph on the category-coloured tile, `--tile` custom property inherited
  into the `<use>` shadow tree). Docker Compose → Docker logo, Boto3 → Python logo; no dots.
  Long names wrap only at camel-case joints (`<wbr>`: "Cloud|Formation").
- **Cost:** sprite 26.5 KB gzip (was 22 KB with the broken rounding); phone dashboard ~1.8k px at
  360 (tile panels 434 px each before the final padding trim).

### D-45 M4 mobile review: findings and fixes

- **Method:** scripted review of the live site (CDP, fresh profile) at 360×780 and 390×844 (touch,
  coarse pointer, 4× CPU), 768×1024 (touch, 2× CPU), 1280×800 and 1440×900: horizontal overflow,
  elements past the right edge, clipped text, tap targets < 24 px (and < 44 px), text < 10.5 px,
  console errors, boot time, frame gaps during a full-page scroll gesture, plus a screenshot of
  every viewport-height of every section. Result: no horizontal overflow, no console output.
- **Fixed:** section command lines wrapped at 360 / 390 (decorative rule hidden below sm, label on
  one line); desktop dashboard stat panels stretched to a tile panel's height (lg zigzag: tile
  panels take 3 of 4 columns with 10 tiles per row next to one stat, text panels take 2); project
  card names cut off (`deploy/car-rental-k…`: now wrap at "/" and "-"); touch targets under 24 px
  (chaos button, footer run / commit / view-source links, navbar logo: larger hit areas, same
  look); ~250 px of empty terminal history on phones (11.5 rem below sm); text under 11 px on
  phones (tile names, PARALLEL label → 0.68 rem); pipeline graph subtitle cut off at md+ (2 lines);
  footer pod name cut off on desktop (wraps).
- **Not changed:** `docker inspect` (17 px tall, but its hit area is the whole card); targets of
  24–43 px (terminal chips, menu, carousel dots, stage rows) meet WCAG 2.2 AA (24 px); the lone
  third card at 768 px; boot 9.3–10 s at 4× CPU (D-41 cap). Scroll frame rate measured 34–42 fps
  on throttled phones and 37 fps with up-to-650 ms frames on desktop while only ~650 MB RAM was
  free; earlier clean runs gave 54–58 fps: re-measure on a quiet machine before acting.

### D-46 Panels without backdrop blur (scroll performance)

- **Context:** after M4, desktop scrolling measured 35–47 fps with single frames of 300–550 ms,
  also with enough free memory, and in sections without 3D. A static control page scrolled by the
  same synthetic gesture held 60 fps, and almost no slow frame had a main-thread long task: the
  cost was painting / compositing.
- **A/B (live, 1280×800, CSS injected per variant, 2 rounds):** baseline 40–42 fps; panel blur off
  51–58 fps; background animation off 43–49 fps; both off 53–59 fps.
- **Cause:** every `glass` panel had `backdrop-filter: blur(14px)`. Behind the panels is the fixed,
  always-moving background (drifting grid, rising particles), so each visible panel's blur was
  recomputed every frame, and more panels are on screen while scrolling.
- **Choice:** `glass` keeps its tint and 1 px border but no blur; the tint is a little denser
  (0.78 / 0.74 instead of 0.6 / 0.55). Over the near-black page the blur was barely visible. The
  navbar keeps its own blur once scrolled (one element). Dialogs are 90–95% opaque anyway.
- **Result (live):** desktop 57–58 fps, worst frame 50–67 ms (same runs with the old blur injected:
  47–49 fps, 317–367 ms). Phones at 4× CPU unchanged at 39–42 fps (CPU-bound there).
- **Also in this round:** at 768 px the odd last project card is centred at card width (a
  full-row card would be twice as wide as its neighbours); Car Rental Portal status "Completed".

### D-47 Deploy through a dedicated SSM Command document (least privilege)

- **Context:** the GitHub deploy role could `ssm:SendCommand` with `AWS-RunShellScript` to the node:
  whoever controlled a production workflow run could run any shell command as root (D-36).
- **Options:** keep RunShellScript and trust the workflow; a document that only sets the image
  (`kubectl set image`, manifests applied by an admin); a document that deploys "the repository
  at commit X" with the commit as its only input.
- **Choice:** the last. `devops-portfolio-deploy` (Terraform, `ssm-deploy.tf`), one parameter
  `ImageTag` with `allowedPattern ^[0-9a-f]{40}$`: SSM rejects anything else before the node sees
  it (verified: a tag with shell syntax returns InvalidParameters). Fixed script
  (`deploy-document.sh`): the commit must be on main (GitHub compare API: `ahead` / `identical`;
  fork commits are reachable through the parent repository and come back `diverged`), the
  manifests come from that commit (codeload tarball, python3 writes only plain files of
  `deploy/k8s/app/`), kustomize, image tag + deploy time, apply, rollout status. The role's
  `ssm:SendCommand` covers only this document and the node. `scripts/deploy-ssm.sh` replaces
  `k8s-apply.sh` in the workflow; `k8s-apply.sh` stays for admin use with the SSO profile.
- **Why not "set image" only:** manifest changes would no longer ship through the pipeline and the
  cluster could drift from the repository. Here the pipeline still applies the manifests, but only
  ones that exist on main.
- **Trade-offs:** a deploy now depends on api.github.com and codeload.github.com (unauthenticated
  API limit 60 requests / hour per IP; one per deploy). The role can still roll the site back to
  any older commit of main, which is a deploy, not code execution.
- **Verified:** terraform plan (1 add, 1 change) shown and approved; run #17 (20a42ca) deployed via
  the document ("commit ... is on main (identical)", rollout complete), smoke test green.

### D-48 Build Now: replay the pipeline with a streaming console (Phase 8)

- **Context:** first Phase 8 item. A Jenkins-style "Build Now" in the job header replays the run
  and streams its console. Must keep 60 fps, respect reduced motion, work on phones, and must not
  break the desktop pin (the job is pinned by ScrollTrigger while the scroll runs the stages).
- **Options for the console:** a modal (hides the stages it is supposed to show running); a
  floating panel (covers the Stage View on a 1280x495 laptop); inside the job card.
- **Choice:** inside the card, without ever changing the job's height on md+: lg+ a right-hand
  column next to graph + Stage View (the left side narrows; Stage View duration cells truncate so
  row heights stay fixed); md-lg over the Stage View; phones in the flow below the stage list (no
  pin there), followed by `ScrollTrigger.refresh()` and a scroll into view.
- **Run driver:** one rAF loop (`jenkins/BuildConsole.tsx`) walks `pipelineRun.t` along a timed
  script (`buildScript` / `scriptT` in model.ts, ~6.5 s) and calls the existing `applyRun`, so
  header, graph, Stage View and phone rail stay in sync as with scrolling. Per frame: attribute
  writes only when a status changes, one transform (phone rail; node positions measured once),
  and a React update only when a new log line appears. Step capped at 50 ms (a hidden tab pauses
  the build). Log content = the per-stage console lines from site.ts; "Started by user anonymous"
  (the visitor); the current stage's block stays open and the log ends "Running...".
- **Scroll vs build:** `pipelineRun.manual` - after a Build Now the build owns the states for the
  rest of the visit; scrolling back through the pin no longer resets stages to queued.
- **Reduced motion:** final states and the full log at once. The button uses `aria-disabled`
  while building (a disabled button drops keyboard focus); closing the console returns focus to it.
- **Measured (local prod build):** 1280x495 pinned mid-run: 60 fps, p95 17.2 ms, job height
  386 -> 386, no scroll jump; 390x760 phone: 59 fps, p95 17.1 ms, one 133 ms frame at open (the
  ScrollTrigger refresh), rail fill follows the stages. Tablet (1000 px): console has ~4 lines
  (the Stage View's area); acceptable, the graph above shows the run.
- **Bug found:** at md-lg the console started 20 px low: the graph's top margin collapsed through
  the wrapper, so the 200 px offset was measured from the wrong edge. Fixed with `flow-root`.

### D-49 Plain-language layer for non-technical visitors

- **Context:** feedback that recruiters / HR don't understand parts of the site. Keep the DevOps
  style, add plain language next to it. Wording approved by the owner before building; all of it
  lives in `site.ts` (`sections`, `chaos`, `terminal`, `pipeline.intro/legend/stageHint/buildHint`,
  `Milestone.plainTitle`, `parallel.plainLabel`, `hero.scrollHint`, `boot.plainLine`).
- **Choices:**
  - Pipeline: the plain step name ("Education", "DevOps Engineer — current") is the main label;
    the Jenkins stage name is the small mono label under it. Stage View columns stay technical
    (narrow cells; it is the Jenkins detail view). Legend (completed / current / "not started" only
    while a stage is queued: `applyRun` toggles `data-queued` on the job) sits bottom-left of the
    graph beside the branch row, so the pinned job grows only 10 px (branch row moved down 10 px so
    two-line plain labels clear it): 396 px at 1280x495, still inside the pin.
  - "Click" vs "Tap": `ui/PointerText.tsx` renders both and CSS `pointer: coarse` picks one, so
    the server HTML is right without a flash.
  - Chaos Monkey: "Simulate a server crash" + "Watch the system heal itself". The note sits inline
    on desktop: as a second row it pushed the status row up into the 3D cluster on short screens.
    The run summary uses the real timeline (3 servers / 4.1 s desktop, 2 / 3.7 s phones); its 3
    lines are reserved from the start so the log box (and the area the whale avoids) never resizes;
    the log lingers 6 s instead of 3.2 s so it can be read.
  - Terminal: placeholder + blinking block (only while empty and unfocused); phones show the short
    prompt `~$` so the placeholder fits at 360 px; "Try:" before the chips; `whoami` auto-typed once
    when 60% of the terminal is in view (60 ms/char), never focusing or scrolling, cancelled by
    any input; reduced motion runs it without typing.
  - Boot: "Loading Chetan's portfolio…" is inside `[data-boot-screen]`, so it leaves with the CRT
    power-off, never on its own. Verified: transition `crt`, `boot-crt` on the screen (leaving ->
    done 630 ms), no animation on the line itself.
- **Tablet console (follow-up to D-48):** at 768-1023 px the build console starts 110 px into the
  graph block (4 px below the main row's labels) and covers the branch row too: 8.4 log lines
  (was ~4), solid background (the branch node showed through at 95%).
- **Measured (local prod build):** Build Now 60 fps at 1280x495 and at 360 px (p95 17.0-17.2 ms);
  no horizontal overflow at 360; job height unchanged by the console at 800 / 1000 / 1280.

### D-50 Build numbers, crash pill, post-process AA, terminal pacing, HSTS on www

- **Build numbers:** the career run is build #n (n = milestones); every Build Now press is the next
  number for the browser session (`jenkins/buildNumber.ts`, sessionStorage `pf-build-number`,
  `useSyncExternalStore` with the base number as server snapshot, so no hydration mismatch). Shown
  in the job header, the Stage View build cell, the console header and the log's
  `Start of Pipeline (… #n)` line. Verified #4 -> #5 -> #6 in all four places.
- **Crash button:** an outlined amber pill with a warning triangle (amber = "try this", not red =
  error), glow pulse every 4.2 s on its own layer (WAAPI opacity only, compositor work) until the
  first press (sessionStorage `pf-chaos-tried`); no pulse with reduced motion; 44 px hit area.
  **Placement bug found:** at 1280x495 the fixed 3D canvas drew the cluster over the bigger pill
  (it already overlapped the old button). On lg+ the stage is now 3rem shorter
  (`calc(100svh-10.5rem)`, min 19rem) and the status row sits just below it (`top-full`), where
  heroMaskPass already hides the canvas, so the cluster can never cover it. Below lg unchanged
  (row inside the stage; 360 px: pill on its own row, clear of the nodes).
- **AA (the whale flicker):** the composer has no MSAA (it halved the fps at 1920x1080, Phase 6),
  so thin neon edges crawled while moving. Options measured at 1920x1080 (local prod build,
  `scripts/perf/trace.mjs --trace=0 --size=1920x1080`, alternating rounds, noisy machine with
  ~600-900 MB free RAM): idle fps no AA ~58.8, FXAA ~58, SMAA ~52 (SMAA also lower while
  scrolling). **Choice: FXAA** (one pass, after OutputPass so it works on the display image,
  before the hero mask). `?aa=off|fxaa|smaa` stays as an A/B switch. Visual: fin and edge lines are
  smoother; the minis' fine detail is slightly softer. Limitation: bloom is still computed from
  the non-anti-aliased image, so a little halo shimmer can remain. Desktop 1280x495 idle after the
  change: 59.9 fps, p95 16.8 ms.
- **Other flicker causes checked:** a coplanar-overlap scan of all GLBs (same-facing triangles
  within 2 mm, true 2D overlap test) found only duplicate faces of the same material (invisible)
  and 0.5 mm gaps (door vs frame, whale edge highlight), ~5x the depth precision at the hero
  distance (near 0.1 / far 60 -> ~0.1 mm at 13 units). No z-fighting between different surfaces.
- **Terminal pacing:** `whoami` starts only when the whole terminal is visible below the navbar
  (4% slack for short screens where it only just fits), the cursor blinks 600 ms with the
  placeholder hidden, then 130 ms per character with a cursor that follows the text (positioned in
  `ch`, matches the text end exactly at 360 px), 450 ms, Enter. Still no focus or scroll; any key,
  input or chip tap cancels it.
- **"Not secure" report:** server side verified clean: http apex/www -> 301 to https apex, valid
  Let's Encrypt cert (apex + www, to 2027-01-11), HSTS one year, 0 http:// resources (HTML, chunks,
  and all 17 runtime requests on a full scroll of the live page). One gap fixed: the www -> apex
  redirect over HTTPS skipped the security-headers middleware (a redirect ends the chain), so it
  had no HSTS; headers now run first. The browser warning is most likely state in that Chrome
  profile (e.g. a certificate exception from before the production cert).

### D-51 Phase 8 polish batch: living cards, real dashboard refresh, typed commands, hire-me whale

- **Living project cards:** each landed container gets a status LED in its status colour (green
  Running, cyan Completed), steady with a quick double blink every 2.6 s (`led-blink`, opacity
  only). Desktop shows 3D minis, so the LED is 3D there too: an unlit dot + additive halo sprite on
  the roof corner in MiniDrop's overlay scene (no bloom in that pass), visible only once landed,
  blinking on the same curve. Hover: the landed mini lifts 7 px and turns 0.16 rad / tilts
  (damped), read from the card's `:hover` each frame. 2D container (phones, tablets, reduced
  motion): the same LED, and an inner wrapper lifts 6 px / turns 2 deg on hover or press / tap
  (`[data-mini-art]` itself is animated by MiniDropScroll on phones, so it can't carry the hover
  transform). Precompile now also warms sprites. Reduced motion: steady LED, no lift (and no 3D
  minis at all, as before).
- **Dashboard "refresh 30s" is real:** `RefreshBar` re-checks the live server (`/api/healthz`,
  no-store) every 30 s while the dashboard is on screen and the tab visible; "updated Ns ago"
  ticks from the last successful check; the live dot pulses green, or amber with "server
  unreachable · retrying" when a check fails. No panel value changes. Options rejected: a timer
  that only resets the label (that would claim a refresh that never happened).
- **Section command lines** type themselves once (250 ms pause, 38 ms/char, cursor) when they
  first scroll into view (`ui/TypedCommand.tsx`). Server HTML and hydration show the full line;
  only lines still below the viewport at hydration are emptied, so nothing visible flashes.
  Screen readers always get the full text (sr-only copy). Reduced motion: full line.
- **`sudo hire-me`:** the engine returns `action: "whale"`; `lib/hireMe.ts` (tiny emitter) reaches
  `easter-eggs/HireMeWhale.tsx` in the Contact section: an original inline-SVG whale (faceted body,
  blunt head, horizontal flukes, three containers on its back) swims through the terminal's screen
  across the whole section (7.6 s desktop, 5.6 s phones), WAAPI transform only, tail flick, clipped
  to the section, pointer-events none. Reduced motion: fades in and out over the terminal
  (opacity only, 2.6 s). First draft read as a fish (vertical forked tail, pointed head) -> redrawn.
- **Measured (local prod build, 1280x495):** cards landed + LEDs idle 59.9 fps (p95 16.9 ms);
  scroll through drop / landing both ways 59.2-59.4 fps (p95 16.9); whale swim 59.2-59.3 fps
  (p95 17.1). 360 px: LED blinking, card lift 6 px / 2 deg, refresh bar on one line, command line
  fits (no truncation), whale crosses the terminal, no horizontal overflow. Reduced motion checked
  with an emulated Chrome (CDP `setEmulatedMedia`).

### D-52 Baked environment map, and a still that the 3D takes over from exactly

- **Boot freeze (first visits):** measured with `scripts/perf/trace.mjs` (fresh profile, local prod
  build): the longest boot frame was 634-1051 ms, of which 630-1040 ms was one shader program,
  `PMREMGGXConvolution` (the environment map's blur, compiled at runtime by drei `<Environment>`).
  **Choice:** bake the environment once (`scripts/bake-env.mjs`: the page, opened with `?bake-env`,
  builds it the old way and exposes the PMREM result; stored as a 336x256 sRGB PNG in three's
  cube-UV layout, 19.5 KB, scale 1.2 in `envBake.ts`) and use the PNG directly as
  `scene.environment` with `CubeUVReflectionMapping`: three passes cube-UV textures straight
  through, so no cube camera and no PMREM shaders run. Rejected: an equirect/HDR file (PMREM would
  still convert it at runtime).
  **After:** shader waits in the boot 1-3 ms (was 630-1040 ms); longest boot frame 150-720 ms,
  now the 3D chunk's evaluation + WebGL context creation (varies run to run).
  **Lighthouse desktop (local prod, 5 runs each):** before Perf 66 (every run), TBT 967-1046 ms;
  after Perf 80-93 (median 90), TBT 187-418 ms (median 221); A11y / BP / SEO 100; CLS 0.009.
- **Still -> 3D handoff:** the placeholder (the SVG cluster on desktop, a capture taken 12 s into
  the idle on phones) never matched the 3D, which then rebuilt from empty (intro) or jumped.
  **Choice:** the still IS the 3D's first visible frame of a settled start, and whenever the still
  has been on screen the 3D starts settled (`introSettled`) on exactly that frame.
  - Capture: `?still` capture mode starts settled and stops at the first visible frame, reading
    the canvas pixels raw in that frame (`scripts/capture-hero-still.mjs`). Screenshots of a
    stopped canvas were unreliable (empty after a resize).
  - Two layers per still: `-shade` (black + the canvas alpha) and `-light` (premultiplied colour,
    `mix-blend-mode: plus-lighter`): page x (1 - alpha) + colour, exactly what the canvas shows. A
    straight-alpha image clips the bloom (colour > alpha), so the glow visibly brightened at the
    switch. The layers fade one by one: an opacity < 1 wrapper isolates them (a dark square).
  - Desktop placement is pure CSS (container units) with the camera's own rule (`cameraFit.ts`:
    fixed 46 deg horizontal FOV, vertical clamped 33-50 deg) inside the frame (stage + bleed), so
    it lines up at any window size from the server HTML. Bloom spreads in screen pixels while the
    scene scales with the frame, so there is one capture per window-height band (>= 740, 590-739,
    < 590 px), each taken where the FOV is unclamped (the short band at 1024x495). Phones: 585 px
    (the canvas' own resolution at DPR 1.5), lossless.
  - When: repeat visits (boot skipped), phones (cap hit / no auto 3D / "load 3D anyway"), and a
    slow warm-up after a boot on desktop (still after 1.5 s; otherwise the intro plays on an empty
    stage as before). Once the intro clock has started the still never appears.
  - **Bugs found on the way:** (1) the canvas' very first frame is opaque and dark
    (post-processing not settled): a one-frame dark flash at every 3D start, the whole page on
    desktop. It is now wiped to transparent before it is presented (FrameGate). (2) Hiding the
    canvas until frame 2 instead left a frame with neither still nor 3D (a hidden canvas is only
    composited again on its next frame). (3) The swim cycle advanced by the raw first delta (the
    whole warm-up), so the whale's pose at takeover was random: capped like the intro clock.
    (4) The status label re-wrapped the row at 360 px when "pulling 3D layers…" became "[ OK ] 7/7
    nodes ready", moving the Chaos pill (fixed min width). (5) Reduced motion moved the whale to its
    home point: it now holds the settled pose. (6) The image optimizer kept serving an older
    capture under the same URL: the stills are served as captured.
  - **Measured** (`scripts/perf/handoff.mjs`: repeat visit, screencast, mean frame-to-frame change
    of the scene area at the switch vs. the largest change during idle motion): 1440x900 0.07-0.12
    (idle 2-3), 1920x1080 0.1, 1536x864 at DPR 1.25 0.06-0.22, 1366x680 0.5-0.6, 1280x495 1.5,
    phones 390 px 0.07-1.4, 360 px 2.3-2.4 (idle 1.4-2.7), low-end phone after "load 3D anyway"
    0.13 / 2.35, reduced motion 1440x900 0.00. Known small residue: at 360 px and very short windows
    (1280x495) the live glow is slightly stronger than the still's (resolution-dependent bloom); no
    pose change anywhere.
- Re-run both scripts whenever the lights, the scene's look, the settled pose or the framing change.

### D-53 The intro plays after every boot: the boot waits for the 3D on desktop too

- **Context:** after D-52 the whale intro never played: every visit started in the settled pose.
  Diagnosed on the live site (fresh profile, `?boot`, desktop 1440x900 and phone emulation 390 px)
  by logging the boot attribute, the still's visibility, WebGL context creation and the first draw
  call, plus screenshots after the exit. Two causes:
  1. **Hydration (every boot visit, desktop and phone):** HeroStage reads "did the boot run?" with
     `useSyncExternalStore`, whose server snapshot is `null`. The hydration render therefore
     computed `stillWanted = bootRan !== true` = true, and the effect that marks the start settled
     (`introSettled`, sticky) ran in that commit, before the client value (`true`) re-rendered.
  2. **Desktop grace rule:** the desktop boot ended when the files were downloaded; on a cold
     shader cache the warm-up took ~1.9 s more, past the 1.5 s grace, so the still stepped in.
- **Options:** keep the grace rule and only fix (1) (cold first visits on desktop still settle);
  make the desktop boot wait for the 3D like phones (D-41), with the same 8 s cap.
- **Choice:** (1) the settled decision is made only once the boot and device are known
  (`known` in HeroStage); (2) `bootWaits3d` = boot running and the 3D loading in it (desktop, or
  a capable phone); one cap `WAIT_3D_CAP_MS` = 8 s; the 1.5 s grace is gone: the still appears
  after a boot only if it ended without the 3D (the cap, Skip, or the gate's safety net).
  Repeat visits in the session keep the settled start (owner's choice, option A).
- **Measured (local prod build, probe + screenshots):** desktop cold first visit: boot exit
  3.0 -> 5.4 s, first 3D frame 30 ms after the exit, intro plays; warm 2.9 s. Phone 1x: exit
  3.8 s, intro. Phone 4x CPU: ready just before the cap (exit 8.5 s), intro. 5x: cap hit at
  8.7 s, still at once, 3D settled at 11.5 s. 6x: hydration later than the gate's 4.5 s safety
  net -> still, settled. Repeat visits: still, then settled (unchanged).
- **Lighthouse (local prod, 4 runs each, before -> after):** desktop Perf 73-88 -> 87-96
  (TBT 259-601 -> 155-301 ms, Speed Index 1459-2440 -> 794-912 ms, CLS 0.009 -> 0); mobile
  49-55 -> 45-51 (TBT 1057-1619 -> 1204-1487 ms, LCP ~6.0-6.8 s both); A11y / BP / SEO 100.
  The desktop gain is Lighthouse seeing a still boot screen during its window, not a faster
  site: the real cost is the longer desktop boot on cold first visits (+~2.4 s). Mobile loads the
  same way as before; the small drop is within run-to-run noise or the intro now rendering.
