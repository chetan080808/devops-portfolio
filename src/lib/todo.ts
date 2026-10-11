import type { Project } from "@/types/content";

/**
 * TODO placeholders in site.ts: visible in development (a reminder to fill them in), hidden from
 * production builds so the live site never shows "TODO: …" text or links to TODO URLs.
 */
export const SHOW_TODOS = process.env.NODE_ENV !== "production";

const TODO = /\bTODO\b/;

/** False for a TODO placeholder in production. */
export const shown = (text: string) => SHOW_TODOS || !TODO.test(text);

/** A link is a placeholder if its label or URL says TODO. */
export const linkShown = (link: { label: string; href: string }) => shown(link.label) && shown(link.href);

/**
 * A project without its TODO placeholders (production): applied before the data reaches client
 * components, so the placeholders aren't in the page source either. Empty fields are omitted.
 */
export function withoutTodos(p: Project): Project {
  if (SHOW_TODOS) return p;
  return {
    ...p,
    inspect: {
      problem: shown(p.inspect.problem) ? p.inspect.problem : "",
      architecture: p.inspect.architecture.filter(shown),
      role: shown(p.inspect.role) ? p.inspect.role : "",
      results: p.inspect.results.filter(shown),
    },
    links: p.links.filter(linkShown),
  };
}
