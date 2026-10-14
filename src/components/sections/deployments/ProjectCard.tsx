import type { Project } from "@/types/content";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { statusAccent } from "@/lib/accent";
import { MiniSlot } from "./MiniSlot";

const MAX_CHIPS = 5;

/** Kubernetes-style readout: a finished project is a completed Job, not a running Deployment. */
const READY: Record<Project["status"], string> = {
  Running: "replicas 1/1",
  Completed: "completions 1/1",
  Pending: "replicas 0/1",
};

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
      className={cn(
        "glass group/card group relative flex flex-col overflow-hidden rounded-2xl p-5 md:p-6 transition-all duration-500 ease-premium",
        "hover:-translate-y-1 hover:border-cyan/30 hover:glow-edge active:translate-y-0 active:scale-[0.99] active:duration-100",
        // The whole card is the inspect button's hit area, so the card shows its keyboard focus.
        "has-focus-visible:border-cyan/60 has-focus-visible:glow-edge motion-reduce:transform-none",
      )}
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
          <Badge accent={statusAccent[project.status]}>{project.status}</Badge>
        </span>
      </div>

      <MiniSlot index={index} status={project.status} />

      <h3 className="mt-4 text-lg font-semibold tracking-tight text-fg md:mt-5 md:text-xl">{project.name}</h3>
      {/* Phones: clamped to 3 lines at its natural height (stretching it would show the clipped
          lines); the chips take the free space instead so footers line up across cards. */}
      <p className="mt-2 text-sm leading-relaxed text-muted max-md:line-clamp-3 md:mt-3 md:flex-1">{project.impact}</p>

      <ul className="flex flex-wrap gap-1.5 max-md:mt-auto max-md:pt-4 md:mt-6" aria-label="Tech stack">
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

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 font-mono text-[0.7rem] md:mt-6 md:pt-4">
        <span className="text-faint">{READY[project.status]}</span>
        <button
          type="button"
          onClick={() => onInspect(project)}
          aria-haspopup="dialog"
          aria-label={`docker inspect ${project.name}`}
          className="rounded text-cyan transition-colors group-hover:text-fg after:absolute after:inset-0 focus-visible:outline-offset-2"
        >
          docker inspect{" "}
          <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transform-none">
            →
          </span>
        </button>
      </div>
    </article>
  );
}
