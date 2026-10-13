import { redirect } from "next/navigation";

import { OnboardingForm } from "@/modules/onboarding/components/onboarding-form";
import { getOnboardingData } from "@/modules/onboarding/get-onboarding.service";

export default async function OnboardingPage() {
  const data = await getOnboardingData();

  if (data.profile) redirect("/dashboard");

  return <OnboardingForm data={data} mode="onboarding" />;
}
