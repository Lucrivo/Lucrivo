"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type AdminAccessUnavailableProps = {
  logoutAction?: () => Promise<void>;
};

function AdminAccessUnavailable({
  logoutAction,
}: AdminAccessUnavailableProps) {
  const router = useRouter();

  return (
    <main className="flex min-h-svh items-center justify-center p-4 sm:p-6">
      <section
        className="bg-card w-full max-w-md rounded-2xl border p-6 shadow-lg sm:p-8"
        aria-labelledby="admin-access-unavailable-title"
      >
        <h1 id="admin-access-unavailable-title" className="text-2xl">
          Não foi possível verificar o acesso
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          O estado de segurança da conta está temporariamente indisponível.
          Tente novamente antes de continuar.
        </p>

        <div className="mt-6 space-y-2">
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => router.refresh()}
          >
            Tentar novamente
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            render={<Link href="/dashboard" />}
          >
            Ir para a área financeira
          </Button>
          {logoutAction && (
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="lg"
                className="w-full"
              >
                Sair da conta
              </Button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

export { AdminAccessUnavailable };
