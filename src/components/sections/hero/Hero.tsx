import { site } from "@/content/site";
import { ButtonLink } from "@/components/ui/Button";
import { StatusDot } from "@/components/ui/StatusDot";
import { HexCluster } from "./HexCluster";
import { HeroStage } from "./HeroStage";

export function Hero() {
  const { profile, hero } = site;

  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="relative flex min-h-[min(100svh,58rem)] items-center px-4 pt-20 pb-10 sm:px-6 md:pt-28 md:pb-14"
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-5 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        {/* data-hero-text: the 3D whale keeps clear of this column's content (HeroStage).
            Below lg it's display: contents, so the stage can sit between name and pitch:
            the scene is on the first screen instead of below the stats. */}
        <div data-hero-text className="contents lg:block">
          <div className="max-lg:order-1">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.02] px-3 py-1 font-mono text-[0.7rem] text-muted">
              <StatusDot accent="success" />
              {hero.eyebrow}
            </p>

            <h1
              id="hero-title"
              className="text-5xl leading-[0.95] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl"
            >
              <span className="text-gradient">{profile.name}</span>
            </h1>
            <p className="mt-5 font-mono text-sm text-cyan sm:text-base">
              <span className="text-faint">role=</span>&quot;{profile.title}
              &quot;
            </p>
          </div>
          <div className="max-lg:order-3">
            <p className="max-w-xl lg:mt-6 text-lg leading-relaxed text-pretty text-muted">
              {profile.pitch}
            </p>

            <div className="mt-7 flex flex-wrap gap-3 md:mt-10">
              <ButtonLink href={hero.primaryCta.href}>
                {hero.primaryCta.label}
                <span
                  aria-hidden="true"
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                >
                  →
                </span>
              </ButtonLink>
              <ButtonLink
                href={hero.secondaryCta.href}
                variant="ghost"
                download={profile.resumeFileName}
              >
                {hero.secondaryCta.label}
                <span aria-hidden="true">↓</span>
              </ButtonLink>
            </div>

            <dl className="mt-9 grid max-w-md grid-cols-3 divide-x divide-line border-y border-line md:mt-14">
              {hero.stats.map((stat) => (
                <div key={stat.label} className="px-4 py-4 first:pl-0">
                  <dt className="label-mono">{stat.label}</dt>
                  <dd
                    className={`mt-1 font-mono text-xl ${stat.value === null ? "text-faint" : "text-fg"}`}
                  >
                    {stat.value ?? "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <HeroStage fallback={<HexCluster />} />
      </div>

      <a
        href="#deployments"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 font-mono text-[0.68rem] text-faint transition-colors hover:text-cyan md:flex"
      >
        {site.hero.scrollHint}
        <span
          className="h-8 w-px bg-gradient-to-b from-cyan to-transparent"
          aria-hidden="true"
        />
      </a>
    </section>
  );
}
