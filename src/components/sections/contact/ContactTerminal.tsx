import { site } from "@/content/site";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Terminal } from "./Terminal";

/** Contact: an interactive terminal (Terminal) plus plain buttons as the easy path. */
export function ContactTerminal() {
  const { profile, socials } = site;

  return (
    <Section id="contact" aria-labelledby="contact-title">
      <SectionHeader id="contact-title" index="04" label="ssh contact@portfolio" title="Let's talk">
        Type a command, or skip the terminal and use the buttons.
      </SectionHeader>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <Terminal />

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
