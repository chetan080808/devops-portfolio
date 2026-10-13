import type { ReactNode } from "react";
import { site } from "@/content/site";
import { StatusDot } from "@/components/ui/StatusDot";
import { getBuildInfo } from "@/lib/buildInfo";
import { LiveDeployInfo } from "./LiveDeployInfo";

/**
 * "Behind the scenes": real data only. Pipeline run and commit are baked into the image at build
 * time (rendered here, into the static HTML); image, deploy time and the serving pod come from the
 * running pod (LiveDeployInfo). Anything unknown says so ("local build", "—").
 */
export function Footer() {
  const { meta, profile } = site;
  const build = getBuildInfo();
  const short = build.commit?.slice(0, 7);

  return (
    <footer className="relative border-t border-line px-4 pt-12 pb-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <h2 className="label-mono mb-5">behind the scenes</h2>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-5">
          <Cell label="pipeline">
            {build.run ? (
              // Only images that passed lint, build and the Trivy scan are ever pushed, so a CI
              // build that is being served has passed; the link shows the run itself.
              <a
                href={`${meta.repoUrl}/actions/runs/${build.run.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-success transition-colors hover:text-cyan"
              >
                <StatusDot accent="success" />
                passed · #{build.run.number}
                <span className="sr-only"> (GitHub Actions run, opens in a new tab)</span>
              </a>
            ) : (
              <span className="text-faint">local build</span>
            )}
          </Cell>
          <Cell label="commit">
            {build.commit ? (
              <a
                href={`${meta.repoUrl}/commit/${build.commit}`}
                target="_blank"
                rel="noreferrer"
                title={build.builtAt ? `built ${build.builtAt}` : undefined}
                className="text-cyan transition-colors hover:text-fg"
              >
                {short}
                <span className="sr-only"> (commit on GitHub, opens in a new tab)</span>
              </a>
            ) : (
              <span className="text-faint">—</span>
            )}
          </Cell>
          <LiveDeployInfo />
        </dl>

        <div className="mt-8 flex flex-col gap-3 font-mono text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {profile.name} · built with Next.js, R3F &amp; GSAP · shipped via GitHub Actions → Kubernetes
          </p>
          <a href={meta.repoUrl} target="_blank" rel="noreferrer" className="text-muted transition-colors hover:text-cyan">
            view source<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 bg-bg px-4 py-4">
      <dt className="font-mono text-[0.68rem] text-faint">{label}</dt>
      <dd className="mt-1 flex min-w-0 items-center gap-2 truncate font-mono text-sm text-fg">{children}</dd>
    </div>
  );
}
