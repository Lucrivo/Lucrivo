import { DiagnosisLimitCard } from "@/modules/billing/components/diagnosis-limit-card";
import { getBillingOverview } from "@/modules/billing/services/get-billing-overview.service";
import { requireUser } from "@/modules/auth/services/require-user";
import { createDetailedDiagnosis } from "@/modules/detailed-diagnosis/actions/create-detailed-diagnosis.action";
import type { DetailedDiagnosisCategory } from "@/modules/detailed-diagnosis/types";
import { createProductDiagnosis } from "@/modules/quick-diagnosis/actions/create-product-diagnosis.action";
import { createProductionDiagnosis } from "@/modules/quick-diagnosis/actions/create-production-diagnosis.action";
import { createServiceDiagnosis } from "@/modules/quick-diagnosis/actions/create-service-diagnosis.action";
import { QuickDiagnosisWizard } from "@/modules/quick-diagnosis/components/quick-diagnosis-wizard";

type QuickDiagnosisPageProps = {
  searchParams: Promise<{
    resume?: string | string[];
    category?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function detailedResumeCategory(
  resume: string | undefined,
  category: string | undefined,
): DetailedDiagnosisCategory | undefined {
  if (resume !== "detailed") return undefined;
  if (category === "product" || category === "production") return category;
  return undefined;
}

export default async function QuickDiagnosisPage({
  searchParams,
}: QuickDiagnosisPageProps) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const result = await getBillingOverview({ supabase, userId });

  if (result.status === "read_failed") {
    throw new Error("billing_overview_read_failed");
  }

  const initialDetailedCategory = result.overview.canCreateDetailedDiagnosis
    ? detailedResumeCategory(
        firstParam(params.resume),
        firstParam(params.category),
      )
    : undefined;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
      <h1 className="sr-only">Diagnóstico rápido</h1>
      {result.overview.canCreateQuickDiagnosis ? (
        <QuickDiagnosisWizard
          userId={userId}
          canCreateDetailedDiagnosis={
            result.overview.canCreateDetailedDiagnosis
          }
          {...(initialDetailedCategory ? { initialDetailedCategory } : {})}
          createServiceDiagnosis={createServiceDiagnosis}
          createProductDiagnosis={createProductDiagnosis}
          createProductionDiagnosis={createProductionDiagnosis}
          createDetailedDiagnosis={createDetailedDiagnosis}
        />
      ) : (
        <DiagnosisLimitCard />
      )}
    </main>
  );
}
