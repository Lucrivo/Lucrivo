import { LoginHero } from "@/components/login/login-hero";

function AuthPage({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center p-3 sm:p-6 lg:p-8">
      <div className="bg-card grid w-full max-w-7xl overflow-hidden rounded-2xl border shadow-lg lg:min-h-[760px] lg:grid-cols-[1.04fr_0.96fr]">
        <LoginHero />
        <section className="flex items-center px-6 py-10 sm:px-12 sm:py-14 lg:px-16 xl:px-20">
          {children}
        </section>
      </div>
    </main>
  );
}

export { AuthPage };
