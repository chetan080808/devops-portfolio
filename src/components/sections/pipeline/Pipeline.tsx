import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { JenkinsJob } from "./jenkins/JenkinsJob";
import { PipelineScroll } from "./PipelineScroll";

/**
 * Career as a Jenkins pipeline: Blue Ocean–style stage graph + classic Stage View. Desktop with
 * motion: PipelineScroll pins the job and runs the stages one by one. Click any stage for its
 * Console Output.
 */
export function Pipeline() {
  return (
    <Section id="pipeline" aria-labelledby="pipeline-title">
      <SectionHeader id="pipeline-title" index="02" label="jenkins · career-pipeline" title="Pipeline">
        Every milestone is a stage. The last one is still running. Click a stage for its console output.
      </SectionHeader>
      <JenkinsJob />
      <PipelineScroll />
    </Section>
  );
}
