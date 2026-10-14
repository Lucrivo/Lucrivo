import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeftIcon, LogInIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Página não encontrada | Lucrivo",
};

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center px-5 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/"
          aria-label="Lucrivo — página inicial"
          className="focus-visible:ring-ring/30 block size-12 rounded-xl outline-none focus-visible:ring-3"
        >
          <Logo />
        </Link>

        <div className="mt-12 grid gap-7 sm:mt-16">
          <p
            aria-hidden="true"
            className="text-primary text-7xl leading-none font-semibold tracking-[-0.04em] sm:text-8xl"
          >
            404
          </p>

          <div className="grid max-w-xl gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
              Página não encontrada
            </h1>
            <p className="text-muted-foreground max-w-[65ch] text-base leading-7 sm:text-lg">
              O endereço pode estar incorreto ou a página pode ter sido
              removida. Você pode voltar ao início ou entrar novamente na sua
              conta.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              render={<Link href="/" />}
              className="w-full sm:w-auto"
            >
              <ArrowLeftIcon aria-hidden="true" />
              Voltar para o início
            </Button>
            <Button
              variant="outline"
              size="lg"
              render={<Link href="/login" />}
              className="w-full sm:w-auto"
            >
              <LogInIcon aria-hidden="true" />
              Entrar na minha conta
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
