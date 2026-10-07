import { site } from "@/content/site";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ButtonLink } from "@/components/ui/Button";
import { TerminalWindow } from "./TerminalWindow";

const COMMANDS: Array<[string, string]> = [
  ["whoami", "who is running this cluster"],
  ["ls projects", "list deployments"],
  ["cat resume", "print the resume"],
  ["contact", "how to reach me"],
  ["social", "links elsewhere"],
  ["clear", "clear the screen"],
  ["sudo hire-me", "¯\\_(ツ)_/¯"],
];

/**
 * Static terminal preview. Phase 5 replaces the body with a working
 * command-line (input, history, command engine).
 */
export function ContactTerminal() {
  const { profile, socials } = site;
  const prompt = `${profile.handle}@portfolio:~$`;

  return (
    <Section id="contact" aria-labelledby="contact-title">
      <SectionHeader id="contact-title" index="04" label="ssh contact@portfolio" title="Let's talk">
        Type a command, or skip the terminal and use the buttons.
      </SectionHeader>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <TerminalWindow title={`${profile.handle}@portfolio — zsh`}>
          <p>
            <span className="text-success">{prompt}</span> <span className="text-fg">help</span>
          </p>
          <p className="mt-2 text-muted">Available commands:</p>
          <ul className="mt-2 space-y-0.5">
            {COMMANDS.map(([cmd, desc]) => (
              <li key={cmd} className="grid grid-cols-[9rem_1fr] gap-2 sm:grid-cols-[11rem_1fr]">
                <span className="text-cyan">{cmd}</span>
                <span className="text-faint">{desc}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4">
            <span className="text-success">{prompt}</span> <span className="text-fg">contact</span>
          </p>
          <p className="mt-1 text-muted">
            → <span className="text-fg">{profile.email}</span>
          </p>
          <p className="mt-4 flex items-center gap-2">
            <span className="text-success">{prompt}</span>
            <span className="inline-block h-4 w-2 animate-blink bg-cyan" aria-hidden="true" />
          </p>
        </TerminalWindow>

        <aside className="flex flex-col justify-between gap-8">
          <div>
            <p className="label-mono">status</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-fg">
              {profile.available ? "Open to new opportunities." : "Currently heads-down."}
            </p>
            <div className="mt-4 space-y-2 text-muted">
              {profile.bio.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <ButtonLink href={`mailto:${profile.email}`} className="w-full">
              Email me →
            </ButtonLink>
            <div className="grid grid-cols-2 gap-3">
              {socials
                .filter((s) => s.kind !== "email")
                .map((s) => (
                  <ButtonLink key={s.href} href={s.href} variant="ghost" target="_blank" rel="noreferrer">
                    {s.label} ↗
                  </ButtonLink>
                ))}
            </div>
          </div>
        </aside>
      </div>
    </Section>
  );
}
