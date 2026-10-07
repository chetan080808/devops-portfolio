import { site } from "@/content/site";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StageCard } from "./StageCard";

/**
 * Career as a CI/CD pipeline. Static layout for now; Phase 4 pins this
 * section and scrolls the stages horizontally with GSAP ScrollTrigger.
 */
export function Pipeline() {
  const stages = site.experience;

  return (
    <Section id="pipeline" aria-labelledby="pipeline-title">
      <SectionHeader id="pipeline-title" index="02" label="gh run view --log career.yml" title="Pipeline">
        Every milestone is a stage. Every stage passed before the next one started.
      </SectionHeader>

      <div className="glass mb-8 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl px-4 py-3 font-mono text-xs">
        <span className="text-success">● passed</span>
        <span className="text-muted">workflow: career.yml</span>
        <span className="text-muted">branch: main</span>
        <span className="text-faint">
          {stages.length}/{stages.length} jobs succeeded
        </span>
      </div>

      <div className="relative">
        {/* rail: vertical on mobile, horizontal on desktop */}
        <div
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-5 w-px bg-gradient-to-b from-success/60 via-cyan/40 to-violet/40 md:top-5 md:right-0 md:bottom-auto md:left-0 md:h-px md:w-auto md:bg-gradient-to-r"
        />
        <ol className="relative grid gap-6 md:auto-cols-fr md:grid-flow-col md:gap-5">
          {stages.map((m, i) => (
            <StageCard key={m.id} milestone={m} index={i} total={stages.length} />
          ))}
        </ol>
      </div>
    </Section>
  );
}
