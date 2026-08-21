import Image from "next/image";

import logo from "@/public/brand/logo.png";

import { LoginAnalyticsIllustration } from "./login-analytics-illustration";

function LoginHero() {
  return (
    <section className="from-primary/12 via-card to-primary/5 relative isolate min-h-52 overflow-hidden border-b bg-gradient-to-br p-7 sm:p-9 lg:min-h-[760px] lg:border-r lg:border-b-0 lg:p-14">
      <div
        className="bg-primary/10 absolute -top-24 -left-24 size-80 rounded-full blur-3xl"
        aria-hidden="true"
      />
      <div
        className="text-primary/70 animate-drift absolute top-14 right-4 size-32 [background-image:radial-gradient(circle,currentColor_1px,transparent_1px)] [background-size:18px_18px] opacity-45 sm:right-10 lg:top-20"
        aria-hidden="true"
      />
      <div className="relative z-20 max-w-lg">
        <div className="animate-fade-in flex items-center gap-3">
          <div className="flex size-14 items-center justify-center overflow-hidden rounded-xl border bg-white p-1.5 shadow-sm lg:size-16">
            <Image
              src={logo}
              alt="Símbolo Lucrivo"
              className="size-full object-cover"
              priority
            />
          </div>
          <span className="text-3xl font-semibold tracking-tight lg:text-4xl">
            Lucrivo
          </span>
        </div>
        <div className="animate-fade-up mt-8 max-w-md [animation-delay:150ms] lg:mt-14">
          <h2 className="text-2xl leading-tight font-semibold sm:text-3xl lg:text-4xl">
            Não precifique no {""}
            <span className="text-primary">achismo.</span>
          </h2>
          <p className="text-muted-foreground mt-5 max-w-sm text-sm leading-relaxed sm:text-base lg:mt-7">
            Preço, custo e quanto sobra pra você. Sem planilha, sem contabilês.
          </p>
        </div>
      </div>
      <div className="hidden lg:block">
        <LoginAnalyticsIllustration />
      </div>
    </section>
  );
}

export { LoginHero };
