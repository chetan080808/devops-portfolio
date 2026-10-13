# Architecture

How this portfolio goes from a `git push` to a page in your browser. Each section says what the
piece is, why it's there, and how to try it locally. The doc grows with each Phase 7 checkpoint.

```mermaid
flowchart LR
  dev[git push to main] --> gha[GitHub Actions<br/>lint → build → Trivy → push]
  gha --> ghcr[(GHCR<br/>ghcr.io/chetan080808/devops-portfolio)]
  gha -->|deploy| k3s
  subgraph aws[AWS ap-south-1]
    subgraph ec2[EC2 t3.small]
      k3s[k3s] --> ing[Ingress :80/:443] --> svc[Service] --> pods[Pods<br/>Next.js standalone]
    end
  end
  ghcr -->|image pull| pods
  user((Visitor)) -->|HTTPS| ing
```

Status: **7a–7d done**: live at https://chetannamane.com, deployed by the CI/CD pipeline on every push to main (lint → build → Trivy → push → deploy via OIDC + SSM → smoke test). Real footer data is 7e.

## 1. Container image (7a)

**What:** a `Dockerfile` with three stages.

| Stage | Does | Why |
| --- | --- | --- |
| `deps` | `npm ci` from the lockfile | Cached until `package*.json` changes, so code edits don't reinstall. |
| `builder` | `next build` with `output: "standalone"` | Next traces exactly which files the server needs and copies them to `.next/standalone`. |
| `runner` | copies only the standalone server, `.next/static`, `public/` | No source, no dev deps, no compiler: ~60 MB of app on top of Node. |

**Runtime choices**

- **Base:** `node:24.21.0-alpine3.24`, pinned to an exact tag so builds are reproducible.
- **Non-root:** runs as the image's `node` user (uid 1000). npm/npx/yarn are removed from the
  runtime image: the server never installs anything.
- **Graceful shutdown:** `CMD ["node", "server.js"]` (exec form) makes Node PID 1, so Kubernetes'
  SIGTERM reaches it directly; Next finishes in-flight requests (measured stop: 1.4 s).
- **Health:** `GET /api/healthz` → `{"status":"ok","uptime":n}`, rendered per request (never
  prerendered), used by the Docker `HEALTHCHECK` and later by Kubernetes probes.
- **Rolling updates:** the build passes the commit SHA as `GIT_SHA`; `next.config.ts` uses it as
  both the build ID and the `deploymentId`. Every pod of one release serves the same asset names,
  and a browser still running the previous release gets a full reload instead of 404ing on chunks.
- **Writable path:** only `.next/cache` (the OG image may revalidate after 30 days). With a
  read-only root filesystem in Kubernetes this becomes an `emptyDir` mount.

**Measured (2026-10-12, local Docker Desktop):** image 334 MB uncompressed / 85 MB gzipped
(242 MB of it is the Node base image); Trivy: 0 HIGH/CRITICAL fixable vulnerabilities.

**Try it**

```bash
docker build -t devops-portfolio:local --build-arg GIT_SHA=$(git rev-parse --short HEAD) .
docker run --rm -p 3200:3000 devops-portfolio:local
curl localhost:3200/api/healthz
```

## 2. Infrastructure on AWS (7b)

**What:** one EC2 server in Mumbai (`ap-south-1`) running k3s, a small but complete Kubernetes.
Everything is created by Terraform in `infra/terraform/`, in two stacks:

| Stack | Creates | Why separate |
| --- | --- | --- |
| `bootstrap` | S3 bucket for Terraform state; monthly cost budget with email alerts | The state bucket must exist before any other stack can store its state in it. Applied once. |
| `main` | VPC, subnet, internet gateway, security group, IAM role, EC2 instance, Elastic IP | The actual server. Changed whenever the infrastructure changes. |

**Terraform state:** kept in a private, encrypted, versioned S3 bucket (HTTPS only). Locking uses
S3's own lock file (`use_lockfile`), so no DynamoDB table is needed. Old state versions are kept
for 90 days, so a bad apply can be rolled back. The bucket name sits in a gitignored
`backend.hcl`: `terraform init -backend-config=backend.hcl`.

**Network:** own VPC `10.42.0.0/16` with one public subnet in one zone. There is a single server,
so more zones would only add cost. No NAT gateway, no VPC endpoints (both bill by the hour); the
server reaches the internet through the internet gateway.

**Security**

- **Inbound:** only 80 and 443. No SSH port, no Kubernetes API (6443) from the internet.
- **Outbound:** only 80 and 443 (package mirrors, image registries, AWS APIs).
- **Admin access:** AWS Systems Manager Session Manager. The server's only AWS permission is
  `AmazonSSMManagedInstanceCore`; a shell is `aws ssm start-session --target <instance-id>`,
  authenticated with AWS SSO and logged by AWS. No SSH keys exist.
- **Instance metadata:** IMDSv2 only, hop limit 1, so pods can't read the server's credentials.
- **Disk:** encrypted gp3, 20 GB. **Kubernetes secrets:** encrypted at rest (`--secrets-encryption`).

**k3s:** installed on first boot by `user-data.sh.tftpl`, pinned to `v1.36.5+k3s1` (both the
installer script and the binary). It ships Traefik (Ingress controller, listening on 80/443 through
k3s's ServiceLB) and metrics-server (feeds the HorizontalPodAutoscaler in 7c). Pods use
`10.52.0.0/16`, services `10.43.0.0/16`. Any change to the boot script rebuilds the server
(`user_data_replace_on_change`), because the script only runs once.

> **Lesson learned:** the first apply used the k3s default pod network `10.42.0.0/16`, the same
> range as the VPC. The node's own address was inside the pod network, and health checks to pods
> timed out. Fix: set `--cluster-cidr 10.52.0.0/16` and rebuild the server (1 replaced, Elastic IP
> kept). Always check that pod, service and VPC ranges don't overlap.

**Cost guardrail:** an AWS Budget of $28/month (before tax) emails at 90% actual, 100% actual and
100% forecast spend.

**Estimated cost (ap-south-1, on-demand, before tax)**

| Item | Per month |
| --- | --- |
| EC2 t3.small (CPU credits "standard": no surprise charges) | $16.35 |
| gp3 disk, 20 GB | $1.82 |
| Public IPv4 (Elastic IP) | $3.65 |
| State bucket, budget, SSM, VPC, IAM, first 100 GB out | ~$0 |
| **Total** | **≈ $21.82** |

**Measured after apply (2026-10-12):** node `Ready` about 2 minutes after boot; all system pods
running; idle memory 1.1 of 1.9 GiB used; from the internet, 80/443 answer (Traefik 404, nothing
deployed yet) and 22/6443/10250 are filtered.

**Try it**

```bash
cd infra/terraform/main
terraform init -backend-config=backend.hcl
terraform plan
aws ssm start-session --target "$(terraform output -raw instance_id)"
sudo k3s kubectl get nodes,pods -A
```

## 3. Kubernetes, HTTPS and deploys (7c)

**What:** the site runs as two pods behind Traefik on `https://chetannamane.com`, with a free
Let's Encrypt certificate that renews itself. Manifests live in `deploy/k8s/`:

| Folder | Contains | Applied |
| --- | --- | --- |
| `platform/` | cert-manager v1.21.2, installed by k3s' built-in Helm controller | once |
| `issuers/` | Let's Encrypt staging + production accounts (HTTP-01 through Traefik) | once |
| `app/` | namespace, Deployment, Service, Ingresses, redirects/headers, HPA, PDB, NetworkPolicy | every deploy |
| `tls/` | the certificate (staging dry run, then production) | once |

**Request path:** DNS (Cloudflare, "DNS only") → Elastic IP → k3s ServiceLB → Traefik (80/443)
→ Service `portfolio` → pod port 3000.

**Image:** `.github/workflows/image.yml` builds on every push to `main` and pushes
`ghcr.io/chetan080808/devops-portfolio:<full commit SHA>` with the workflow's own
`GITHUB_TOKEN`. The repository is private; the image package is public, so the server pulls it
without any stored credential (it only contains the built site, no source).

**Deploy:** `scripts/k8s-apply.sh deploy/k8s/app <sha>` renders the manifests on the laptop (or
CI), sends them inside an AWS SSM Run Command, and the node applies them with its own kubectl,
then waits for the rollout. The Kubernetes API (6443) is never exposed. `DRY_RUN=1` validates
against the live cluster without changing anything.

**The pods**

- Run as uid 1000, read-only root filesystem, no Linux capabilities, no service-account token,
  in a namespace that enforces the "restricted" Pod Security Standard. Writable: `/tmp` and
  `.next/cache` (small `emptyDir` volumes).
- Probes on `/api/healthz`: startup (up to 60 s), readiness (every 5 s), liveness (every 10 s).
- Memory: request 96 Mi, limit 256 Mi; measured ~45 Mi per pod in production.
- Rolling update with `maxSurge 1`, `maxUnavailable 0`: a new pod must be ready before an old
  one stops. A 5 s pre-stop pause lets Traefik drop the pod before it exits.
- HPA keeps 2 pods and allows a 3rd above 70% CPU; the disruption budget keeps at least one
  pod during maintenance; a NetworkPolicy lets only Traefik reach the pods.

**HTTPS and redirects**

- cert-manager proves domain ownership over HTTP (HTTP-01) and renews ~30 days before expiry.
  Staging first (to avoid production rate limits), then production. Both names are on one
  certificate (ECDSA P-256).
- `http://…` → `https://chetannamane.com/…` and `www` → apex, both 301, path and query kept, www
  in one hop.
- Headers: HSTS 1 year (no `includeSubDomains` yet; future subdomains need TLS first),
  `nosniff`, `X-Frame-Options: DENY`, `strict-origin-when-cross-origin`.

**Measured (2026-10-13)**

- Certificate: Let's Encrypt, apex + www, valid to 2027-01-11, TLS 1.3. Staging and production
  each issued in under 40 s.
- Home page over verified HTTPS: 200 in 0.16 s from India.
- First image pull on the node: ~3 min 20 s for 85 MB (cached afterwards; pods start in ~2 s).
- Node memory with everything running: 1386 Mi of 1.9 GiB (72%), ~467 MB available.

**Try it**

```bash
scripts/k8s-apply.sh deploy/k8s/app "$(git rev-parse HEAD)"   # after the image workflow passed
curl -I https://chetannamane.com
```

## 4. CI/CD and keyless deploys (7d)

**What:** `.github/workflows/ci-cd.yml` takes every push to `main` from source to the live site:

| Job | Does | Fails when |
| --- | --- | --- |
| `lint` | `npm ci`, `next typegen`, `tsc --noEmit`, `eslint` | a type or lint error |
| `build` | builds the image into the runner's Docker, scans it with Trivy, then pushes **that same image** as `ghcr.io/chetan080808/devops-portfolio:<commit SHA>` | Trivy finds a HIGH/CRITICAL vulnerability that has a fix |
| `deploy` | in the GitHub environment `production`: gets AWS credentials through OIDC, runs `scripts/k8s-apply.sh` (manifests applied on the node through SSM, waits for the rollout), then a smoke test | the role can't be assumed, the rollout doesn't finish in 7 min, or the site doesn't serve the new build |

Pull requests run `lint` and `build` (with the scan) only: nothing is pushed or deployed.

**Keyless AWS access (OIDC):** GitHub signs a short-lived token for the deploy job; AWS STS
checks it against the IAM OIDC provider for `token.actions.githubusercontent.com` and returns
1-hour credentials for the role `devops-portfolio-github-deploy`. No AWS keys exist in GitHub. The
role trusts exactly one subject:

```
repo:chetan080808@203205241/devops-portfolio@1408806533:environment:production
```

The numbers are GitHub's immutable account and repository IDs, so a deleted and re-created account
or repository with the same name could not use the role. The `production` environment only
accepts the `main` branch. The role can only run commands on the k3s node (`ssm:SendCommand` with
`AWS-RunShellScript`), read their results and look up the node.

**Supply chain:** every third-party action is pinned to a full commit SHA, choosing releases at
least two weeks old; Trivy is pinned to a version. Image tags are commit SHAs (never `latest`), so
a deploy names exactly what it runs, and rollback = deploying an older SHA.

**Smoke test:** every asset URL on the page carries the build's deployment ID (`?dpl=<SHA>`), so
the job checks that `https://chetannamane.com` actually serves the new commit, not just that some
pod answers `/api/healthz`.

**Measured (2026-10-14, run 38453184814):** lint 37 s, build + scan + push 118 s, deploy + smoke
test 37 s; push to live in about 3.5 minutes. Rolling update: one new pod ready before an old one
stopped, no downtime.

**Try it:** push to `main` (or Actions → ci-cd → Run workflow), then
`curl -s https://chetannamane.com | grep -o 'dpl=[0-9a-f]*' | sort -u`.

## 5. "Behind the scenes" footer: real data (7e)

The footer shows only values that exist somewhere real; anything unknown says "local build" or
"—".

| Shown | Source | When it's set |
| --- | --- | --- |
| pipeline (passed · run #) | `CI_RUN_ID` / `CI_RUN_NUMBER` build args; links to the run | image build (CI) |
| commit | `GIT_SHA` build arg; links to the commit | image build |
| image | `DEPLOY_IMAGE`, filled in by `k8s-apply.sh` with the deployed tag | deploy |
| deployed | `DEPLOYED_AT`, filled in by `k8s-apply.sh` (UTC) | deploy |
| served by | `POD_NAME` from the Kubernetes downward API (`metadata.name`) | pod start |

"Passed" is true by construction: only images that passed lint, build and the Trivy scan are ever
pushed. Build values are rendered into the static HTML; the pod values come from
`/api/build-info` (per request, `Cache-Control: no-store`), fetched when the footer scrolls into
view, so reloading can show a different pod.

**Measured (2026-10-14, run #5):** 4 requests to `/api/build-info` alternated between the two pods;
deploy time 2 minutes after the build time. Lighthouse on the live site (headless, this laptop):
desktop Perf 65–66, A11y/BP/SEO 100 (LCP 1.1–1.2 s, CLS 0.009, TBT 1.35–1.44 s, mostly 3D start-up);
mobile Perf 75–81, A11y/BP/SEO 100.
