"use client";

import { useCallback, useState } from "react";
import type { Project } from "@/types/content";
import { ProjectCard } from "./ProjectCard";
import { InspectPanel } from "./InspectPanel";

export function ProjectGrid({ projects }: { projects: Project[] }) {
  const [active, setActive] = useState<Project | null>(null);
  const close = useCallback(() => setActive(null), []);

  return (
    <>
      <div data-project-grid className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, i) => (
          <ProjectCard key={project.id} project={project} index={i} onInspect={setActive} />
        ))}
      </div>
      <InspectPanel project={active} onClose={close} />
    </>
  );
}
