import { site } from "@/content/site";
import { StatusDot } from "@/components/ui/StatusDot";

/** "Behind the scenes" footer. Values are placeholders until Phase 7 wires real CI data. */
export function Footer() {
  const { footer, meta, profile } = site;
  const stats = [
    { label: "build", value: footer.buildStatus, accent: "text-success" },
    { label: "last deploy", value: footer.lastDeploy, accent: "text-fg" },
    { label: "pods", value: `${footer.podCount}/${footer.podCount} ready`, accent: "text-fg" },
    { label: "version", value: footer.version, accent: "text-cyan" },
  ];

  return (
    <footer className="relative border-t border-line px-4 pt-12 pb-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="label-mono mb-5">behind the scenes</p>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-bg px-4 py-4">
              <dt className="font-mono text-[0.68rem] text-faint">{s.label}</dt>
              <dd className={`mt-1 flex items-center gap-2 font-mono text-sm ${s.accent}`}>
                {s.label === "build" && <StatusDot accent="success" />}
                {s.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-col gap-3 font-mono text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {profile.name} · built with Next.js, R3F &amp; GSAP · shipped via GitHub Actions → Kubernetes
          </p>
          <a href={meta.repoUrl} target="_blank" rel="noreferrer" className="text-muted transition-colors hover:text-cyan">
            view source ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
