import Link from "next/link";
import { ArrowRightIcon, GiftIcon } from "lucide-react";

function FreeDiagnosisBanner() {
  return (
    <aside
      aria-label="Primeiro diagnóstico gratuito"
      className="border-primary/15 bg-card mx-4 mt-4 grid gap-4 rounded-2xl border p-4 shadow-sm sm:mx-6 sm:p-5 lg:mx-8 @min-[40rem]:grid-cols-[minmax(14rem,1fr)_auto] @min-[40rem]:items-center"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
          <GiftIcon aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-balance">
            Seu primeiro diagnóstico é grátis
          </p>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-5 text-pretty">
            Comece sem cartão e descubra qual ajuste merece sua atenção
            primeiro.
          </p>
        </div>
      </div>

      <Link
        href="/quick-diagnosis"
        className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Fazer diagnóstico grátis
        <ArrowRightIcon aria-hidden="true" className="size-4" />
      </Link>
    </aside>
  );
}

export { FreeDiagnosisBanner };
