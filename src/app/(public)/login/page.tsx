import { LoginForm } from "@/components/login/login-form";
import { LoginHero } from "@/components/login/login-hero";

import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center p-3 sm:p-6 lg:p-8">
      <div className="bg-card grid w-full max-w-7xl overflow-hidden rounded-2xl border shadow-lg lg:min-h-[760px] lg:grid-cols-[1.04fr_0.96fr]">
        <LoginHero />
        <section className="flex items-center px-6 py-10 sm:px-12 sm:py-14 lg:px-16 xl:px-20">
          <LoginForm
            action={login}
            hasInvalidCredentials={error === "invalid_credentials"}
          />
        </section>
      </div>
    </main>
  );
}
