import {
  LEGAL_COPY_VERSION,
  type LegalSection,
} from "@/modules/legal/legal-copy";

function LegalDocument({
  title,
  sections,
  siblingHref,
  siblingLabel,
}: {
  title: string;
  sections: LegalSection[];
  siblingHref: string;
  siblingLabel: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-10 sm:px-8">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {title}
        </h1>
      </header>
      {sections.map((section) => (
        <section key={section.id} className="max-w-2xl space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            {section.heading}
          </h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-muted-foreground leading-7">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
      <footer className="text-muted-foreground flex flex-col gap-3 text-sm">
        <p>Versão {LEGAL_COPY_VERSION}</p>
        <a
          href={siblingHref}
          className="text-primary underline-offset-4 hover:underline"
        >
          {siblingLabel}
        </a>
      </footer>
    </main>
  );
}

export { LegalDocument };
