import { site } from "@/content/site";
import { ClusterStatus } from "./ClusterStatus";
import { MobileMenu } from "./MobileMenu";
import { NavFrame } from "./NavFrame";
import { NavLinks } from "./NavLinks";

export function Navbar() {
  return (
    // Phones: flush with the top edge (no transparent strip above the bar for content to scroll
    // through), safe-area aware. md+: the floating glass bar.
    <header className="fixed inset-x-0 top-0 z-40 md:px-6 md:pt-4">
      <NavFrame>
        <a href="#top" className="group -my-3 flex items-center gap-2 py-3 font-mono text-sm text-fg">
          <span className="text-cyan transition-transform duration-300 group-hover:-translate-x-0.5">~/</span>
          {site.profile.handle}
          <span className="animate-blink text-cyan" aria-hidden="true">
            _
          </span>
        </a>
        <NavLinks />
        <div className="flex items-center gap-3">
          <ClusterStatus />
          <MobileMenu />
        </div>
      </NavFrame>
    </header>
  );
}
