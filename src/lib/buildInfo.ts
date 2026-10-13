/**
 * Where this build and this pod came from, read from the environment. Every field is null when
 * its source is absent (local `next dev`, a local `docker build`): the footer then says so
 * instead of showing a made-up value.
 *
 * Build time (Docker build args, set by the CI/CD pipeline): GIT_SHA, BUILD_TIME, CI_RUN_ID,
 * CI_RUN_NUMBER. Deploy time (Kubernetes Deployment, see deploy/k8s/app/deployment.yaml):
 * DEPLOY_IMAGE and DEPLOYED_AT (filled in by scripts/k8s-apply.sh), POD_NAME (downward API).
 */

/** Values baked into the image: identical for every pod of one release. */
export interface BuildInfo {
  commit: string | null;
  builtAt: string | null;
  /** The GitHub Actions run that built, scanned and pushed the image */
  run: { id: string; number: string } | null;
}

/** Values of the running pod: they differ per deploy (and per pod). */
export interface RuntimeInfo {
  /** Full image reference the Deployment runs, e.g. ghcr.io/…/devops-portfolio:<sha> */
  image: string | null;
  deployedAt: string | null;
  /** The pod that answered this request */
  pod: string | null;
}

const env = (name: string) => {
  const value = process.env[name]?.trim();
  // Placeholders the deploy script replaces; seen only if a manifest was applied by hand.
  return value && value !== "unset" && !value.startsWith("__") ? value : null;
};

export function getBuildInfo(): BuildInfo {
  const runId = env("CI_RUN_ID");
  const runNumber = env("CI_RUN_NUMBER");
  return {
    commit: env("GIT_SHA"),
    builtAt: env("BUILD_TIME"),
    run: runId && runNumber ? { id: runId, number: runNumber } : null,
  };
}

export function getRuntimeInfo(): RuntimeInfo {
  const image = env("DEPLOY_IMAGE");
  return {
    image: image && !image.endsWith(":unset") ? image : null,
    deployedAt: env("DEPLOYED_AT"),
    pod: env("POD_NAME"),
  };
}
