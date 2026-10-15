import { site } from "@/content/site";
import type { DashboardPanel } from "@/types/content";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DashboardScroll } from "./DashboardScroll";
import { RefreshBar } from "./RefreshBar";
import { GaugePanel, ListPanel, SparklinePanel, StatPanel, TagsPanel, TextPanel } from "./panels";

function Panel({ panel }: { panel: DashboardPanel }) {
  switch (panel.kind) {
    case "stat":
      return <StatPanel panel={panel} />;
    case "sparkline":
      return <SparklinePanel panel={panel} />;
    case "gauge":
      return <GaugePanel panel={panel} />;
    case "text":
      return <TextPanel panel={panel} />;
    case "list":
      return <ListPanel panel={panel} />;
    case "tags":
      return <TagsPanel panel={panel} />;
  }
}

export function Dashboard() {
  return (
    <Section id="metrics" aria-labelledby="metrics-title">
      <SectionHeader id="metrics-title" index="03" label="open dashboards/skills" title="Observability">
        {site.sections.metrics}
      </SectionHeader>

      <RefreshBar />

      {/* 2 columns from phone width up (small panels pair up, wide ones span both), 4 from lg */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {site.dashboard.map((panel) => (
          <Panel key={panel.id} panel={panel} />
        ))}
      </div>
      <DashboardScroll />
    </Section>
  );
}
