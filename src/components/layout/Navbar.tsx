import { site } from "@/content/site";
import { ClusterStatus } from "./ClusterStatus";

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6">
      <nav
        aria-label="Primary"
        className="glass mx-auto flex h-12 max-w-6xl items-center justify-between rounded-xl px-4"
      >
        <a href="#top" className="flex items-center gap-2 font-mono text-sm text-fg">
          <span className="text-cyan">~/</span>
          {site.profile.handle}
          <span className="animate-blink text-cyan" aria-hidden="true">
            _
          </span>
        </a>
        <ul className="hidden items-center gap-1 md:flex">
          {site.nav.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="rounded-md px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:bg-white/5 hover:text-fg"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <ClusterStatus />
      </nav>
    </header>
  );
}
