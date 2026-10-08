import type { Project } from "@/types/content";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { MiniSlot } from "./MiniSlot";

const MAX_CHIPS = 5;

export function ProjectCard({ project, index, onInspect }: {
  project: Project;
  index: number;
  onInspect: (project: Project) => void;
}) {
  const extra = project.stack.length - MAX_CHIPS;

  return (
    // data-landed: "true" once this project's mini has landed (4a). Server HTML = landed (final
    // state), so mobile / reduced motion / no-JS show the real status straight away.
    <article
      data-landed="true"
      data-running={project.status === "Running" ? "true" : "false"}
      className="glass group/card group relative flex flex-col overflow-hidden rounded-2xl p-6 transition-all duration-500 ease-premium hover:-translate-y-1 hover:border-cyan/30 hover:glow-edge"
    >
      {/* top "container" rail */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />

      <div className="flex items-center justify-between gap-3">
        <p className="truncate font-mono text-[0.7rem] text-faint">
          deploy/{project.id} · rev {index + 1}
        </p>
        {/* Before its container lands: "Pending"; after: the project's real status */}
        <span className="hidden group-data-[landed=false]/card:inline">
          <Badge accent="warning">Pending</Badge>
        </span>
        <span className="group-data-[landed=false]/card:hidden">
          <Badge accent={project.status === "Running" ? "success" : "warning"}>{project.status}</Badge>
        </span>
      </div>

      <MiniSlot index={index} />

      <h3 className="mt-5 text-xl font-semibold tracking-tight text-fg">{project.name}</h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{project.impact}</p>

      <ul className="mt-6 flex flex-wrap gap-1.5" aria-label="Tech stack">
        {project.stack.slice(0, MAX_CHIPS).map((tech) => (
          <li key={tech}>
            <Chip>{tech}</Chip>
          </li>
        ))}
        {extra > 0 && (
          <li>
            <Chip className="text-faint">+{extra}</Chip>
          </li>
        )}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-line pt-4 font-mono text-[0.7rem]">
        <span className="text-faint">replicas 1/1</span>
        <button
          type="button"
          onClick={() => onInspect(project)}
          aria-haspopup="dialog"
          className="text-cyan transition-colors after:absolute after:inset-0 hover:text-fg"
        >
          docker inspect →
        </button>
      </div>
    </article>
  );
}
