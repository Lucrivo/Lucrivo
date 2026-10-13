import { Button } from "@/components/ui/button";
import { logout } from "@/modules/auth/actions/logout.action";

export default function AccountUnavailablePage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <section className="bg-card w-full max-w-md rounded-2xl border p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Conta indisponível
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          Não é possível acessar a área financeira com esta conta no momento. Se
          você acredita que houve um engano, entre em contato com o suporte.
        </p>
        <form action={logout} className="mt-6">
          <Button type="submit" variant="outline" className="w-full">
            Sair da conta
          </Button>
        </form>
      </section>
    </main>
  );
}
