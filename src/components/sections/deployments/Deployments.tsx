import { site } from "@/content/site";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProjectGrid } from "./ProjectGrid";

export function Deployments() {
  const running = site.projects.filter((p) => p.status === "Running").length;

  return (
    <Section id="deployments" aria-labelledby="deployments-title">
      <SectionHeader id="deployments-title" index="01" label="kubectl get deployments -n portfolio" title="Deployments">
        Each project ships as its own container. Inspect one to see the problem, architecture and results.
      </SectionHeader>
      <p className="mb-6 font-mono text-xs text-faint">
        NAME · READY · STATUS — <span className="text-success">{running}/{site.projects.length} running</span>
      </p>
      <ProjectGrid projects={site.projects} />
    </Section>
  );
}
