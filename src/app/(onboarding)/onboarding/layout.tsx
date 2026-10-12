import { redirect } from "next/navigation";

import { Logo } from "@/components/ui/logo";
import {
  AccountUnavailableError,
  AuthRequiredError,
  requireUser,
} from "@/modules/auth/services/require-user";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireUser();
  } catch (error) {
    if (error instanceof AuthRequiredError) redirect("/login");
    if (error instanceof AccountUnavailableError) {
      redirect("/account-unavailable");
    }
    throw error;
  }

  return (
    <main className="bg-background min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 py-6 sm:px-8 sm:py-8 lg:py-10">
        <header className="mb-10 sm:mb-14">
          <div className="size-10">
            <Logo />
          </div>
        </header>
        <div className="flex flex-1 items-start pb-10">{children}</div>
      </div>
    </main>
  );
}
