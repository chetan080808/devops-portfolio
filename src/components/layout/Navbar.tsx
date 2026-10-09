import { site } from "@/content/site";
import { ClusterStatus } from "./ClusterStatus";
import { NavLinks } from "./NavLinks";

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6">
      <nav
        aria-label="Primary"
        className="glass mx-auto flex h-12 max-w-6xl items-center justify-between rounded-xl px-4"
      >
        <a href="#top" className="group flex items-center gap-2 font-mono text-sm text-fg">
          <span className="text-cyan transition-transform duration-300 group-hover:-translate-x-0.5">~/</span>
          {site.profile.handle}
          <span className="animate-blink text-cyan" aria-hidden="true">
            _
          </span>
        </a>
        <NavLinks />
        <ClusterStatus />
      </nav>
    </header>
  );
}
