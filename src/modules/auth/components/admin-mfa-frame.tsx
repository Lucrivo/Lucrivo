import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { logout } from "@/modules/auth/actions/logout.action";

type AdminMfaFrameProps = {
  children: React.ReactNode;
  title: string;
  subtitle: string;
};

function AdminMfaFrame({
  children,
  title,
  subtitle,
}: AdminMfaFrameProps) {
  return (
    <main className="flex min-h-svh items-center justify-center p-4 sm:p-6">
      <section
        className="bg-card w-full max-w-lg rounded-2xl border p-6 shadow-lg sm:p-8"
        aria-labelledby="admin-mfa-title"
      >
        <div className="mb-8 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center">
            <Logo />
          </span>
          <span className="font-semibold tracking-tight">Lucrivo</span>
        </div>

        <div className="mb-7">
          <h1 id="admin-mfa-title" className="text-2xl sm:text-3xl">
            {title}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            {subtitle}
          </p>
        </div>

        {children}

        <div className="mt-8 flex flex-col gap-2 border-t pt-5 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            render={<Link href="/dashboard" />}
            className="justify-start shadow-none"
          >
            Ir para a área financeira
          </Button>
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start shadow-none sm:w-auto"
            >
              Sair da conta
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}

export { AdminMfaFrame };
