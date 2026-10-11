import { BootSequence } from "@/components/boot/BootSequence";
import { GridBackground } from "@/components/background/GridBackground";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/sections/hero/Hero";
import { Deployments } from "@/components/sections/deployments/Deployments";
import { Pipeline } from "@/components/sections/pipeline/Pipeline";
import { Dashboard } from "@/components/sections/dashboard/Dashboard";
import { ContactTerminal } from "@/components/sections/contact/ContactTerminal";
import { Footer } from "@/components/sections/footer/Footer";
import { ChaosLog } from "@/components/easter-eggs/ChaosMonkey";
import { PersonJsonLd } from "@/components/layout/PersonJsonLd";

export default function Home() {
  return (
    <>
      <BootSequence />
      <a
        href="#main"
        className="sr-only z-50 rounded bg-cyan px-3 py-2 text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <GridBackground />
      <Navbar />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <Deployments />
        <Pipeline />
        <Dashboard />
        <ContactTerminal />
      </main>
      <Footer />
      <ChaosLog />
      <PersonJsonLd />
    </>
  );
}
