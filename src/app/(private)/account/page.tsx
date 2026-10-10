import { redirect } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/modules/auth/services/require-user";
import { OnboardingForm } from "@/modules/onboarding/components/onboarding-form";
import { getOnboardingData } from "@/modules/onboarding/get-onboarding.service";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { supabase } = await requireUser();
  const [claimsResult, onboardingData] = await Promise.all([
    supabase.auth.getClaims(),
    getOnboardingData(),
  ]);

  if (!onboardingData.profile) redirect("/onboarding");

  const email =
    typeof claimsResult.data?.claims?.email === "string"
      ? claimsResult.data.claims.email
      : "Sua conta";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Minha conta
        </h1>
        <p className="text-muted-foreground mt-3 text-base leading-7">
          Consulte seu acesso e mantenha os dados do seu negócio atualizados.
        </p>
      </header>

      <section className="max-w-2xl space-y-2">
        <Label htmlFor="account-email-value">E-mail</Label>
        <Input
          id="account-email-value"
          value={email}
          readOnly
          aria-readonly="true"
          className="bg-muted/45"
        />
        <p className="text-muted-foreground text-sm">
          O e-mail identifica seu acesso ao Lucrivo.
        </p>
      </section>

      <OnboardingForm data={onboardingData} mode="account" />
    </main>
  );
}
