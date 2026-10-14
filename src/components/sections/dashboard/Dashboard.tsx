import { site } from "@/content/site";
import type { DashboardPanel } from "@/types/content";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusDot } from "@/components/ui/StatusDot";
import { DashboardScroll } from "./DashboardScroll";
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
        Skills, reported like production metrics.
      </SectionHeader>

      <div className="glass mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-2 font-mono text-xs sm:mb-4 sm:px-4 sm:py-2.5">
        <p className="flex items-center gap-2 text-fg">
          <StatusDot accent="success" />
          skills / overview
        </p>
        <p className="flex gap-4 text-faint">
          <span>range: all time</span>
          <span className="hidden sm:inline">refresh 30s</span>
        </p>
      </div>

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
