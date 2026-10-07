import { site } from "@/content/site";
import type { DashboardPanel } from "@/types/content";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusDot } from "@/components/ui/StatusDot";
import { GaugePanel, ListPanel, SparklinePanel, StatPanel } from "./panels";

function Panel({ panel }: { panel: DashboardPanel }) {
  switch (panel.kind) {
    case "stat":
      return <StatPanel panel={panel} />;
    case "sparkline":
      return <SparklinePanel panel={panel} />;
    case "gauge":
      return <GaugePanel panel={panel} />;
    case "list":
      return <ListPanel panel={panel} />;
  }
}

export function Dashboard() {
  return (
    <Section id="metrics" aria-labelledby="metrics-title">
      <SectionHeader id="metrics-title" index="03" label="open dashboards/skills" title="Observability">
        Skills, reported like production metrics.
      </SectionHeader>

      <div className="glass mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-2.5 font-mono text-xs">
        <p className="flex items-center gap-2 text-fg">
          <StatusDot accent="success" />
          skills / overview
        </p>
        <p className="flex gap-4 text-faint">
          <span>last 12 months</span>
          <span className="hidden sm:inline">refresh 30s</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {site.dashboard.map((panel) => (
          <Panel key={panel.id} panel={panel} />
        ))}
      </div>
    </Section>
  );
}
